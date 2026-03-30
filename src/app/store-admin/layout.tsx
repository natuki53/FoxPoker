import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Store, Plus, Megaphone } from "lucide-react";

export default async function StoreAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login?callbackUrl=/store-admin");

  const ownedStores = await prisma.store.findMany({
    where: { ownerUserId: session.user.id },
    select: {
      id: true,
      name: true,
      status: true,
      applications: {
        select: { status: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  const visibleOwnedStores = ownedStores.filter((store) => {
    const latestApplication = store.applications[0];
    return !(store.status === "PENDING" && latestApplication?.status === "REJECTED");
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <aside className="md:w-56 flex-shrink-0">
          <h2 className="text-lg font-bold text-slate-800 mb-4">店舗管理</h2>
          <nav className="flex flex-col gap-0" aria-label="店舗管理メニュー">
            {/* グループ1: 概要 */}
            <div className="space-y-1">
              <Link
                href="/store-admin"
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <Store size={16} /> ダッシュボード
              </Link>
            </div>

            {visibleOwnedStores.length > 0 && (
              <>
                <div
                  className="my-3 border-t border-slate-200/90"
                  role="separator"
                  aria-hidden="true"
                />
                {/* グループ2: 登録店舗 */}
                <div className="space-y-1">
                  <p className="px-3 pb-1 text-xs font-semibold text-slate-500">
                    登録している店舗
                  </p>
                  {visibleOwnedStores.map((store) => (
                    <Link
                      key={store.id}
                      href={`/store-admin/stores/${store.id}`}
                      className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition-colors truncate"
                      title={store.name}
                    >
                      {store.name}
                    </Link>
                  ))}
                </div>
              </>
            )}

            <div
              className="my-3 border-t border-slate-200/90"
              role="separator"
              aria-hidden="true"
            />
            {/* グループ3: 申請 */}
            <div className="space-y-1">
              <Link
                href="/store-admin/apply"
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <Plus size={16} /> 新規掲載申請
              </Link>
              <Link
                href="/store-admin/upgrade"
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <Megaphone size={16} /> 有料プラン申請
              </Link>
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
