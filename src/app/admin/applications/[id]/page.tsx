import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatDateTime,
  formatPrice,
  getBillingPeriodLabel,
  getPlanPrice,
} from "@/lib/utils";
import { approveApplication, rejectApplication } from "../../actions";

export const dynamic = "force-dynamic";

const STATUS_MAP: Record<
  string,
  { label: string; variant: "success" | "warning" | "danger" | "default" }
> = {
  SUBMITTED: { label: "未審査", variant: "warning" },
  REVIEWING: { label: "審査中", variant: "warning" },
  APPROVED: { label: "承認済み", variant: "success" },
  REJECTED: { label: "却下", variant: "danger" },
  CANCELLED: { label: "キャンセル", variant: "default" },
};

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const app = await prisma.storeApplication.findUnique({
    where: { id },
    include: {
      store: {
        include: {
          prefecture: true,
          owner: { select: { displayName: true, email: true } },
        },
      },
      applicant: { select: { displayName: true, email: true } },
      plan: true,
      reviewer: { select: { displayName: true, email: true } },
    },
  });

  if (!app) {
    notFound();
  }

  const st = STATUS_MAP[app.status] || STATUS_MAP.SUBMITTED;
  const isPending = app.status === "SUBMITTED" || app.status === "REVIEWING";
  const price = getPlanPrice(app.plan, app.billingPeriod);
  const applicationTypeLabel = price === 0 ? "掲載審査" : "有料プラン";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">
            <Link href="/admin/applications" className="hover:text-slate-700">
              申請管理
            </Link>{" "}
            / 申請詳細
          </p>
          <h1 className="text-2xl font-bold text-slate-800 mt-1">
            {app.store.name}
          </h1>
        </div>
        <Badge variant={st.variant}>{st.label}</Badge>
      </div>

      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-base font-semibold text-slate-800 mb-3">
          申請情報
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-slate-500 text-xs">申請者</p>
            <p className="text-slate-800">{app.applicant.displayName}</p>
            <p className="text-xs text-slate-400">{app.applicant.email}</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">申請種別</p>
            <p className="text-slate-800">{applicationTypeLabel}</p>
            <p className="text-xs text-slate-400">{app.plan.name}</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">契約期間・金額</p>
            <p className="text-slate-800">
              {getBillingPeriodLabel(app.billingPeriod, price)}
            </p>
            <p className="text-xs text-slate-400">{formatPrice(price)}（税抜）</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">申請日時</p>
            <p className="text-slate-800">{formatDateTime(app.submittedAt)}</p>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-base font-semibold text-slate-800 mb-3">
          店舗基本情報
        </h2>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-500 text-xs">店舗名</p>
            <p className="text-slate-800">{app.store.name}</p>
            {app.store.nameKana && (
              <p className="text-xs text-slate-400 mt-0.5">{app.store.nameKana}</p>
            )}
          </div>
          <div>
            <p className="text-slate-500 text-xs">オーナー</p>
            <p className="text-slate-800">{app.store.owner.displayName}</p>
            <p className="text-xs text-slate-400">{app.store.owner.email}</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">住所</p>
            <p className="text-slate-800">
              〒{app.store.postalCode} {app.store.prefecture.name}
              {app.store.city}
              {app.store.address}
            </p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">電話番号</p>
            <p className="text-slate-800">{app.store.phone || "未設定"}</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">Webサイト</p>
            {app.store.websiteUrl ? (
              <a
                href={app.store.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-600 hover:text-orange-700 break-all"
              >
                {app.store.websiteUrl}
              </a>
            ) : (
              <p className="text-slate-800">未設定</p>
            )}
          </div>
          <div>
            <p className="text-slate-500 text-xs">SNS</p>
            <div className="space-y-1">
              {app.store.twitterUrl ? (
                <a
                  href={app.store.twitterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-orange-600 hover:text-orange-700 break-all"
                >
                  X: {app.store.twitterUrl}
                </a>
              ) : null}
              {app.store.instagramUrl ? (
                <a
                  href={app.store.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-orange-600 hover:text-orange-700 break-all"
                >
                  Instagram: {app.store.instagramUrl}
                </a>
              ) : null}
              {!app.store.twitterUrl && !app.store.instagramUrl && (
                <p className="text-slate-800">未設定</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-base font-semibold text-slate-800 mb-3">
          提出書類
        </h2>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-500 text-xs">本人確認書類</p>
            {app.identityDocUrl ? (
              <a
                href={app.identityDocUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-600 hover:text-orange-700 break-all"
              >
                {app.identityDocUrl}
              </a>
            ) : (
              <p className="text-slate-800">未提出</p>
            )}
          </div>
          <div>
            <p className="text-slate-500 text-xs">店舗確認書類</p>
            {app.storeDocUrl ? (
              <a
                href={app.storeDocUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-600 hover:text-orange-700 break-all"
              >
                {app.storeDocUrl}
              </a>
            ) : (
              <p className="text-slate-800">未提出</p>
            )}
          </div>
        </div>
      </section>

      {app.reviewer && (
        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-800 mb-2">
            審査履歴
          </h2>
          <p className="text-sm text-slate-700">
            審査担当: {app.reviewer.displayName} ({app.reviewer.email})
          </p>
          {app.reviewedAt && (
            <p className="text-sm text-slate-700 mt-1">
              審査日時: {formatDateTime(app.reviewedAt)}
            </p>
          )}
          {app.rejectionReason && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mt-3">
              却下理由: {app.rejectionReason}
            </div>
          )}
        </section>
      )}

      {isPending && (
        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-800 mb-3">
            審査アクション
          </h2>
          <div className="flex flex-col sm:flex-row gap-2">
            <form action={approveApplication}>
              <input type="hidden" name="id" value={app.id} />
              <Button type="submit">承認</Button>
            </form>
            <form
              action={rejectApplication}
              className="flex flex-col sm:flex-row gap-2"
            >
              <input type="hidden" name="id" value={app.id} />
              <input
                name="reason"
                type="text"
                placeholder="却下理由（任意）"
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 min-w-72"
              />
              <Button type="submit" variant="danger">
                却下
              </Button>
            </form>
          </div>
        </section>
      )}

      <div className="pt-1">
        <Link
          href="/admin/applications"
          className="text-sm text-orange-500 hover:text-orange-600 font-medium"
        >
          ← 申請一覧へ戻る
        </Link>
      </div>
    </div>
  );
}
