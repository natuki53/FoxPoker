import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatDate,
  formatPrice,
  getBillingPeriodLabel,
  getPlanPrice,
} from "@/lib/utils";
import { approveApplication, rejectApplication } from "../actions";
import Link from "next/link";

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

export default async function ApplicationsPage() {
  const applications = await prisma.storeApplication.findMany({
    include: {
      store: { include: { prefecture: true } },
      applicant: { select: { displayName: true, email: true } },
      plan: true,
      reviewer: { select: { displayName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">申請管理</h1>

      {applications.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
          申請はまだありません
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => {
            const st = STATUS_MAP[app.status] || STATUS_MAP.SUBMITTED;
            const price = getPlanPrice(app.plan, app.billingPeriod);
            const applicationTypeLabel = price === 0 ? "掲載審査" : "有料プラン";
            const isPending = app.status === "SUBMITTED" || app.status === "REVIEWING";

            return (
              <div
                key={app.id}
                className="bg-white rounded-xl border border-slate-200 p-5"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <Link href={`/admin/applications/${app.id}`} className="font-semibold text-slate-800 hover:text-orange-600">
                      {app.store.name}
                    </Link>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {app.store.prefecture.name} {app.store.city} {app.store.address}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={st.variant}>{st.label}</Badge>
                    <Link
                      href={`/admin/applications/${app.id}`}
                      className="text-xs text-orange-500 hover:text-orange-600 font-medium"
                    >
                      詳細 →
                    </Link>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                  <div>
                    <p className="text-slate-500 text-xs">申請者</p>
                    <p className="text-slate-800">
                      {app.applicant.displayName}
                    </p>
                    <p className="text-xs text-slate-400">
                      {app.applicant.email}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">申請種別</p>
                    <p className="text-slate-800">{applicationTypeLabel}</p>
                    <p className="text-xs text-slate-400">{app.plan.name}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">期間・金額</p>
                    <p className="text-slate-800">
                      {getBillingPeriodLabel(app.billingPeriod, price)}
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatPrice(price)}（税抜）
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">申請日</p>
                    <p className="text-slate-800">
                      {formatDate(app.submittedAt)}
                    </p>
                  </div>
                </div>

                {app.rejectionReason && (
                  <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-3">
                    却下理由: {app.rejectionReason}
                  </div>
                )}

                {app.reviewer && (
                  <p className="text-xs text-slate-400 mb-3">
                    審査担当: {app.reviewer.displayName}
                    {app.reviewedAt && ` · ${formatDate(app.reviewedAt)}`}
                  </p>
                )}

                {isPending && (
                  <div className="flex gap-2">
                    <form action={approveApplication}>
                      <input type="hidden" name="id" value={app.id} />
                      <Button type="submit" size="sm">
                        承認
                      </Button>
                    </form>
                    <form action={rejectApplication} className="flex gap-2">
                      <input type="hidden" name="id" value={app.id} />
                      <input
                        name="reason"
                        type="text"
                        placeholder="却下理由（任意）"
                        className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                      />
                      <Button type="submit" size="sm" variant="danger">
                        却下
                      </Button>
                    </form>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
