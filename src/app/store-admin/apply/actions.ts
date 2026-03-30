"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { z } from "zod";

const applySchema = z.object({
  name: z.string().min(1, "店舗名は必須です"),
  nameKana: z.string().optional(),
  prefectureCode: z.string().min(1, "都道府県を選択してください"),
  city: z.string().min(1, "市区町村は必須です"),
  address: z.string().min(1, "住所は必須です"),
  postalCode: z.string().min(1, "郵便番号は必須です"),
  phone: z.string().optional(),
});

export async function submitApplication(
  formData: FormData
): Promise<{ error: string } | undefined> {
  const session = await auth();
  if (!session?.user?.id) return { error: "ログインが必要です。" };

  const raw = Object.fromEntries(formData.entries());
  const parsed = applySchema.safeParse(raw);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message;
    return { error: firstError || "入力内容に不備があります。" };
  }

  const data = parsed.data;

  const freePlan = await prisma.listingPlan.findFirst({
    where: {
      isActive: true,
      OR: [
        { name: "FREE" },
        {
          rank: 0,
          price1month: 0,
          price3months: 0,
          price6months: 0,
          price12months: 0,
        },
      ],
    },
    orderBy: { sortOrder: "asc" },
  });
  if (!freePlan) return { error: "無料掲載プランが見つかりません。" };

  let storeCreated = false;
  try {
    const store = await prisma.store.create({
      data: {
        ownerUserId: session.user.id,
        name: data.name,
        nameKana: data.nameKana || null,
        prefectureCode: data.prefectureCode,
        city: data.city,
        address: data.address,
        postalCode: data.postalCode,
        phone: data.phone || null,
        status: "PENDING",
      },
    });

    await prisma.storeApplication.create({
      data: {
        storeId: store.id,
        applicantUserId: session.user.id,
        planId: freePlan.id,
        billingPeriod: "ONE_MONTH",
        status: "SUBMITTED",
      },
    });

    if (
      session.user.role !== "STORE_ADMIN" &&
      session.user.role !== "SYSTEM_ADMIN"
    ) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { role: "STORE_ADMIN" },
      });
    }

    storeCreated = true;
  } catch {
    return { error: "申請の送信中にエラーが発生しました。" };
  }

  if (storeCreated) redirect("/store-admin");
}
