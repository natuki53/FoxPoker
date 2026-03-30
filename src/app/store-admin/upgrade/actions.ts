"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { z } from "zod";

const upgradeSchema = z.object({
  storeId: z.string().min(1, "店舗を選択してください"),
  planId: z.string().min(1, "有料プランを選択してください"),
  billingPeriod: z.enum([
    "ONE_MONTH",
    "THREE_MONTHS",
    "SIX_MONTHS",
    "TWELVE_MONTHS",
  ]),
});

export async function submitUpgradeApplication(
  formData: FormData
): Promise<{ error: string } | undefined> {
  const session = await auth();
  if (!session?.user?.id) return { error: "ログインが必要です。" };

  const raw = Object.fromEntries(formData.entries());
  const parsed = upgradeSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message;
    return { error: firstError || "入力内容に不備があります。" };
  }

  const data = parsed.data;

  const store = await prisma.store.findFirst({
    where: {
      id: data.storeId,
      ownerUserId: session.user.id,
      status: { in: ["APPROVED", "AWAITING_PAYMENT"] },
    },
    select: { id: true },
  });
  if (!store) {
    return { error: "対象の店舗が見つからないか、まだ審査が完了していません。" };
  }

  const plan = await prisma.listingPlan.findFirst({
    where: {
      id: data.planId,
      isActive: true,
      price1month: { gt: 0 },
    },
    select: { id: true },
  });
  if (!plan) {
    return { error: "選択された有料プランが見つかりません。" };
  }

  const existing = await prisma.storeApplication.findFirst({
    where: {
      storeId: store.id,
      status: { in: ["SUBMITTED", "REVIEWING", "APPROVED"] },
      listing: null,
      plan: { price1month: { gt: 0 } },
    },
    select: { id: true },
  });

  if (existing) {
    return {
      error:
        "この店舗には未完了の有料プラン申請があります。審査または決済の完了をお待ちください。",
    };
  }

  try {
    await prisma.storeApplication.create({
      data: {
        storeId: store.id,
        applicantUserId: session.user.id,
        planId: plan.id,
        billingPeriod: data.billingPeriod,
        status: "SUBMITTED",
      },
    });
  } catch {
    return { error: "申請の送信中にエラーが発生しました。" };
  }

  redirect("/store-admin?upgrade=submitted");
}
