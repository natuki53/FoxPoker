import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ApplyWizard } from "./apply-wizard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "掲載申請" };

export default async function ApplyPage() {
  const session = await auth();
  if (!session) redirect("/auth/login?callbackUrl=/store-admin/apply");

  const [prefectures, plans] = await Promise.all([
    prisma.prefecture.findMany({ orderBy: { code: "asc" } }),
    prisma.listingPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-2">掲載申請</h1>
      <p className="text-sm text-slate-500 mb-8">
        この画面は掲載審査の申請用で、実在確認に必要な基本情報のみを登録します。承認後は管理画面から公開ページ情報を自由に編集できます。店舗ページの掲載は無料から始められ、有料プランは検索・イベント枠など露出強化用のオプションです。
      </p>
      <ApplyWizard
        prefectures={prefectures.map((p) => ({
          code: p.code,
          name: p.name,
        }))}
        plans={plans.map((p) => ({
          id: p.id,
          name: p.name,
          rank: p.rank,
          price1month: p.price1month,
          price3months: p.price3months,
          price6months: p.price6months,
          price12months: p.price12months,
          description: p.description,
          maxPhotos: p.maxPhotos,
        }))}
      />
    </div>
  );
}
