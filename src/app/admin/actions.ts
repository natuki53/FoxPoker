"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcListingEndsAt, getPlanPrice } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "SYSTEM_ADMIN") {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function approveApplication(formData: FormData) {
  const session = await requireAdmin();
  const id = formData.get("id") as string;
  if (!id) throw new Error("Application ID is required");

  const application = await prisma.storeApplication.findUnique({
    where: { id },
    include: { plan: true },
  });
  if (!application) throw new Error("Application not found");

  const price = getPlanPrice(application.plan, application.billingPeriod);

  await prisma.$transaction(async (tx) => {
    await tx.storeApplication.update({
      where: { id },
      data: {
        status: "APPROVED",
        reviewedBy: session.user.id,
        reviewedAt: new Date(),
      },
    });

    await tx.store.update({
      where: { id: application.storeId },
      data: { status: "AWAITING_PAYMENT" },
    });

    if (price === 0) {
      const existing = await tx.storeListing.findFirst({
        where: { applicationId: application.id },
      });
      if (!existing) {
        const startsAt = new Date();
        const endsAt = calcListingEndsAt(
          startsAt,
          application.billingPeriod
        );
        await tx.storeListing.create({
          data: {
            storeId: application.storeId,
            applicationId: application.id,
            planId: application.planId,
            billingPeriod: application.billingPeriod,
            startsAt,
            endsAt,
            status: "ACTIVE",
            stripeSessionId: null,
            stripePaymentIntentId: null,
            amountPaid: 0,
            taxAmount: 0,
            paidAt: new Date(),
          },
        });
      }
    }
  });

  revalidatePath("/admin");
  revalidatePath("/admin/applications");
  revalidatePath("/admin/stores");
  revalidatePath("/store-admin");
  revalidatePath(`/store/${application.storeId}`);
  revalidatePath("/");
  revalidatePath("/search");
  revalidatePath("/area");
  revalidatePath("/ranking");
}

