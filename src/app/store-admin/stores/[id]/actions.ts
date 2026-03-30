"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { isAllowedPageContentImageUrl, publicPageBlocksSchema } from "@/lib/public-page-blocks";

const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;
const MAX_GALLERY_IMAGES = 50;
const DAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"] as const;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_EVENT_ROWS = 40;
const MAX_TOURNAMENT_TITLE_LENGTH = 120;
const MAX_TOURNAMENT_DESCRIPTION_LENGTH = 2000;

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
]);

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
  "image/gif": ".gif",
};

const updateStoreProfileSchema = z.object({
  storeId: z.string().min(1),
  description: z.string().trim().max(2000).optional(),
  websiteUrl: z.string().trim().max(500).optional(),
  twitterUrl: z.string().trim().max(500).optional(),
  instagramUrl: z.string().trim().max(500).optional(),
  emergencyCloseNote: z.string().trim().max(300).optional(),
});

function toNullableText(value?: string) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toNullableUrl(value?: string) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    throw new Error("URLは http:// または https:// で始めてください。");
  }
  return trimmed;
}

function asTrimmedString(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function parseBoundedInteger(raw: string, label: string, min: number, max: number) {
  const numeric = Number(raw);
  if (!Number.isInteger(numeric)) {
    throw new Error(`${label}は整数で入力してください。`);
  }
  if (numeric < min || numeric > max) {
    throw new Error(`${label}は${min}〜${max}の範囲で入力してください。`);
  }
  return numeric;
}

function errorRedirectPath(storeId: string, message: string, tab?: string) {
  const params = new URLSearchParams({ error: message });
  if (tab && tab.length > 0) {
    params.set("tab", tab);
  }
  return `/store-admin/stores/${storeId}?${params.toString()}`;
}

function successRedirectPath(storeId: string, key: string, tab?: string) {
  const params = new URLSearchParams({ saved: key });
  if (tab && tab.length > 0) {
    params.set("tab", tab);
  }
  return `/store-admin/stores/${storeId}?${params.toString()}`;
}

async function requireOwnedStore(storeId: string, userId: string) {
  const store = await prisma.store.findFirst({
    where: {
      id: storeId,
      ownerUserId: userId,
    },
    select: {
      id: true,
      status: true,
      photos: {
        select: {
          id: true,
          sortOrder: true,
        },
        orderBy: { sortOrder: "asc" },
      },
      galleryImages: {
        select: {
          id: true,
          sortOrder: true,
        },
        orderBy: { sortOrder: "asc" },
      },
      listings: {
        where: { status: "ACTIVE", endsAt: { gt: new Date() } },
        include: { plan: { select: { maxPhotos: true } } },
        orderBy: { endsAt: "desc" },
        take: 1,
      },
    },
  });

  if (!store) {
    throw new Error("対象店舗の編集権限がありません。");
  }
  if (store.status === "PENDING") {
    throw new Error("公開ページ情報は審査承認後に編集できます。");
  }

  return store;
}

async function persistUploadedFile(storeId: string, file: File) {
  const ext = EXT_BY_MIME[file.type] || path.extname(file.name).toLowerCase() || ".jpg";
  const safeStoreId = storeId.replace(/[^a-zA-Z0-9_-]/g, "");
  const uploadDir = path.join(process.cwd(), "public", "uploads", "stores", safeStoreId);
  await mkdir(uploadDir, { recursive: true });

  const fileName = `${Date.now()}-${randomUUID()}${ext}`;
  const absFilePath = path.join(uploadDir, fileName);
  const publicUrl = `/uploads/stores/${safeStoreId}/${fileName}`;

  const arrayBuffer = await file.arrayBuffer();
  await writeFile(absFilePath, Buffer.from(arrayBuffer));

  return { publicUrl };
}

async function unlinkStoreUploadIfLocal(url: string | null | undefined) {
  if (!url || !url.startsWith("/uploads/stores/")) return;
  const publicRoot = path.resolve(process.cwd(), "public");
  const absolutePath = path.resolve(publicRoot, url.replace(/^\//, ""));
  if (absolutePath.startsWith(publicRoot)) {
    await unlink(absolutePath).catch(() => undefined);
  }
}

function revalidateStorePages(storeId: string) {
  revalidatePath("/store-admin");
  revalidatePath(`/store-admin/stores/${storeId}`);
  revalidatePath(`/store/${storeId}`);
  revalidatePath("/tournament");
  revalidatePath("/");
  revalidatePath("/search");
  revalidatePath("/area");
  revalidatePath("/ranking");
}

function parseOptionalBoundedInteger(
  raw: string,
  label: string,
  min: number,
  max: number
) {
  if (!raw) return null;
  return parseBoundedInteger(raw, label, min, max);
}

export async function updatePublicStoreProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login?callbackUrl=/store-admin");
  const redirectTab = asTrimmedString(formData.get("tab"));

  const rawStoreId = formData.get("storeId");
  if (typeof rawStoreId !== "string" || rawStoreId.length === 0) {
    redirect("/store-admin");
  }

  const parsed = updateStoreProfileSchema.safeParse({
    storeId: rawStoreId,
    description: formData.get("description"),
    websiteUrl: formData.get("websiteUrl"),
    twitterUrl: formData.get("twitterUrl"),
    instagramUrl: formData.get("instagramUrl"),
    emergencyCloseNote: formData.get("emergencyCloseNote"),
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "入力内容を確認してください。";
    redirect(errorRedirectPath(rawStoreId, message, redirectTab));
  }

  const data = parsed.data;
  const isEmergencyClosed = formData.get("isEmergencyClosed") === "on";

  try {
    await requireOwnedStore(data.storeId, session.user.id);
    await prisma.store.update({
      where: { id: data.storeId },
      data: {
        description: toNullableText(data.description),
        websiteUrl: toNullableUrl(data.websiteUrl),
        twitterUrl: toNullableUrl(data.twitterUrl),
        instagramUrl: toNullableUrl(data.instagramUrl),
        isEmergencyClosed,
        emergencyCloseNote: isEmergencyClosed ? toNullableText(data.emergencyCloseNote) : null,
      },
    });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    if (error instanceof Error) {
      redirect(errorRedirectPath(data.storeId, error.message, redirectTab));
    }
    redirect(errorRedirectPath(data.storeId, "更新に失敗しました。", redirectTab));
  }

  revalidateStorePages(data.storeId);
  redirect(successRedirectPath(data.storeId, "profile", redirectTab));
}

export async function updateStoreHours(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login?callbackUrl=/store-admin");
  const redirectTab = asTrimmedString(formData.get("tab"));

  const rawStoreId = formData.get("storeId");
  if (typeof rawStoreId !== "string" || rawStoreId.length === 0) {
    redirect("/store-admin");
  }

  try {
    await requireOwnedStore(rawStoreId, session.user.id);

    const hourInputs = DAY_LABELS.map((dayLabel, dayOfWeek) => {
      const isClosed = formData.get(`hourIsClosed_${dayOfWeek}`) === "on";
      const isOvernight = false;
      const openTime = asTrimmedString(formData.get(`hourOpenTime_${dayOfWeek}`));
      const closeTime = asTrimmedString(formData.get(`hourCloseTime_${dayOfWeek}`));

      if (!isClosed) {
        if (!openTime || !closeTime) {
          throw new Error(
            `${dayLabel}曜日の営業時間は「定休日」または「開店/閉店時刻」を入力してください。`
          );
        }
        if (!TIME_PATTERN.test(openTime) || !TIME_PATTERN.test(closeTime)) {
          throw new Error(`${dayLabel}曜日の時刻形式が不正です。`);
        }
      }

      return {
        dayOfWeek,
        isClosed,
        openTime: isClosed ? null : openTime,
        closeTime: isClosed ? null : closeTime,
        isOvernight,
      };
    });

    await prisma.$transaction(
      hourInputs.map((hour) =>
        prisma.storeHour.upsert({
          where: {
            storeId_dayOfWeek: {
              storeId: rawStoreId,
              dayOfWeek: hour.dayOfWeek,
            },
          },
          create: {
            storeId: rawStoreId,
            dayOfWeek: hour.dayOfWeek,
            openTime: hour.openTime,
            closeTime: hour.closeTime,
            isClosed: hour.isClosed,
            isOvernight: hour.isOvernight,
          },
          update: {
            openTime: hour.openTime,
            closeTime: hour.closeTime,
            isClosed: hour.isClosed,
            isOvernight: hour.isOvernight,
          },
        })
      )
    );
  } catch (error) {
    if (isRedirectError(error)) throw error;
    if (error instanceof Error) {
      redirect(errorRedirectPath(rawStoreId, error.message, redirectTab));
    }
    redirect(errorRedirectPath(rawStoreId, "営業時間の更新に失敗しました。", redirectTab));
  }

  revalidateStorePages(rawStoreId);
  redirect(successRedirectPath(rawStoreId, "hours", redirectTab));
}

export async function updateStoreEvents(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login?callbackUrl=/store-admin");
  const redirectTab = asTrimmedString(formData.get("tab"));

  const rawStoreId = formData.get("storeId");
  if (typeof rawStoreId !== "string" || rawStoreId.length === 0) {
    redirect("/store-admin");
  }

  const uploadedEventImageUrls: string[] = [];

  try {
    await requireOwnedStore(rawStoreId, session.user.id);

    const eventRowCountRaw = asTrimmedString(formData.get("eventRowCount"));
    const eventRowCount = eventRowCountRaw
      ? parseBoundedInteger(eventRowCountRaw, "イベント行数", 0, MAX_EVENT_ROWS)
      : 0;

    const existingEvents = await prisma.storeEvent.findMany({
      where: { storeId: rawStoreId },
      select: { id: true, imageUrl: true },
    });
    const existingEventIds = new Set(existingEvents.map((event) => event.id));
    const existingEventById = new Map(
      existingEvents.map((event) => [event.id, event])
    );
    const eventUpserts: Array<{
      id: string | null;
      title: string;
      schedule: string | null;
      description: string | null;
      imageUrl: string | null;
      linkLabel: string | null;
      linkUrl: string | null;
      isActive: boolean;
      sortOrder: number;
    }> = [];
    const deleteEventIds = new Set<string>();

    const deletedEventIdList = formData
      .getAll("deletedEventIds")
      .map((value) => asTrimmedString(value))
      .filter((value) => value.length > 0);

    for (const eventId of deletedEventIdList) {
      if (!existingEventIds.has(eventId)) {
        throw new Error("削除対象のイベントが見つかりません。");
      }
      deleteEventIds.add(eventId);
    }

    for (let index = 0; index < eventRowCount; index += 1) {
      const rowLabel = `イベント行 ${index + 1}`;
      const eventIdRaw = asTrimmedString(formData.get(`eventId_${index}`));
      const title = asTrimmedString(formData.get(`eventTitle_${index}`));
      const schedule = asTrimmedString(formData.get(`eventSchedule_${index}`));
      const description = asTrimmedString(formData.get(`eventDescription_${index}`));
      const linkLabel = asTrimmedString(formData.get(`eventLinkLabel_${index}`));
      const linkUrlRaw = asTrimmedString(formData.get(`eventLinkUrl_${index}`));
      const imageFileRaw = formData.get(`eventImage_${index}`);
      const imageFile =
        imageFileRaw instanceof File && imageFileRaw.size > 0 ? imageFileRaw : null;
      const clearImage = formData.get(`eventImageClear_${index}`) === "on";
      const isActive = formData.get(`eventIsActive_${index}`) === "on";
      const hasImageUpload = imageFile !== null;

      const eventId = eventIdRaw.length > 0 ? eventIdRaw : null;
      if (eventId && !existingEventIds.has(eventId)) {
        throw new Error("対象店舗に紐づかないイベント情報が含まれています。");
      }

      if (eventId && deleteEventIds.has(eventId)) {
        continue;
      }

      const hasAnyInput =
        title.length > 0 ||
        schedule.length > 0 ||
        description.length > 0 ||
        linkLabel.length > 0 ||
        linkUrlRaw.length > 0 ||
        hasImageUpload ||
        clearImage;

      if (!title) {
        if (eventId) {
          deleteEventIds.add(eventId);
        } else if (hasAnyInput) {
          throw new Error(`${rowLabel}はイベント名を入力してください。`);
        }
        continue;
      }

      if (title.length > 120) {
        throw new Error(`${rowLabel}のイベント名は120文字以内で入力してください。`);
      }
      if (schedule.length > 120) {
        throw new Error(`${rowLabel}の日時ラベルは120文字以内で入力してください。`);
      }
      if (description.length > 1500) {
        throw new Error(`${rowLabel}の説明は1500文字以内で入力してください。`);
      }
      if (linkLabel.length > 40) {
        throw new Error(`${rowLabel}のリンクラベルは40文字以内で入力してください。`);
      }

      const linkUrl = linkUrlRaw.length > 0 ? toNullableUrl(linkUrlRaw) : null;
      const existingImageUrl = eventId
        ? existingEventById.get(eventId)?.imageUrl ?? null
        : null;
      let imageUrl = clearImage ? null : existingImageUrl;

      if (imageFile) {
        if (!ALLOWED_MIME_TYPES.has(imageFile.type)) {
          throw new Error(
            `${rowLabel}の画像形式は JPG / PNG / WEBP / AVIF / GIF のみ対応です。`
          );
        }
        if (imageFile.size > MAX_UPLOAD_SIZE) {
          throw new Error(`${rowLabel}の画像サイズは5MB以下にしてください。`);
        }
        const uploadResult = await persistUploadedFile(rawStoreId, imageFile);
        imageUrl = uploadResult.publicUrl;
        uploadedEventImageUrls.push(uploadResult.publicUrl);
      }

      eventUpserts.push({
        id: eventId,
        title,
        schedule: schedule.length > 0 ? schedule : null,
        description: description.length > 0 ? description : null,
        imageUrl,
        linkLabel: linkLabel.length > 0 ? linkLabel : null,
        linkUrl,
        isActive,
        sortOrder: eventUpserts.length,
      });
    }

    const urlsToDelete = new Set<string>();
    const deletableEventIds = Array.from(deleteEventIds).filter((eventId) =>
      existingEventIds.has(eventId)
    );
    for (const eventId of deletableEventIds) {
      const oldUrl = existingEventById.get(eventId)?.imageUrl ?? null;
      if (oldUrl) urlsToDelete.add(oldUrl);
    }
    for (const event of eventUpserts) {
      if (!event.id) continue;
      const oldUrl = existingEventById.get(event.id)?.imageUrl ?? null;
      if (oldUrl && oldUrl !== event.imageUrl) {
        urlsToDelete.add(oldUrl);
      }
    }

    await prisma.$transaction(async (tx) => {
      if (deletableEventIds.length > 0) {
        await tx.storeEvent.deleteMany({
          where: {
            storeId: rawStoreId,
            id: { in: deletableEventIds },
          },
        });
      }

      for (const event of eventUpserts) {
        if (event.id) {
          await tx.storeEvent.update({
            where: { id: event.id },
            data: {
              title: event.title,
              schedule: event.schedule,
              description: event.description,
              imageUrl: event.imageUrl,
              linkLabel: event.linkLabel,
              linkUrl: event.linkUrl,
              isActive: event.isActive,
              sortOrder: event.sortOrder,
            },
          });
        } else {
          await tx.storeEvent.create({
            data: {
              storeId: rawStoreId,
              title: event.title,
              schedule: event.schedule,
              description: event.description,
              imageUrl: event.imageUrl,
              linkLabel: event.linkLabel,
              linkUrl: event.linkUrl,
              isActive: event.isActive,
              sortOrder: event.sortOrder,
            },
          });
        }
      }
    });

    if (urlsToDelete.size > 0) {
      const candidateUrls = Array.from(urlsToDelete);
      const stillReferenced = await prisma.storeEvent.findMany({
        where: { imageUrl: { in: candidateUrls } },
        select: { imageUrl: true },
      });
      const referencedSet = new Set(
        stillReferenced
          .map((event) => event.imageUrl)
          .filter((url): url is string => typeof url === "string" && url.length > 0)
      );
      for (const url of candidateUrls) {
        if (!referencedSet.has(url)) {
          await unlinkStoreUploadIfLocal(url);
        }
      }
    }
  } catch (error) {
    for (const url of uploadedEventImageUrls) {
      await unlinkStoreUploadIfLocal(url);
    }
    if (isRedirectError(error)) throw error;
    if (error instanceof Error) {
      redirect(errorRedirectPath(rawStoreId, error.message, redirectTab));
    }
    redirect(errorRedirectPath(rawStoreId, "イベント情報の更新に失敗しました。", redirectTab));
  }

  revalidateStorePages(rawStoreId);
  redirect(successRedirectPath(rawStoreId, "events", redirectTab));
}

export async function createStoreTournament(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login?callbackUrl=/store-admin");
  const redirectTab = asTrimmedString(formData.get("tab"));

  const rawStoreId = formData.get("storeId");
  if (typeof rawStoreId !== "string" || rawStoreId.length === 0) {
    redirect("/store-admin");
  }

  let createdTournamentId: string | null = null;

  try {
    await requireOwnedStore(rawStoreId, session.user.id);

    const title = asTrimmedString(formData.get("title"));
    const gameTypeId = asTrimmedString(formData.get("gameTypeId"));
    const startsAtRaw = asTrimmedString(formData.get("startsAt"));
    const buyinAmountRaw = asTrimmedString(formData.get("buyinAmount"));
    const guaranteeAmountRaw = asTrimmedString(formData.get("guaranteeAmount"));
    const maxEntriesRaw = asTrimmedString(formData.get("maxEntries"));
    const descriptionRaw = asTrimmedString(formData.get("description"));
    const rebuyAllowed = formData.get("rebuyAllowed") === "on";
    const rebuyAmountRaw = asTrimmedString(formData.get("rebuyAmount"));
    const addonAllowed = formData.get("addonAllowed") === "on";
    const addonAmountRaw = asTrimmedString(formData.get("addonAmount"));
    const lateRegLevelRaw = asTrimmedString(formData.get("lateRegLevel"));
    const startingStackRaw = asTrimmedString(formData.get("startingStack"));
    const blindStructureUrlRaw = asTrimmedString(formData.get("blindStructureUrl"));

    if (!title) {
      throw new Error("トーナメント名を入力してください。");
    }
    if (title.length > MAX_TOURNAMENT_TITLE_LENGTH) {
      throw new Error(
        `トーナメント名は${MAX_TOURNAMENT_TITLE_LENGTH}文字以内で入力してください。`
      );
    }
    if (!gameTypeId) {
      throw new Error("ゲームタイプを選択してください。");
    }
    if (!startsAtRaw) {
      throw new Error("開催日時を入力してください。");
    }
    if (!buyinAmountRaw) {
      throw new Error("BI（参加費）を入力してください。");
    }
    if (descriptionRaw.length > MAX_TOURNAMENT_DESCRIPTION_LENGTH) {
      throw new Error(
        `説明は${MAX_TOURNAMENT_DESCRIPTION_LENGTH}文字以内で入力してください。`
      );
    }

    const startsAt = new Date(startsAtRaw);
    if (Number.isNaN(startsAt.getTime())) {
      throw new Error("開催日時の形式が正しくありません。");
    }

    const buyinAmount = parseBoundedInteger(
      buyinAmountRaw,
      "BI（参加費）",
      0,
      10_000_000
    );
    const guaranteeAmount = parseOptionalBoundedInteger(
      guaranteeAmountRaw,
      "保証額（GTD）",
      0,
      100_000_000
    );
    const maxEntries = parseOptionalBoundedInteger(
      maxEntriesRaw,
      "最大エントリー数",
      1,
      10_000
    );
    const rebuyAmount = rebuyAllowed
      ? parseOptionalBoundedInteger(
          rebuyAmountRaw,
          "リバイ金額",
          0,
          10_000_000
        )
      : null;
    const addonAmount = addonAllowed
      ? parseOptionalBoundedInteger(
          addonAmountRaw,
          "アドオン金額",
          0,
          10_000_000
        )
      : null;
    const lateRegLevel = parseOptionalBoundedInteger(
      lateRegLevelRaw,
      "レイトレジレベル",
      1,
      200
    );
    const startingStack = parseOptionalBoundedInteger(
      startingStackRaw,
      "開始スタック",
      1,
      10_000_000
    );
    const blindStructureUrl = blindStructureUrlRaw
      ? toNullableUrl(blindStructureUrlRaw)
      : null;

    const gameType = await prisma.gameType.findFirst({
      where: { id: gameTypeId, isActive: true },
      select: { id: true },
    });
    if (!gameType) {
      throw new Error("選択されたゲームタイプが見つかりません。");
    }

    const created = await prisma.tournament.create({
      data: {
        storeId: rawStoreId,
        gameTypeId,
        title,
        description: descriptionRaw.length > 0 ? descriptionRaw : null,
        startsAt,
        buyinAmount,
        guaranteeAmount,
        maxEntries,
        rebuyAllowed,
        rebuyAmount,
        addonAllowed,
        addonAmount,
        lateRegLevel,
        startingStack,
        blindStructureUrl,
        status: "SCHEDULED",
      },
      select: { id: true },
    });
    createdTournamentId = created.id;
  } catch (error) {
    if (isRedirectError(error)) throw error;
    if (error instanceof Error) {
      redirect(errorRedirectPath(rawStoreId, error.message, redirectTab));
    }
    redirect(errorRedirectPath(rawStoreId, "トーナメントの作成に失敗しました。", redirectTab));
  }

  revalidateStorePages(rawStoreId);
  if (createdTournamentId) {
    revalidatePath(`/tournament/${createdTournamentId}`);
  }
  redirect(successRedirectPath(rawStoreId, "tournament", redirectTab));
}

export async function deleteStoreTournaments(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login?callbackUrl=/store-admin");
  const redirectTab = asTrimmedString(formData.get("tab"));
  const rawStoreId = asTrimmedString(formData.get("storeId"));
  const rawIds = formData.getAll("deletedTournamentIds");
  const deletedIds = rawIds
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .map((s) => s.trim());

  if (!rawStoreId) {
    redirect("/store-admin");
  }

  if (deletedIds.length === 0) {
    redirect(errorRedirectPath(rawStoreId, "削除するトーナメントを選んでください。", redirectTab));
  }

  try {
    await requireOwnedStore(rawStoreId, session.user.id);

    const owned = await prisma.tournament.findMany({
      where: { storeId: rawStoreId, id: { in: deletedIds } },
      select: { id: true },
    });
    if (owned.length !== deletedIds.length) {
      throw new Error("対象のトーナメントが見つからないか、権限がありません。");
    }

    await prisma.tournament.deleteMany({
      where: { storeId: rawStoreId, id: { in: deletedIds } },
    });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    if (error instanceof Error) {
      redirect(errorRedirectPath(rawStoreId, error.message, redirectTab));
    }
    redirect(errorRedirectPath(rawStoreId, "トーナメントの削除に失敗しました。", redirectTab));
  }

  revalidateStorePages(rawStoreId);
  for (const id of deletedIds) {
    revalidatePath(`/tournament/${id}`);
  }
  redirect(successRedirectPath(rawStoreId, "tournaments_deleted", redirectTab));
}

export async function uploadStorePhoto(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login?callbackUrl=/store-admin");
  const redirectTab = asTrimmedString(formData.get("tab"));

  const rawStoreId = formData.get("storeId");
  if (typeof rawStoreId !== "string" || rawStoreId.length === 0) {
    redirect("/store-admin");
  }

  const file = formData.get("photo");
  const altTextRaw = formData.get("altText");

  if (!(file instanceof File) || file.size === 0) {
    redirect(errorRedirectPath(rawStoreId, "画像ファイルを選択してください。", redirectTab));
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    redirect(
      errorRedirectPath(
        rawStoreId,
        "画像形式は JPG / PNG / WEBP / AVIF / GIF のみ対応です。",
        redirectTab
      )
    );
  }

  if (file.size > MAX_UPLOAD_SIZE) {
    redirect(errorRedirectPath(rawStoreId, "画像サイズは5MB以下にしてください。", redirectTab));
  }

  const altText = typeof altTextRaw === "string" ? altTextRaw.trim() : "";
  if (altText.length > 120) {
    redirect(
      errorRedirectPath(rawStoreId, "代替テキストは120文字以内で入力してください。", redirectTab)
    );
  }

  try {
    await requireOwnedStore(rawStoreId, session.user.id);

    const existingPhotos = await prisma.storePhoto.findMany({
      where: { storeId: rawStoreId },
      select: { id: true, url: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    const { publicUrl } = await persistUploadedFile(rawStoreId, file);
    const oldUrls = existingPhotos.map((p) => p.url);

    await prisma.$transaction(async (tx) => {
      if (existingPhotos.length > 0) {
        await tx.storePhoto.deleteMany({ where: { storeId: rawStoreId } });
      }

      await tx.storePhoto.create({
        data: {
          storeId: rawStoreId,
          storageKey: publicUrl,
          url: publicUrl,
          altText: altText.length > 0 ? altText : null,
          sortOrder: 0,
          isMain: true,
        },
      });
    });

    for (const url of oldUrls) {
      await unlinkStoreUploadIfLocal(url);
    }
  } catch (error) {
    if (isRedirectError(error)) throw error;
    if (error instanceof Error) {
      redirect(errorRedirectPath(rawStoreId, error.message, redirectTab));
    }
    redirect(
      errorRedirectPath(rawStoreId, "サムネイル画像のアップロードに失敗しました。", redirectTab)
    );
  }

  revalidateStorePages(rawStoreId);
  redirect(successRedirectPath(rawStoreId, "photos", redirectTab));
}

export async function uploadStoreGalleryImage(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login?callbackUrl=/store-admin");
  const redirectTab = asTrimmedString(formData.get("tab"));

  const rawStoreId = formData.get("storeId");
  if (typeof rawStoreId !== "string" || rawStoreId.length === 0) {
    redirect("/store-admin");
  }

  const file = formData.get("photo");
  const altTextRaw = formData.get("altText");

  if (!(file instanceof File) || file.size === 0) {
    redirect(errorRedirectPath(rawStoreId, "画像ファイルを選択してください。", redirectTab));
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    redirect(
      errorRedirectPath(
        rawStoreId,
        "画像形式は JPG / PNG / WEBP / AVIF / GIF のみ対応です。",
        redirectTab
      )
    );
  }

  if (file.size > MAX_UPLOAD_SIZE) {
    redirect(errorRedirectPath(rawStoreId, "画像サイズは5MB以下にしてください。", redirectTab));
  }

  const altText = typeof altTextRaw === "string" ? altTextRaw.trim() : "";
  if (altText.length > 120) {
    redirect(
      errorRedirectPath(rawStoreId, "代替テキストは120文字以内で入力してください。", redirectTab)
    );
  }

  try {
    const store = await requireOwnedStore(rawStoreId, session.user.id);
    if (store.galleryImages.length >= MAX_GALLERY_IMAGES) {
      throw new Error(`ギャラリー画像は最大${MAX_GALLERY_IMAGES}枚まで登録できます。`);
    }

    const { publicUrl } = await persistUploadedFile(rawStoreId, file);
    const sortOrder =
      store.galleryImages.length > 0
        ? Math.max(...store.galleryImages.map((p) => p.sortOrder)) + 1
        : 0;

    await prisma.storeGalleryImage.create({
      data: {
        storeId: rawStoreId,
        storageKey: publicUrl,
        url: publicUrl,
        altText: altText.length > 0 ? altText : null,
        sortOrder,
      },
    });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    if (error instanceof Error) {
      redirect(errorRedirectPath(rawStoreId, error.message, redirectTab));
    }
    redirect(
      errorRedirectPath(rawStoreId, "ギャラリー画像のアップロードに失敗しました。", redirectTab)
    );
  }

  revalidateStorePages(rawStoreId);
  redirect(successRedirectPath(rawStoreId, "gallery", redirectTab));
}

export async function setMainStorePhoto(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login?callbackUrl=/store-admin");
  const redirectTab = asTrimmedString(formData.get("tab"));

  const storeId = formData.get("storeId");
  const photoId = formData.get("photoId");

  if (typeof storeId !== "string" || typeof photoId !== "string") {
    redirect("/store-admin");
  }

  try {
    await requireOwnedStore(storeId, session.user.id);
    const target = await prisma.storePhoto.findFirst({
      where: { id: photoId, storeId },
      select: { id: true },
    });
    if (!target) {
      throw new Error("対象の画像が見つかりません。");
    }

    await prisma.$transaction(async (tx) => {
      await tx.storePhoto.updateMany({
        where: { storeId },
        data: { isMain: false },
      });
      await tx.storePhoto.update({
        where: { id: photoId },
        data: { isMain: true },
      });
    });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    if (error instanceof Error) {
      redirect(errorRedirectPath(storeId, error.message, redirectTab));
    }
    redirect(errorRedirectPath(storeId, "メイン画像の更新に失敗しました。", redirectTab));
  }

  revalidateStorePages(storeId);
  redirect(successRedirectPath(storeId, "photos", redirectTab));
}

export async function moveStorePhoto(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login?callbackUrl=/store-admin");
  const redirectTab = asTrimmedString(formData.get("tab"));

  const storeId = formData.get("storeId");
  const photoId = formData.get("photoId");
  const direction = formData.get("direction");

  if (
    typeof storeId !== "string" ||
    typeof photoId !== "string" ||
    (direction !== "up" && direction !== "down")
  ) {
    redirect("/store-admin");
  }

  try {
    await requireOwnedStore(storeId, session.user.id);
    const photos = await prisma.storePhoto.findMany({
      where: { storeId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, sortOrder: true },
    });

    const currentIndex = photos.findIndex((photo) => photo.id === photoId);
    if (currentIndex < 0) {
      throw new Error("対象の画像が見つかりません。");
    }

    const swapIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (swapIndex < 0 || swapIndex >= photos.length) {
      redirect(successRedirectPath(storeId, "photos", redirectTab));
    }

    const current = photos[currentIndex];
    const target = photos[swapIndex];

    await prisma.$transaction([
      prisma.storePhoto.update({
        where: { id: current.id },
        data: { sortOrder: target.sortOrder },
      }),
      prisma.storePhoto.update({
        where: { id: target.id },
        data: { sortOrder: current.sortOrder },
      }),
    ]);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    if (error instanceof Error) {
      redirect(errorRedirectPath(storeId, error.message, redirectTab));
    }
    redirect(errorRedirectPath(storeId, "画像順序の更新に失敗しました。", redirectTab));
  }

  revalidateStorePages(storeId);
  redirect(successRedirectPath(storeId, "photos", redirectTab));
}

export async function moveStoreGalleryImage(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login?callbackUrl=/store-admin");
  const redirectTab = asTrimmedString(formData.get("tab"));

  const storeId = formData.get("storeId");
  const imageId = formData.get("imageId");
  const direction = formData.get("direction");

  if (
    typeof storeId !== "string" ||
    typeof imageId !== "string" ||
    (direction !== "up" && direction !== "down")
  ) {
    redirect("/store-admin");
  }

  try {
    await requireOwnedStore(storeId, session.user.id);
    const images = await prisma.storeGalleryImage.findMany({
      where: { storeId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, sortOrder: true },
    });

    const currentIndex = images.findIndex((image) => image.id === imageId);
    if (currentIndex < 0) {
      throw new Error("対象の画像が見つかりません。");
    }

    const swapIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (swapIndex < 0 || swapIndex >= images.length) {
      redirect(successRedirectPath(storeId, "gallery", redirectTab));
    }

    const current = images[currentIndex];
    const target = images[swapIndex];

    await prisma.$transaction([
      prisma.storeGalleryImage.update({
        where: { id: current.id },
        data: { sortOrder: target.sortOrder },
      }),
      prisma.storeGalleryImage.update({
        where: { id: target.id },
        data: { sortOrder: current.sortOrder },
      }),
    ]);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    if (error instanceof Error) {
      redirect(errorRedirectPath(storeId, error.message, redirectTab));
    }
    redirect(
      errorRedirectPath(storeId, "ギャラリー画像順序の更新に失敗しました。", redirectTab)
    );
  }

  revalidateStorePages(storeId);
  redirect(successRedirectPath(storeId, "gallery", redirectTab));
}

export async function deleteStorePhoto(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login?callbackUrl=/store-admin");
  const redirectTab = asTrimmedString(formData.get("tab"));

  const storeId = formData.get("storeId");
  const photoId = formData.get("photoId");
  if (typeof storeId !== "string" || typeof photoId !== "string") {
    redirect("/store-admin");
  }

  let deletedPhotoUrl: string | null = null;

  try {
    await requireOwnedStore(storeId, session.user.id);
    const target = await prisma.storePhoto.findFirst({
      where: { id: photoId, storeId },
      select: { id: true, url: true, isMain: true },
    });

    if (!target) {
      throw new Error("対象の画像が見つかりません。");
    }

    deletedPhotoUrl = target.url;

    await prisma.$transaction(async (tx) => {
      await tx.storePhoto.delete({ where: { id: photoId } });

      if (target.isMain) {
        const nextMain = await tx.storePhoto.findFirst({
          where: { storeId },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          select: { id: true },
        });
        if (nextMain) {
          await tx.storePhoto.update({
            where: { id: nextMain.id },
            data: { isMain: true },
          });
        }
      }
    });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    if (error instanceof Error) {
      redirect(errorRedirectPath(storeId, error.message, redirectTab));
    }
    redirect(errorRedirectPath(storeId, "画像の削除に失敗しました。", redirectTab));
  }

  await unlinkStoreUploadIfLocal(deletedPhotoUrl);

  revalidateStorePages(storeId);
  redirect(successRedirectPath(storeId, "photos", redirectTab));
}

export async function deleteStoreGalleryImage(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login?callbackUrl=/store-admin");
  const redirectTab = asTrimmedString(formData.get("tab"));

  const storeId = formData.get("storeId");
  const imageId = formData.get("imageId");
  if (typeof storeId !== "string" || typeof imageId !== "string") {
    redirect("/store-admin");
  }

  let deletedImageUrl: string | null = null;

  try {
    await requireOwnedStore(storeId, session.user.id);
    const target = await prisma.storeGalleryImage.findFirst({
      where: { id: imageId, storeId },
      select: { id: true, url: true },
    });
    if (!target) {
      throw new Error("対象のギャラリー画像が見つかりません。");
    }

    deletedImageUrl = target.url;
    await prisma.storeGalleryImage.delete({ where: { id: imageId } });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    if (error instanceof Error) {
      redirect(errorRedirectPath(storeId, error.message, redirectTab));
    }
    redirect(errorRedirectPath(storeId, "ギャラリー画像の削除に失敗しました。", redirectTab));
  }

  if (deletedImageUrl?.startsWith("/uploads/stores/")) {
    const publicRoot = path.resolve(process.cwd(), "public");
    const absolutePath = path.resolve(publicRoot, deletedImageUrl.replace(/^\//, ""));
    if (absolutePath.startsWith(publicRoot)) {
      await unlink(absolutePath).catch(() => undefined);
    }
  }

  revalidateStorePages(storeId);
  redirect(successRedirectPath(storeId, "gallery", redirectTab));
}

export type UploadPageContentImageResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

export async function uploadStorePageContentImage(
  formData: FormData
): Promise<UploadPageContentImageResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "ログインが必要です。" };
  }

  const rawStoreId = formData.get("storeId");
  if (typeof rawStoreId !== "string" || rawStoreId.length === 0) {
    return { ok: false, error: "店舗IDが不正です。" };
  }

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "画像ファイルを選択してください。" };
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return { ok: false, error: "画像形式は JPG / PNG / WEBP / AVIF / GIF のみ対応です。" };
  }

  if (file.size > MAX_UPLOAD_SIZE) {
    return { ok: false, error: "画像サイズは5MB以下にしてください。" };
  }

  try {
    await requireOwnedStore(rawStoreId, session.user.id);
    const { publicUrl } = await persistUploadedFile(rawStoreId, file);
    return { ok: true, url: publicUrl };
  } catch (error) {
    const message = error instanceof Error ? error.message : "アップロードに失敗しました。";
    return { ok: false, error: message };
  }
}

function sanitizePublicPageBlocks(
  storeId: string,
  blocks: z.infer<typeof publicPageBlocksSchema>
) {
  return blocks.map((block) => {
    if (block.type === "heading") {
      return { ...block, level: 2 } as const;
    }
    if (block.type === "image") {
      if (!isAllowedPageContentImageUrl(storeId, block.url)) {
        throw new Error(
          "お知らせの画像URLに不正な値が含まれています。画像はアップロードしたもののみ使えます。"
        );
      }
    }
    return block;
  });
}

export async function updateStorePublicPageContent(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login?callbackUrl=/store-admin");
  const redirectTab = asTrimmedString(formData.get("tab"));

  const rawStoreId = formData.get("storeId");
  const rawJson = formData.get("blocksJson");
  if (typeof rawStoreId !== "string" || rawStoreId.length === 0) {
    redirect("/store-admin");
  }
  if (typeof rawJson !== "string") {
    redirect(
      errorRedirectPath(rawStoreId, "コンテンツデータが送信されませんでした。", redirectTab)
    );
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawJson) as unknown;
  } catch {
    redirect(errorRedirectPath(rawStoreId, "JSONの形式が正しくありません。", redirectTab));
  }

  const parsed = publicPageBlocksSchema.safeParse(parsedJson);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "ブロックの内容を確認してください。";
    redirect(errorRedirectPath(rawStoreId, message, redirectTab));
  }

  try {
    await requireOwnedStore(rawStoreId, session.user.id);
    const sanitized = sanitizePublicPageBlocks(rawStoreId, parsed.data);
    await prisma.store.update({
      where: { id: rawStoreId },
      data: { publicPageBlocks: sanitized },
    });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    if (error instanceof Error) {
      redirect(errorRedirectPath(rawStoreId, error.message, redirectTab));
    }
    redirect(errorRedirectPath(rawStoreId, "お知らせの保存に失敗しました。", redirectTab));
  }

  revalidateStorePages(rawStoreId);
  redirect(successRedirectPath(rawStoreId, "pagecontent", redirectTab));
}
