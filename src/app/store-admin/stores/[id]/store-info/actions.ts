"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { z } from "zod";

const updateStoreInfoSchema = z.object({
  storeId: z.string().min(1),
  name: z.string().trim().min(1, "店舗名は必須です").max(120, "店舗名は120文字以内で入力してください。"),
  nameKana: z.string().trim().max(120, "店舗名（カナ）は120文字以内で入力してください。").optional(),
  prefectureCode: z.string().min(1, "都道府県を選択してください"),
  city: z.string().trim().min(1, "市区町村は必須です").max(120, "市区町村は120文字以内で入力してください。"),
  address: z.string().trim().min(1, "住所は必須です").max(300, "住所は300文字以内で入力してください。"),
  postalCode: z.string().trim().min(1, "郵便番号は必須です").max(20, "郵便番号は20文字以内で入力してください。"),
  phone: z.string().trim().max(30, "電話番号は30文字以内で入力してください。").optional(),
});

function toNullableText(value?: string) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function errorRedirectPath(storeId: string, message: string) {
  return `/store-admin/stores/${storeId}/store-info?error=${encodeURIComponent(
    message
  )}`;
}

function successRedirectPath(storeId: string) {
  return `/store-admin/stores/${storeId}/store-info?saved=1`;
}

function asString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value : undefined;
}

export async function requestStoreInfoEdit(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login?callbackUrl=/store-admin");
  }

  const rawStoreId = asString(formData.get("storeId"));
  if (!rawStoreId) {
    redirect("/store-admin");
  }

  const parsed = updateStoreInfoSchema.safeParse({
    storeId: rawStoreId,
    name: asString(formData.get("name")),
    nameKana: asString(formData.get("nameKana")),
    prefectureCode: asString(formData.get("prefectureCode")),
    city: asString(formData.get("city")),
    address: asString(formData.get("address")),
    postalCode: asString(formData.get("postalCode")),
    phone: asString(formData.get("phone")),
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "入力内容を確認してください。";
    redirect(errorRedirectPath(rawStoreId, message));
  }

  const data = parsed.data;

  try {
    const store = await prisma.store.findFirst({
      where: {
        id: data.storeId,
        ownerUserId: session.user.id,
      },
      select: {
        id: true,
        name: true,
        nameKana: true,
        prefectureCode: true,
        city: true,
        address: true,
        postalCode: true,
        phone: true,
      },
    });

    if (!store) {
      throw new Error("対象店舗の編集権限がありません。");
    }

    const pending = await prisma.storeInfoEditRequest.findFirst({
      where: {
        storeId: data.storeId,
        status: "PENDING",
      },
      select: { id: true },
    });

    if (pending) {
      throw new Error("すでに審査中の変更申請があります。審査完了後に再申請してください。");
    }

    const nextNameKana = toNullableText(data.nameKana);
    const nextPhone = toNullableText(data.phone);

    const hasChanges =
      store.name !== data.name ||
      store.nameKana !== nextNameKana ||
      store.prefectureCode !== data.prefectureCode ||
      store.city !== data.city ||
      store.address !== data.address ||
      store.postalCode !== data.postalCode ||
      store.phone !== nextPhone;

    if (!hasChanges) {
      throw new Error("変更点がありません。内容を確認してください。");
    }

    await prisma.storeInfoEditRequest.create({
      data: {
        storeId: data.storeId,
        requestedByUserId: session.user.id,
        name: data.name,
        nameKana: nextNameKana,
        prefectureCode: data.prefectureCode,
        city: data.city,
        address: data.address,
        postalCode: data.postalCode,
        phone: nextPhone,
      },
    });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    if (error instanceof Error) {
      redirect(errorRedirectPath(data.storeId, error.message));
    }
    redirect(errorRedirectPath(data.storeId, "変更申請の送信に失敗しました。"));
  }

  revalidatePath("/store-admin");
  revalidatePath(`/store-admin/stores/${data.storeId}`);
  revalidatePath(`/store-admin/stores/${data.storeId}/store-info`);
  revalidatePath("/admin");
  revalidatePath("/admin/store-info-edits");

  redirect(successRedirectPath(data.storeId));
}