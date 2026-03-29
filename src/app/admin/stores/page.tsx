import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import {
  adminStoreTableBadge,
  hasApprovedApplicationWithoutListing,
} from "@/lib/store-status-ui";
import {
  suspendStore,
  activateStore,
  approveStoreInfoEditRequest,
  rejectStoreInfoEditRequest,
} from "../actions";
import { MarkPaymentCompleteButton } from "../mark-payment-complete-button";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminStoresPage() {
  const stores = await prisma.store.findMany({
    include: {
      prefecture: true,
      owner: { select: { displayName: true, email: true } },
      listings: {
        where: {
          status: "ACTIVE",
          endsAt: { gt: new Date() },
          paidAt: { not: null },
        },
        include: { plan: true },
        take: 1,
      },
      _count: {
        select: {
          reviews: true,
          tournaments: true,
        },
      },
      applications: {
        select: {
          status: true,
          listing: { select: { id: true } },
        },
      },
      infoEditRequests: {
        where: { status: "PENDING" },
        include: {
          requestedBy: { select: { displayName: true } },
          prefecture: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">店舗管理</h1>

      {stores.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
          登録された店舗はありません
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">
                  店舗名
                </th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">
                  オーナー
                </th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">
                  エリア
                </th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">
                  プラン
                </th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">
                  ステータス
                </th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stores.map((store) => {
                const unpaidApproved = hasApprovedApplicationWithoutListing(
                  store.applications
                );
                const activeListing = store.listings[0];
                const st = adminStoreTableBadge(
                  store.status,
                  unpaidApproved,
                  Boolean(activeListing)
                );
                const pendingInfoEdit = store.infoEditRequests[0];
                return (
                  <tr key={store.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/store/${store.id}`}
                        className="font-medium text-slate-800 hover:text-orange-500"
                      >
                        {store.name}
                      </Link>
                      <p className="text-xs text-slate-400">
                        口コミ {store._count.reviews} · トーナメント{" "}
                        {store._count.tournaments}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <p>{store.owner.displayName}</p>
                      <p className="text-xs text-slate-400">
                        {store.owner.email}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {store.prefecture.name} {store.city}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {activeListing ? (
                        <span>
                          {activeListing.plan.name}
                          <br />
                          <span className="text-xs text-slate-400">
                            〜{formatDate(activeListing.endsAt)}
                          </span>
                        </span>
                      ) : (
                        <span className="text-slate-400">なし</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={st.variant}>{st.label}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-start gap-2">
                        {pendingInfoEdit && (
                          <div className="rounded-lg border border-orange-200 bg-orange-50 p-2 text-xs text-orange-700 space-y-2">
                            <p className="font-semibold">
                              店舗情報変更申請あり（{pendingInfoEdit.requestedBy.displayName}）
                            </p>
                            <p>
                              変更後: {pendingInfoEdit.name} / {pendingInfoEdit.prefecture.name} {pendingInfoEdit.city}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <form action={approveStoreInfoEditRequest}>
                                <input
                                  type="hidden"
                                  name="requestId"
                                  value={pendingInfoEdit.id}
                                />
                                <Button type="submit" size="sm">
                                  情報変更を承認
                                </Button>
                              </form>
                              <form action={rejectStoreInfoEditRequest}>
                                <input
                                  type="hidden"
                                  name="requestId"
                                  value={pendingInfoEdit.id}
                                />
                                <input
                                  type="hidden"
                                  name="reason"
                                  value="変更内容を確認できなかったため却下しました。"
                                />
                                <Button type="submit" size="sm" variant="danger">
                                  情報変更を却下
                                </Button>
                              </form>
                            </div>
                          </div>
                        )}
                        {unpaidApproved && (
                          <MarkPaymentCompleteButton
                            storeId={store.id}
                            storeName={store.name}
                          />
                        )}
                        {store.status === "APPROVED" && (
                          <form action={suspendStore}>
                            <input type="hidden" name="id" value={store.id} />
                            <Button type="submit" size="sm" variant="danger">
                              停止
                            </Button>
                          </form>
                        )}
                        {store.status === "SUSPENDED" && (
                          <form action={activateStore}>
                            <input type="hidden" name="id" value={store.id} />
                            <Button type="submit" size="sm">
                              復活
                            </Button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