export async function rejectApplication(formData: FormData) {
  const session = await requireAdmin();
  const id = formData.get("id") as string;
  const reason = formData.get("reason") as string;
  if (!id) throw new Error("Application ID is required");

  await prisma.storeApplication.update({
    where: { id },
    data: {
      status: "REJECTED",
      rejectionReason: reason || "審査基準を満たしていないため",
      reviewedBy: session.user.id,
      reviewedAt: new Date(),
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/applications");
}

export async function suspendStore(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  if (!id) throw new Error("Store ID is required");

  await prisma.store.update({
    where: { id },
    data: { status: "SUSPENDED" },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/stores");
}

export async function activateStore(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  if (!id) throw new Error("Store ID is required");

  await prisma.store.update({
    where: { id },
    data: { status: "APPROVED" },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/stores");
}

export async function approveStoreInfoEditRequest(formData: FormData) {
  const session = await requireAdmin();
  const requestId = formData.get("requestId") as string;
  if (!requestId) throw new Error("Request ID is required");

  const request = await prisma.storeInfoEditRequest.findFirst({
    where: { id: requestId, status: "PENDING" },
    select: {
      id: true,
      storeId: true,
      name: true,
      nameKana: true,
      postalCode: true,
      prefectureCode: true,
      city: true,
      address: true,
      phone: true,
    },
  });

  if (!request) {
    throw new Error("審査対象の変更申請が見つかりません。");
  }

  await prisma.$transaction([
    prisma.store.update({
      where: { id: request.storeId },
      data: {
        name: request.name,
        nameKana: request.nameKana,
        postalCode: request.postalCode,
        prefectureCode: request.prefectureCode,
        city: request.city,
        address: request.address,
        phone: request.phone,
      },
    }),
    prisma.storeInfoEditRequest.update({
      where: { id: request.id },
      data: {
        status: "APPROVED",
        reviewedBy: session.user.id,
        reviewedAt: new Date(),
        rejectionReason: null,
      },
    }),
  ]);

  revalidatePath("/admin");
  revalidatePath("/admin/stores");
  revalidatePath("/admin/store-info-edits");
  revalidatePath("/store-admin");
  revalidatePath(`/store-admin/stores/${request.storeId}`);
  revalidatePath(`/store-admin/stores/${request.storeId}/store-info`);
  revalidatePath(`/store/${request.storeId}`);
  revalidatePath("/");
  revalidatePath("/search");
  revalidatePath("/area");
}

export async function rejectStoreInfoEditRequest(formData: FormData) {
  const session = await requireAdmin();
  const requestId = formData.get("requestId") as string;
  const reason = (formData.get("reason") as string)?.trim();
  if (!requestId) throw new Error("Request ID is required");

  const request = await prisma.storeInfoEditRequest.findFirst({
    where: { id: requestId, status: "PENDING" },
    select: { id: true, storeId: true },
  });

  if (!request) {
    throw new Error("審査対象の変更申請が見つかりません。");
  }

  await prisma.storeInfoEditRequest.update({
    where: { id: request.id },
    data: {
      status: "REJECTED",
      reviewedBy: session.user.id,
      reviewedAt: new Date(),
      rejectionReason: reason || "変更内容を確認できなかったため却下しました。",
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/stores");
  revalidatePath("/admin/store-info-edits");
  revalidatePath("/store-admin");
  revalidatePath(`/store-admin/stores/${request.storeId}`);
  revalidatePath(`/store-admin/stores/${request.storeId}/store-info`);
}

export type MarkStorePaymentCompleteResult =
  | { ok: true }
  | { ok: false; error: string };

/** Stripe を通さず、承認済み・未払いの申請に対して掲載と支払い完了を記録する（開発・補助用）。公開はオーナー操作で行う。 */
export async function markStorePaymentCompleteAdmin(
  formData: FormData
): Promise<MarkStorePaymentCompleteResult> {
  const session = await auth();
  if (!session || session.user.role !== "SYSTEM_ADMIN") {
    return { ok: false, error: "権限がありません。" };
  }

  const storeId = formData.get("storeId") as string;
  const password = (formData.get("password") as string)?.trim() ?? "";
  if (!storeId) {
    return { ok: false, error: "店舗IDが不正です。" };
  }
  if (!password) {
    return { ok: false, error: "パスワードを入力してください。" };
  }

  const adminUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });
  if (!adminUser?.passwordHash) {
    return {
      ok: false,
      error:
        "ログイン中のアカウントにパスワードが設定されていません。メール／パスワードでログインした管理者のみ実行できます。",
    };
  }
  const passwordOk = await bcrypt.compare(password, adminUser.passwordHash);
  if (!passwordOk) {
    return { ok: false, error: "パスワードが正しくありません。" };
  }

  const application = await prisma.storeApplication.findFirst({
    where: {
      storeId,
      status: "APPROVED",
      listing: null,
    },
    orderBy: { createdAt: "desc" },
    include: { plan: true },
  });

  if (!application) {
    return { ok: false, error: "未払いの承認済み申請が見つかりません。" };
  }

  const existing = await prisma.storeListing.findFirst({
    where: { applicationId: application.id },
  });
  if (existing) {
    return { ok: false, error: "すでに掲載が登録されています。" };
  }

  const price = getPlanPrice(application.plan, application.billingPeriod);
  const taxAmount = Math.floor(price * 0.1);
  const startsAt = new Date();
  const endsAt = calcListingEndsAt(startsAt, application.billingPeriod);

  await prisma.$transaction([
    prisma.storeListing.create({
      data: {
        storeId,
        applicationId: application.id,
        planId: application.planId,
        billingPeriod: application.billingPeriod,
        startsAt,
        endsAt,
        status: "ACTIVE",
        stripeSessionId: null,
        stripePaymentIntentId: null,
        amountPaid: price,
        taxAmount,
        paidAt: new Date(),
      },
    }),
    prisma.store.update({
      where: { id: storeId },
      data: { status: "AWAITING_PAYMENT" },
    }),
  ]);

  revalidatePath("/admin");
  revalidatePath("/admin/stores");
  revalidatePath("/store-admin");
  revalidatePath(`/store/${storeId}`);
  revalidatePath("/");
  revalidatePath("/search");
  revalidatePath("/area");

  return { ok: true };
}

export async function suspendUser(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  if (!id) throw new Error("User ID is required");

  await prisma.user.update({
    where: { id },
    data: { status: "SUSPENDED" },
  });

  revalidatePath("/admin/users");
}

export async function activateUser(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  if (!id) throw new Error("User ID is required");

  await prisma.user.update({
    where: { id },
    data: { status: "ACTIVE" },
  });

  revalidatePath("/admin/users");
}
