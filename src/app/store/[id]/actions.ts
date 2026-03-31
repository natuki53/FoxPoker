"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

// ==============================
// お気に入り
// ==============================

export async function toggleFavorite(
  storeId: string
): Promise<{ isFavorited: boolean }> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/auth/login?callbackUrl=/store/${storeId}`);
  }

  const userId = session.user.id;

  const existing = await prisma.favoriteStore.findUnique({
    where: { userId_storeId: { userId, storeId } },
  });

  if (existing) {
    await prisma.favoriteStore.delete({
      where: { userId_storeId: { userId, storeId } },
    });
    revalidatePath(`/store/${storeId}`);
    revalidatePath("/mypage/favorites");
    revalidatePath("/mypage");
    return { isFavorited: false };
  } else {
    await prisma.favoriteStore.create({
      data: { userId, storeId },
    });
    revalidatePath(`/store/${storeId}`);
    revalidatePath("/mypage/favorites");
    revalidatePath("/mypage");
    return { isFavorited: true };
  }
}

// ==============================
// 口コミ投稿
// ==============================

const reviewSchema = z.object({
  storeId: z.string().min(1),
  scoreOverall: z.coerce.number().min(1).max(5),
  scoreAtmosphere: z.coerce.number().int().min(1).max(5),
  scoreStaff: z.coerce.number().int().min(1).max(5),
  scoreValue: z.coerce.number().int().min(1).max(5),
  scoreFacility: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(2000),
  visitDate: z.string().optional(),
});

export type ReviewFormState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; message: string };

export async function submitReview(
  _prevState: ReviewFormState,
  formData: FormData
): Promise<ReviewFormState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: "error", message: "ログインが必要です。" };
  }

  const parsed = reviewSchema.safeParse({
    storeId: formData.get("storeId"),
    scoreOverall: formData.get("scoreOverall"),
    scoreAtmosphere: formData.get("scoreAtmosphere"),
    scoreStaff: formData.get("scoreStaff"),
    scoreValue: formData.get("scoreValue"),
    scoreFacility: formData.get("scoreFacility"),
    comment: formData.get("comment"),
    visitDate: formData.get("visitDate") || undefined,
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "入力内容を確認してください。";
    return { status: "error", message };
  }

  const { storeId, scoreOverall, scoreAtmosphere, scoreStaff, scoreValue, scoreFacility, comment, visitDate } =
    parsed.data;
  const userId = session.user.id;

  const store = await prisma.store.findUnique({
    where: { id: storeId, status: "APPROVED" },
    select: { id: true },
  });
  if (!store) {
    return { status: "error", message: "店舗が見つかりません。" };
  }

  const existing = await prisma.review.findUnique({
    where: { storeId_userId: { storeId, userId } },
  });
  if (existing) {
    return { status: "error", message: "この店舗にはすでに口コミを投稿済みです。" };
  }

  try {
    await prisma.review.create({
      data: {
        storeId,
        userId,
        scoreOverall,
        scoreAtmosphere,
        scoreStaff,
        scoreValue,
        scoreFacility,
        comment,
        visitDate: visitDate ? new Date(visitDate) : null,
        status: "ACTIVE",
      },
    });
  } catch {
    return { status: "error", message: "口コミの投稿に失敗しました。しばらくしてから再度お試しください。" };
  }

  revalidatePath(`/store/${storeId}`);
  return { status: "success" };
}
