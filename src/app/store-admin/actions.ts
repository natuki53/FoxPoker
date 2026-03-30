"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import bcrypt from "bcryptjs";
import path from "node:path";
import { unlink } from "node:fs/promises";

function errorDashboardPath(message: string) {
  return `/store-admin?error=${encodeURIComponent(message)}`;
}

async function unlinkStoreUploadIfLocal(url: string | null | undefined) {
  if (!url || !url.startsWith("/uploads/")) return;
  const publicRoot = path.resolve(process.cwd(), "public");
  const absolutePath = path.resolve(publicRoot, url.replace(/^\//, ""));
  if (absolutePath.startsWith(publicRoot)) {
    await unlink(absolutePath).catch(() => undefined);
  }
}

function asTrimmedString(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return "";
  return value.trim();
}

export async function publishStore(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const storeId = formData.get("storeId");
  if (typeof storeId !== "string" || storeId.length === 0) {
    throw new Error("Store ID is required");
  }

  const store = await prisma.store.findFirst({
    where: {
      id: storeId,
      ownerUserId: session.user.id,
      status: "AWAITING_PAYMENT",
    },
    select: {
      id: true,
      listings: {
        where: {
          status: "ACTIVE",
          endsAt: { gt: new Date() },
          paidAt: { not: null },
        },
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!store || store.listings.length === 0) {
    return;
  }

  await prisma.store.update({
    where: { id: store.id },
    data: { status: "APPROVED" },
  });

  revalidatePath("/store-admin");
  revalidatePath("/");
  revalidatePath("/search");
  revalidatePath("/ranking");
  revalidatePath("/tournament");
  revalidatePath("/area");
  revalidatePath(`/store/${store.id}`);
}

export async function unpublishStore(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const storeId = formData.get("storeId");
  if (typeof storeId !== "string" || storeId.length === 0) {
    throw new Error("Store ID is required");
  }

  const store = await prisma.store.findFirst({
    where: {
      id: storeId,
      ownerUserId: session.user.id,
      status: "APPROVED",
    },
    select: { id: true },
  });

  if (!store) {
    return;
  }

  await prisma.store.update({
    where: { id: store.id },
    data: { status: "AWAITING_PAYMENT" },
  });

  revalidatePath("/store-admin");
  revalidatePath("/");
  revalidatePath("/search");
  revalidatePath("/ranking");
  revalidatePath("/tournament");
  revalidatePath("/area");
  revalidatePath(`/store/${store.id}`);
}

export async function deleteOwnedStore(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login?callbackUrl=/store-admin");
  }

  const rawStoreId = asTrimmedString(formData.get("storeId"));
  if (!rawStoreId) {
    redirect(errorDashboardPath("店舗IDが不正です。"));
  }

  const passwordRaw = formData.get("password");
  const password = typeof passwordRaw === "string" ? passwordRaw : "";
  const confirmStoreName = asTrimmedString(formData.get("confirmStoreName"));

  let uploadUrls: string[] = [];

  try {
    const store = await prisma.store.findFirst({
      where: {
        id: rawStoreId,
        ownerUserId: session.user.id,
        status: "APPROVED",
      },
      select: {
        id: true,
        name: true,
        photos: { select: { url: true } },
        galleryImages: { select: { url: true } },
        events: { select: { imageUrl: true } },
        applications: {
          select: { identityDocUrl: true, storeDocUrl: true },
        },
      },
    });

    if (!store) {
      throw new Error("店舗が見つからないか、公開中の店舗のみ削除できます。");
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { passwordHash: true },
    });

    if (user?.passwordHash) {
      if (!password) {
        redirect(errorDashboardPath("パスワードを入力してください。"));
      }
      const passwordOk = await bcrypt.compare(password, user.passwordHash);
      if (!passwordOk) {
        throw new Error("パスワードが正しくありません。");
      }
    } else {
      if (!confirmStoreName) {
        redirect(errorDashboardPath("店舗名を入力して削除を確認してください。"));
      }
      if (confirmStoreName !== store.name.trim()) {
        throw new Error("入力した店舗名が一致しません。");
      }
    }

    uploadUrls = [
      ...store.photos.map((p) => p.url),
      ...store.galleryImages.map((g) => g.url),
      ...store.events
        .map((e) => e.imageUrl)
        .filter((u): u is string => typeof u === "string" && u.length > 0),
      ...store.applications.flatMap((a) =>
        [a.identityDocUrl, a.storeDocUrl].filter(
          (u): u is string => typeof u === "string" && u.length > 0
        )
      ),
    ];

    await prisma.$transaction(async (tx) => {
      const listings = await tx.storeListing.findMany({
        where: { storeId: store.id },
        select: { id: true },
      });
      const listingIds = listings.map((l) => l.id);
      if (listingIds.length > 0) {
        await tx.invoice.deleteMany({ where: { listingId: { in: listingIds } } });
      }
      await tx.invoice.deleteMany({ where: { storeId: store.id } });
      await tx.storeListing.deleteMany({ where: { storeId: store.id } });
      await tx.storeApplication.deleteMany({ where: { storeId: store.id } });
      await tx.store.delete({ where: { id: store.id } });
    });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    if (error instanceof Error) {
      redirect(errorDashboardPath(error.message));
    }
    redirect(errorDashboardPath("店舗の削除に失敗しました。"));
  }

  revalidatePath("/store-admin");
  revalidatePath("/");
  revalidatePath("/search");
  revalidatePath("/ranking");
  revalidatePath("/tournament");
  revalidatePath("/area");
  revalidatePath(`/store/${rawStoreId}`);
  revalidatePath(`/store-admin/stores/${rawStoreId}`);

  for (const url of uploadUrls) {
    await unlinkStoreUploadIfLocal(url);
  }

  redirect("/store-admin?saved=store_deleted");
}
