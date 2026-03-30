import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ensureListingPlans } from "@/lib/listing-plans";
import { ensureMasterPrefectures } from "@/lib/prefectures";
import { ApplyWizard } from "./apply-wizard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "掲載申請" };

export default async function ApplyPage() {
  const session = await auth();
  if (!session) redirect("/auth/login?callbackUrl=/store-admin/apply");

  await ensureMasterPrefectures();
  await ensureListingPlans();
  const prefectures = await prisma.prefecture.findMany({
    orderBy: { code: "asc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-2">掲載申請</h1>
      <p className="text-sm text-slate-500 mb-8">
        この画面は掲載審査の申請用で、実在確認に必要な基本情報のみを登録します。承認後は無料で掲載を開始でき、管理画面から公開ページ情報を自由に編集できます。宣伝用の有料プランは承認後に別画面から申請できます。
      </p>
      <ApplyWizard
        prefectures={prefectures.map((p) => ({
          code: p.code,
          name: p.name,
        }))}
      />
    </div>
  );
}
