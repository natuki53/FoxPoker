"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Search, User, LogOut, ChevronDown, Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Header() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-gradient-to-r from-rose-700 via-red-700 to-rose-800 border-b border-rose-900/40 shadow-md">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <span className="text-2xl">🦊</span>
          <span className="font-bold text-xl text-white tracking-wide">FoxPoker</span>
        </Link>

        {/* Desktop Search */}
        <div className="hidden md:flex flex-1 max-w-md">
          <form action="/search" className="w-full flex">
            <input
              name="keyword"
              type="text"
              placeholder="店舗名・エリアで検索..."
              className="w-full px-4 py-2 border border-white/70 bg-white text-slate-900 placeholder:text-slate-500 rounded-l-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-transparent"
            />
            <button
              type="submit"
              className="bg-amber-300 hover:bg-amber-200 text-rose-900 px-4 rounded-r-lg font-semibold transition-colors"
            >
              <Search size={18} />
            </button>
          </form>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-2">
          <Link href="/tournament" className="text-sm text-rose-50 hover:text-white hover:bg-white/10 rounded-md px-3 py-2 transition-colors">
            トーナメント
          </Link>
          <Link href="/area" className="text-sm text-rose-50 hover:text-white hover:bg-white/10 rounded-md px-3 py-2 transition-colors">
            エリア検索
          </Link>

          {session ? (
            <div className="relative group">
              <button className="flex items-center gap-1 text-sm text-rose-50 hover:text-white hover:bg-white/10 rounded-md px-3 py-2 transition-colors">
                <User size={16} />
                {session.user?.name || "マイページ"}
                <ChevronDown size={14} />
              </button>
              <div className="absolute right-0 top-full w-48 pt-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                <div className="bg-white border border-rose-100 rounded-lg shadow-lg py-1">
                  <Link href="/mypage" className="block px-4 py-2 text-sm text-slate-700 hover:bg-rose-50">マイページ</Link>
                  <Link href="/mypage/favorites" className="block px-4 py-2 text-sm text-slate-700 hover:bg-rose-50">お気に入り</Link>
                  {(session.user as { role?: string })?.role === "STORE_ADMIN" && (
                    <Link href="/store-admin" className="block px-4 py-2 text-sm text-slate-700 hover:bg-rose-50">店舗管理</Link>
                  )}
                  {(session.user as { role?: string })?.role === "SYSTEM_ADMIN" && (
                    <Link href="/admin" className="block px-4 py-2 text-sm text-slate-700 hover:bg-rose-50">管理画面</Link>
                  )}
                  <hr className="my-1 border-rose-100" />
                  <button
                    onClick={() => signOut()}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut size={14} /> ログアウト
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <Link href="/auth/login">
                <Button variant="outline" size="sm">ログイン</Button>
              </Link>
              <Link href="/store-owner">
                <Button size="sm">掲載案内</Button>
              </Link>
            </>
          )}
        </nav>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-white"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      <div className={cn("md:hidden border-t border-rose-800/70 bg-rose-800", menuOpen ? "block" : "hidden")}>
        <div className="px-4 py-3">
          <form action="/search" className="flex mb-3">
            <input
              name="keyword"
              type="text"
              placeholder="店舗名・エリアで検索..."
              className="w-full px-3 py-2 border border-white/70 bg-white text-slate-900 rounded-l-lg text-sm focus:outline-none"
            />
            <button type="submit" className="bg-amber-300 text-rose-900 px-3 rounded-r-lg">
              <Search size={16} />
            </button>
          </form>
          <nav className="space-y-1">
            <Link href="/tournament" className="block py-2 text-sm text-rose-50">トーナメント</Link>
            <Link href="/area" className="block py-2 text-sm text-rose-50">エリア検索</Link>
            {session ? (
              <>
                <Link href="/mypage" className="block py-2 text-sm text-rose-50">マイページ</Link>
                {(session.user as { role?: string })?.role === "STORE_ADMIN" && (
                  <Link href="/store-admin" className="block py-2 text-sm text-rose-50">店舗管理</Link>
                )}
                {(session.user as { role?: string })?.role === "SYSTEM_ADMIN" && (
                  <Link href="/admin" className="block py-2 text-sm text-rose-50">管理画面</Link>
                )}
                <button onClick={() => signOut()} className="block py-2 text-sm text-amber-200">
                  ログアウト
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="block py-2 text-sm text-rose-50">ログイン</Link>
                <Link href="/store-owner" className="block py-2 text-sm font-medium text-amber-200">掲載案内</Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
