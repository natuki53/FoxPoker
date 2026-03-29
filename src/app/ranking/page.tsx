import type { Metadata } from "next";
import Link from "next/link";
import { Crown, MapPin, Star, Trophy } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PlanBadge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "人気ランキング" };

export default async function RankingPage() {
  const stores = await prisma.store.findMany({
    where: {
      status: "APPROVED",
      isEmergencyClosed: false,
      listings: { some: { status: "ACTIVE", endsAt: { gt: new Date() } } },
    },
    include: {
      prefecture: true,
      listings: {
        where: { status: "ACTIVE", endsAt: { gt: new Date() } },
        include: { plan: true },
        orderBy: { plan: { rank: "desc" } },
        take: 1,
      },
      reviews: {
        where: { status: "ACTIVE" },
        select: { scoreOverall: true },
      },
    },
    take: 120,
  });

  const ranked = stores
    .map((store) => {
      const reviewCount = store.reviews.length;
      const avgRating = reviewCount > 0
        ? store.reviews.reduce((sum, review) => sum + review.scoreOverall, 0) / reviewCount
        : 0;
      return {
        id: store.id,
        name: store.name,
        city: store.city,
        prefecture: store.prefecture.name,
        planRank: store.listings[0]?.plan.rank ?? 1,
        reviewCount,
        avgRating,
      };
    })
    .filter((store) => store.reviewCount > 0)
    .sort((a, b) => {
      if (b.avgRating !== a.avgRating) return b.avgRating - a.avgRating;
      return b.reviewCount - a.reviewCount;
    });

  const topOverall = ranked.slice(0, 10);

  const prefectureMap = new Map<string, { count: number; score: number; reviewCount: number }>();
  for (const store of ranked) {
    const current = prefectureMap.get(store.prefecture) ?? { count: 0, score: 0, reviewCount: 0 };
    current.count += 1;
    current.score += store.avgRating;
    current.reviewCount += store.reviewCount;
    prefectureMap.set(store.prefecture, current);
  }
  const areaRanking = Array.from(prefectureMap.entries())
    .map(([name, stats]) => ({
      name,
      storeCount: stats.count,
      avgScore: stats.score / stats.count,
      reviewCount: stats.reviewCount,
    }))
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, 8);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2 mb-1">
        <Crown size={24} className="text-amber-500" /> 人気ランキング
      </h1>
      <p className="text-sm text-slate-600 mb-6">
        口コミ評価の平均点と件数をもとに、掲載中店舗のランキングを表示しています。
      </p>

      <section className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
        <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <Trophy size={17} className="text-rose-700" /> 総合ランキング TOP10
        </h2>
        {topOverall.length === 0 ? (
          <p className="text-sm text-slate-500">ランキング対象の口コミデータがまだありません。</p>
        ) : (
          <ol className="space-y-2">
            {topOverall.map((store, index) => (
              <li key={store.id} className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-500">#{index + 1}</p>
                    <Link href={`/store/${store.id}`} className="font-semibold text-slate-900 hover:text-rose-700">
                      {store.name}
                    </Link>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {store.prefecture} · {store.city}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1 text-amber-500">
                      <Star size={15} fill="currentColor" />
                      <span className="font-bold text-slate-900">{store.avgRating.toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-slate-500">{store.reviewCount}件</p>
                    <div className="mt-1">
                      <PlanBadge rank={store.planRank} />
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="bg-white rounded-xl border border-slate-200 p-4">
        <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <MapPin size={17} className="text-rose-700" /> エリア別ランキング
        </h2>
        {areaRanking.length === 0 ? (
          <p className="text-sm text-slate-500">エリア別ランキングの集計対象がありません。</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {areaRanking.map((area, index) => (
              <article key={area.name} className="border border-slate-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-slate-900">
                    #{index + 1} {area.name}
                  </p>
                  <span className="text-xs bg-rose-100 text-rose-700 px-2 py-0.5 rounded">
                    {area.storeCount}店舗
                  </span>
                </div>
                <p className="text-sm text-slate-600 mt-1">
                  平均評価 {area.avgScore.toFixed(2)} / 5.00
                </p>
                <p className="text-xs text-slate-500 mt-0.5">口コミ合計 {area.reviewCount}件</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
