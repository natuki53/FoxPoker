import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import {
  adminStoreTableBadge,
  hasApprovedApplicationWithoutListing,
} from "@/lib/store-status-ui";

export const dynamic = "force-dynamic";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { approveApplication, rejectApplication } from "./actions";
import { Users, Store, FileCheck, CreditCard } from "lucide-react";
import Link from "next/link";

export default async function AdminDashboard() {
  const [
    totalUsers,
    totalStores,
    pendingApplications,
    activeListings,
    recentApplications,
    recentStores,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.store.count(),
    prisma.storeApplication.count({ where: { status: "SUBMITTED" } }),
    prisma.storeListing.count({
      where: { status: "ACTIVE", endsAt: { gt: new Date() } },
    }),
    prisma.storeApplication.findMany({
      where: { status: { in: ["SUBMITTED", "REVIEWING"] } },
      include: {
        store: true,
        applicant: { select: { displayName: true, email: true } },
        plan: true,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.store.findMany({
      include: {
        prefecture: true,
        owner: { select: { displayName: true, email: true } },
        applications: {
          select: {
            status: true,
            listing: { select: { id: true } },
          },
        },
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
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const stats = [
    {
      label: "総ユーザー数",
      value: totalUsers,
      icon: Users,
      color: "text-blue-500",
    },
    {
      label: "総店舗数",
      value: totalStores,
      icon: Store,
      color: "text-green-500",
    },
    {
      label: "未審査の申請",
      value: pendingApplications,
      icon: FileCheck,
      color: "text-orange-500",
    },
    {
      label: "アクティブ掲載",
      value: activeListings,
      icon: CreditCard,
      color: "text-purple-500",
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">
        システム管理ダッシュボード
      </h1>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-slate-200 p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <stat.icon size={18} className={stat.color} />
              <span className="text-xs text-slate-500">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Pending Applications */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800">
            未審査の申請
          </h2>
          <Link
            href="/admin/applications"
            className="text-sm text-orange-500 hover:text-orange-600 font-medium"
          >
            すべて見る →
          </Link>
        </div>

        {recentApplications.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-400">
            未審査の申請はありません
          </div>
        ) : (
          <div className="space-y-3">
            {recentApplications.map((app) => (
              <div
                key={app.id}
                className="bg-white rounded-xl border border-slate-200 p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-slate-800">
                      {app.store.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      申請者: {app.applicant.displayName} ({app.applicant.email}
                      ) · プラン: {app.plan.name} · 申請日:{" "}
                      {formatDate(app.createdAt)}
                    </p>
                  </div>
                  <Badge
                    variant={
                      app.status === "SUBMITTED" ? "warning" : "default"
                    }
                  >
                    {app.status === "SUBMITTED" ? "未審査" : "審査中"}
                  </Badge>
                </div>

                <div className="flex gap-2 mt-3">
                  <form action={approveApplication}>
                    <input type="hidden" name="id" value={app.id} />
                    <Button type="submit" size="sm">
                      承認
                    </Button>
                  </form>
                  <form action={rejectApplication}>
                    <input type="hidden" name="id" value={app.id} />
                    <input
                      type="hidden"
                      name="reason"
                      value="審査基準を満たしていないため"
                    />
                    <Button type="submit" size="sm" variant="danger">
                      却下
                    </Button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent Stores */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800">最近の店舗</h2>
          <Link
            href="/admin/stores"
            className="text-sm text-orange-500 hover:text-orange-600 font-medium"
          >
            すべて見る →
          </Link>
        </div>

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
                  ステータス
                </th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">
                  登録日
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentStores.map((store) => {
                const st = adminStoreTableBadge(
                  store.status,
                  hasApprovedApplicationWithoutListing(store.applications),
                  store.listings.length > 0
                );
                return (
                  <tr key={store.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {store.name}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {store.owner.displayName}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {store.prefecture.name} {store.city}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={st.variant}>{st.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {formatDate(store.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
