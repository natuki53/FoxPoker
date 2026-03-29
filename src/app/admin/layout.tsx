import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, FileCheck, Store, Users, FilePenLine } from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session || session.user.role !== "SYSTEM_ADMIN") {
    redirect("/");
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        <aside className="md:w-56 flex-shrink-0">
          <h2 className="text-lg font-bold text-slate-800 mb-4">
            システム管理
          </h2>
          <nav className="space-y-1">
            <Link
              href="/admin"
              className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <LayoutDashboard size={16} /> ダッシュボード
            </Link>
            <Link
              href="/admin/applications"
              className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <FileCheck size={16} /> 申請管理
            </Link>
            <Link
              href="/admin/stores"
              className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Store size={16} /> 店舗管理
            </Link>
            <Link
              href="/admin/store-info-edits"
              className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <FilePenLine size={16} /> 店舗情報変更審査
            </Link>
            <Link
              href="/admin/users"
              className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Users size={16} /> ユーザー管理
            </Link>
          </nav>
        </aside>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
