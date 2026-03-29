"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

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
