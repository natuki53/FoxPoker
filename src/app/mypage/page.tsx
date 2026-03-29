import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarClock, Heart, MessageCircle, Settings, Star } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "マイページ" };

export default async function MyPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login?callbackUrl=/mypage");

  const [favoriteCount, upcomingTournamentCount, recentReviews] = await Promise.all([
    prisma.favoriteStore.count({ where: { userId: session.user.id } }),
    prisma.tournamentRegistration.count({
      where: {
        userId: session.user.id,
        tournament: { status: "SCHEDULED", startsAt: { gt: new Date() } },
      },
    }),
    prisma.review.findMany({
      where: { userId: session.user.id, status: "ACTIVE" },
      include: {
        store: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">マイページ</h1>
      <p className="text-sm text-slate-600 mb-6">
        {session.user.name || "ユーザー"}さんの利用状況です。
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <article className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <Heart size={14} className="text-rose-700" /> お気に入り店舗
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-2">{favoriteCount}</p>
          <Link href="/mypage/favorites" className="text-sm text-rose-700 hover:text-rose-800 mt-2 inline-block">
            一覧を見る →
          </Link>
        </article>
        <article className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <CalendarClock size={14} className="text-rose-700" /> 参加予定トーナメント
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-2">{upcomingTournamentCount}</p>
          <Link href="/tournament" className="text-sm text-rose-700 hover:text-rose-800 mt-2 inline-block">
            探しに行く →
          </Link>
        </article>
        <article className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <Settings size={14} className="text-rose-700" /> アカウント設定
          </p>
          <p className="text-sm text-slate-600 mt-2">プロフィールや通知設定の管理</p>
          <span className="text-xs text-slate-400 mt-3 inline-block">今後のアップデートで拡張予定</span>
        </article>
      </div>

      <section className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <MessageCircle size={17} className="text-rose-700" /> 最近の口コミ投稿
        </h2>
        {recentReviews.length === 0 ? (
          <p className="text-sm text-slate-500">まだ口コミ投稿はありません。</p>
        ) : (
          <ul className="space-y-2">
            {recentReviews.map((review) => (
              <li key={review.id} className="border border-slate-200 rounded-lg p-3">
                <div className="flex items-center justify-between gap-2">
                  <Link href={`/store/${review.store.id}`} className="font-medium text-slate-900 hover:text-rose-700">
                    {review.store.name}
                  </Link>
                  <span className="text-xs text-slate-500">
                    {new Date(review.createdAt).toLocaleDateString("ja-JP")}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <Star size={12} className="text-amber-500" fill="currentColor" /> 総合 {review.scoreOverall.toFixed(1)}
                </p>
                <p className="text-sm text-slate-600 mt-1 line-clamp-2">{review.comment}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
