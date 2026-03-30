import { prisma } from "@/lib/prisma";
import { MASTER_LISTING_PLANS } from "@/lib/master-listing-plans-data";

/** listing_plans が空のとき、初回アクセスでマスタを投入する（seed 未実行環境向け） */
export async function ensureListingPlans(): Promise<void> {
  const n = await prisma.listingPlan.count();
  if (n > 0) return;
  for (const plan of MASTER_LISTING_PLANS) {
    await prisma.listingPlan.create({ data: { ...plan } });
  }
}
