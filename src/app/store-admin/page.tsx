import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatPrice, getBillingPeriodLabel, getPlanPrice } from "@/lib/utils";
import {
  hasApprovedApplicationWithoutListing,
  storeOwnerStoreCardBadge,
} from "@/lib/store-status-ui";
import { Store, Plus, CreditCard, Megaphone } from "lucide-react";
import { PayButton } from "./pay-button";
import { PublishStoreButton } from "./publish-store-button";
import { UnpublishStoreButton } from "./unpublish-store-button";
import { DeleteStoreButton } from "./delete-store-button";

const APP_STATUS_MAP: Record<string, { label: string; variant: "success" | "warning" | "danger" | "default" }> = {
  SUBMITTED: { label: "審査待ち", variant: "warning" },
  REVIEWING: { label: "審査中", variant: "warning" },
  APPROVED: { label: "承認済み", variant: "success" },
  REJECTED: { label: "却下", variant: "danger" },
  CANCELLED: { label: "キャンセル", variant: "default" },
};

const PENDING_STORE_BADGE_BY_APP_STATUS: Record<
  string,
  { label: string; variant: "warning" | "danger" | "default" }
> = {
  SUBMITTED: { label: "審査待ち", variant: "warning" },
  REVIEWING: { label: "審査中", variant: "warning" },
  REJECTED: { label: "却下", variant: "danger" },
  CANCELLED: { label: "キャンセル", variant: "default" },
};

type DashboardProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function StoreAdminDashboard({ searchParams }: DashboardProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login?callbackUrl=/store-admin");

  const userId = session.user.id;
  const query = searchParams ? await searchParams : {};
  const saved = typeof query.saved === "string" ? query.saved : undefined;
  const flashError = typeof query.error === "string" ? query.error : undefined;

  const [stores, applications, ownerAccount] = await Promise.all([
    prisma.store.findMany({
      where: { ownerUserId: userId },
      include: {
        prefecture: true,
        listings: {
          where: { status: "ACTIVE", endsAt: { gt: new Date() } },
          include: { plan: true },
          take: 1,
        },
        infoEditRequests: {
          where: { status: "PENDING" },
          select: { id: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        _count: { select: { reviews: { where: { status: "ACTIVE" } }, tournaments: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.storeApplication.findMany({
      where: { applicantUserId: userId },
      include: { store: true, plan: true, listing: { select: { id: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    }),
  ]);
  const accountHasPassword = !!ownerAccount?.passwordHash;
  const visibleStores = stores.filter((store) => {
    const latestAppForStore = applications.find((application) => application.storeId === store.id);
    return !(store.status === "PENDING" && latestAppForStore?.status === "REJECTED");
  });

  return (
    <div>
      {saved === "store_deleted" && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          店舗を削除しました。
        </div>
      )}
      {flashError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {flashError}
        </div>
      )}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">ダッシュボード</h1>
        <div className="flex items-center gap-2">
          <Link href="/store-admin/apply">
            <Button size="sm">
              <Plus size={16} /> 新規掲載申請
            </Button>
          </Link>
          <Link href="/store-admin/upgrade">
            <Button size="sm" variant="outline">
              <Megaphone size={16} /> 有料プラン申請
            </Button>
          </Link>
        </div>
      </div>

      {/* Stores */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Store size={18} /> あなたの店舗
        </h2>

        {visibleStores.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <p className="text-slate-400 mb-4">まだ登録された店舗はありません</p>
            <Link href="/store-admin/apply">
              <Button>最初の店舗を申請する</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {visibleStores.map((store) => {
              const activeListing = store.listings[0];
              const listingIsFree =
                activeListing &&
                getPlanPrice(activeListing.plan, activeListing.billingPeriod) ===
                  0;
              const pendingInfoEdit = store.infoEditRequests[0];
              const appsForStore = applications.filter(
                (a) => a.storeId === store.id
              );
              const latestAppForStore = appsForStore[0];
              const pendingStoreBadge =
                store.status === "PENDING" && latestAppForStore
                  ? PENDING_STORE_BADGE_BY_APP_STATUS[latestAppForStore.status]
                  : undefined;
              const st = pendingStoreBadge ?? storeOwnerStoreCardBadge(
                store.status,
                hasApprovedApplicationWithoutListing(appsForStore),
                activeListing
              );
              return (
                <div
                  key={store.id}
                  className="bg-white rounded-xl border border-slate-200 p-5"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-slate-800">
                        {store.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {store.prefecture.name} {store.city}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={st.variant}>{st.label}</Badge>
                      {pendingInfoEdit && (
                        <Badge variant="warning">店舗情報変更を審査中</Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                    <span>口コミ: {store._count.reviews}件</span>
                    <span>トーナメント: {store._count.tournaments}件</span>
                    {activeListing && (
                      <>
                        <span>
                          プラン: {activeListing.plan.name}
                        </span>
                        <span>
                          掲載期限: {listingIsFree ? "無期限（無料プラン）" : formatDate(activeListing.endsAt)}
                        </span>
                      </>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Link href={`/store-admin/stores/${store.id}/store-info`}>
                      <Button variant="outline" size="sm">
                        お店情報を編集（承認制）
                      </Button>
                    </Link>
                    <Link href={`/store-admin/stores/${store.id}`}>
                      <Button size="sm">公開ページ情報を編集</Button>
                    </Link>
                    {store.status === "APPROVED" && (
                      <>
                        <Link href={`/store/${store.id}`} target="_blank" rel="noopener noreferrer">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-orange-300 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                          >
                            店舗ページを見る
                          </Button>
                        </Link>
                        <UnpublishStoreButton
                          storeId={store.id}
                          storeName={store.name}
                        />
                        <DeleteStoreButton
                          storeId={store.id}
                          storeName={store.name}
                          accountHasPassword={accountHasPassword}
                        />
                      </>
                    )}
                  </div>

                  {store.status === "AWAITING_PAYMENT" && activeListing && (
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <PublishStoreButton
                        storeId={store.id}
                        storeName={store.name}
                      />
                      <p className="text-xs text-slate-500">
                        {listingIsFree
                          ? "無料プランの掲載準備が整いました。公開ボタンで掲載を開始できます。"
                          : "支払いは完了しています。公開ボタンを押すと掲載が開始されます。"}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Applications */}
      {applications.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <CreditCard size={18} /> 申請履歴
          </h2>
          <div className="space-y-3">
            {applications.map((app) => {
              const as_ = APP_STATUS_MAP[app.status] || APP_STATUS_MAP.SUBMITTED;
              const price = getPlanPrice(app.plan, app.billingPeriod);
              const isFreePlan = price === 0;
              const applicationTypeLabel = isFreePlan ? "掲載審査申請" : "有料プラン申請";
              const isPaid = Boolean(app.listing);
              return (
                <div
                  key={app.id}
                  className="bg-white rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-slate-800">
                        {app.store.name} — {applicationTypeLabel}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {isFreePlan
                          ? "無料掲載（FREE）"
                          : `${app.plan.name} / ${getBillingPeriodLabel(
                              app.billingPeriod,
                              price
                            )}`}{" "}
                        · {formatPrice(price)}（税抜）
                      </p>
                    </div>
                    <Badge variant={as_.variant}>{as_.label}</Badge>
                  </div>

                  <p className="text-xs text-slate-400">
                    申請日: {formatDate(app.submittedAt)}
                  </p>

                  {app.status === "REJECTED" && app.rejectionReason && (
                    <div className="mt-2 bg-red-50 text-red-600 text-sm p-3 rounded-lg">
                      却下理由: {app.rejectionReason}
                    </div>
                  )}

                  {app.status === "APPROVED" && !isPaid && (
                    <div className="mt-3">
                      <PayButton applicationId={app.id} isFree={isFreePlan} />
                    </div>
                  )}

                  {app.status === "APPROVED" && isPaid && (
                    <p className="text-xs text-emerald-600 mt-3">
                      {isFreePlan
                        ? "掲載準備が完了しています。上の店舗カードから公開手続きへ進めます。"
                        : "お支払いは完了しています。"}
                    </p>
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
