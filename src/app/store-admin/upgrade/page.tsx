import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ensureListingPlans } from "@/lib/listing-plans";
import { prisma } from "@/lib/prisma";
import { UpgradeForm } from "./upgrade-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "有料プラン申請" };

export default async function UpgradePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login?callbackUrl=/store-admin/upgrade");

  await ensureListingPlans();

  const [stores, paidPlans] = await Promise.all([
    prisma.store.findMany({
      where: {
        ownerUserId: session.user.id,
        status: { in: ["APPROVED", "AWAITING_PAYMENT"] },
      },
      select: { id: true, name: true, status: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.listingPlan.findMany({
      where: { isActive: true, price1month: { gt: 0 } },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-2">有料プラン申請</h1>
      <p className="text-sm text-slate-500 mb-8">
        こちらは宣伝用の有料プラン申請フォームです。掲載審査（無料掲載）は完了済みの店舗に対して、検索やイベント枠などの露出強化オプションを追加できます。
      </p>

      <UpgradeForm
        stores={stores}
        plans={paidPlans.map((p) => ({
          id: p.id,
          name: p.name,
          rank: p.rank,
          price1month: p.price1month,
          price3months: p.price3months,
          price6months: p.price6months,
          price12months: p.price12months,
          description: p.description,
        }))}
      />
    </div>
  );
}
