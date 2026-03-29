import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import Link from "next/link";
import {
  approveStoreInfoEditRequest,
  rejectStoreInfoEditRequest,
} from "../actions";

export const dynamic = "force-dynamic";

const STATUS_MAP: Record<
  string,
  { label: string; variant: "success" | "warning" | "danger" | "default" }
> = {
  PENDING: { label: "審査中", variant: "warning" },
  APPROVED: { label: "承認済み", variant: "success" },
  REJECTED: { label: "却下", variant: "danger" },
};

function DisplayField({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm text-slate-800">{value || "-"}</p>
    </div>
  );
}

export default async function AdminStoreInfoEditsPage() {
  const requests = await prisma.storeInfoEditRequest.findMany({
    include: {
      store: {
        include: {
          prefecture: true,
        },
      },
      prefecture: true,
      requestedBy: { select: { displayName: true, email: true } },
      reviewer: { select: { displayName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 80,
  });

  const pending = requests.filter((request) => request.status === "PENDING");
  const reviewed = requests.filter((request) => request.status !== "PENDING");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">店舗基本情報変更の審査</h1>
        <p className="text-sm text-slate-500 mt-1">
          申請段階で承認した店舗基本情報（店舗名・住所・電話番号など）の変更申請を確認します。
        </p>
      </div>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800">審査待ち</h2>
          <Badge variant="warning">{pending.length}件</Badge>
        </div>

        {pending.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-400">
            現在、審査待ちの申請はありません
          </div>
        ) : (
          <div className="space-y-4">
            {pending.map((request) => (
              <article
                key={request.id}
                className="bg-white rounded-xl border border-slate-200 p-5 space-y-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-slate-800">{request.store.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      申請者: {request.requestedBy.displayName} ({request.requestedBy.email})
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      申請日時: {formatDateTime(request.createdAt)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="warning">審査中</Badge>
                    <Link href={`/store/${request.storeId}`}>
                      <Button size="sm" variant="outline">公開ページ</Button>
                    </Link>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
                    <p className="text-sm font-semibold text-slate-700">現在の承認済み情報</p>
                    <DisplayField label="店舗名" value={request.store.name} />
                    <DisplayField label="店舗名（カナ）" value={request.store.nameKana} />
                    <DisplayField
                      label="所在地"
                      value={`${request.store.prefecture.name} ${request.store.city} ${request.store.address}`}
                    />
                    <DisplayField label="郵便番号" value={request.store.postalCode} />
                    <DisplayField label="電話番号" value={request.store.phone} />
                  </div>

                  <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 space-y-2">
                    <p className="text-sm font-semibold text-orange-700">申請された変更内容</p>
                    <DisplayField label="店舗名" value={request.name} />
                    <DisplayField label="店舗名（カナ）" value={request.nameKana} />
                    <DisplayField
                      label="所在地"
                      value={`${request.prefecture.name} ${request.city} ${request.address}`}
                    />
                    <DisplayField label="郵便番号" value={request.postalCode} />
                    <DisplayField label="電話番号" value={request.phone} />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <form action={approveStoreInfoEditRequest}>
                    <input type="hidden" name="requestId" value={request.id} />
                    <Button type="submit" size="sm">承認</Button>
                  </form>

                  <form action={rejectStoreInfoEditRequest} className="flex gap-2">
                    <input type="hidden" name="requestId" value={request.id} />
                    <input
                      type="text"
                      name="reason"
                      placeholder="却下理由（任意）"
                      className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                    />
                    <Button type="submit" size="sm" variant="danger">却下</Button>
                  </form>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {reviewed.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-slate-800 mb-4">最近の審査結果</h2>
          <div className="space-y-3">
            {reviewed.slice(0, 20).map((request) => {
              const status = STATUS_MAP[request.status] || STATUS_MAP.PENDING;
              return (
                <div
                  key={request.id}
                  className="bg-white rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-800">{request.store.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        申請者: {request.requestedBy.displayName} ・ 申請日時: {formatDateTime(request.createdAt)}
                      </p>
                      {request.reviewedAt && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          審査日時: {formatDateTime(request.reviewedAt)}
                          {request.reviewer ? ` ・ ${request.reviewer.displayName}` : ""}
                        </p>
                      )}
                    </div>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                  {request.status === "REJECTED" && request.rejectionReason && (
                    <div className="mt-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3">
                      却下理由: {request.rejectionReason}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}