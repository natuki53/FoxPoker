import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { suspendUser, activateUser } from "../actions";

export const dynamic = "force-dynamic";

const ROLE_MAP: Record<string, string> = {
  USER: "一般ユーザー",
  STORE_ADMIN: "店舗管理者",
  SYSTEM_ADMIN: "システム管理者",
};

const STATUS_MAP: Record<
  string,
  { label: string; variant: "success" | "warning" | "danger" | "default" }
> = {
  ACTIVE: { label: "有効", variant: "success" },
  SUSPENDED: { label: "停止", variant: "danger" },
  DELETED: { label: "削除済み", variant: "default" },
};

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    include: {
      _count: {
        select: {
          ownedStores: true,
          reviews: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">ユーザー管理</h1>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600">
                ユーザー
              </th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">
                メール
              </th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">
                ロール
              </th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">
                統計
              </th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">
                ステータス
              </th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">
                登録日
              </th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((user) => {
              const st = STATUS_MAP[user.status] || STATUS_MAP.ACTIVE;
              return (
                <tr key={user.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {user.displayName}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{user.email}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {ROLE_MAP[user.role] || user.role}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    店舗 {user._count.ownedStores} · 口コミ{" "}
                    {user._count.reviews}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={st.variant}>{st.label}</Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    {user.role !== "SYSTEM_ADMIN" && (
                      <>
                        {user.status === "ACTIVE" && (
                          <form action={suspendUser}>
                            <input
                              type="hidden"
                              name="id"
                              value={user.id}
                            />
                            <Button
                              type="submit"
                              size="sm"
                              variant="danger"
                            >
                              停止
                            </Button>
                          </form>
                        )}
                        {user.status === "SUSPENDED" && (
                          <form action={activateUser}>
                            <input
                              type="hidden"
                              name="id"
                              value={user.id}
                            />
                            <Button type="submit" size="sm">
                              復活
                            </Button>
                          </form>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
