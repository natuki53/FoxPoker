import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Filter, MapPin, Search, Trophy } from "lucide-react";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureMasterPrefectures } from "@/lib/prefectures";
import { PlanBadge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "トーナメント情報" };

const ITEMS_PER_PAGE = 12;

function parseDateRange(value: string) {
  if (!value) return null;
  const start = new Date(value);
  if (Number.isNaN(start.getTime())) return null;
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export default async function TournamentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const prefecture = typeof params.prefecture === "string" ? params.prefecture : "";
  const gameType = typeof params.gameType === "string" ? params.gameType : "";
  const date = typeof params.date === "string" ? params.date : "";
  const page = typeof params.page === "string" ? Math.max(1, parseInt(params.page, 10) || 1) : 1;

  const storeFilter: Prisma.StoreWhereInput = {
    status: "APPROVED",
    isEmergencyClosed: false,
    listings: { some: { status: "ACTIVE", endsAt: { gt: new Date() } } },
  };
  if (prefecture) storeFilter.prefectureCode = prefecture;

  const where: Prisma.TournamentWhereInput = {
    status: "SCHEDULED",
    store: storeFilter,
  };

  const dateRange = parseDateRange(date);
  where.startsAt = dateRange
    ? { gte: dateRange.start, lt: dateRange.end }
    : { gte: new Date() };

  if (gameType) where.gameTypeId = gameType;

  await ensureMasterPrefectures();
  const [tournaments, total, prefectures, gameTypes, highlightRows] = await Promise.all([
    prisma.tournament.findMany({
      where,
      include: {
        gameType: true,
        store: {
          include: {
            prefecture: true,
            listings: {
              where: { status: "ACTIVE", endsAt: { gt: new Date() } },
              include: { plan: true },
              orderBy: { plan: { rank: "desc" } },
              take: 1,
            },
          },
        },
      },
      orderBy: { startsAt: "asc" },
      skip: (page - 1) * ITEMS_PER_PAGE,
      take: ITEMS_PER_PAGE,
    }),
    prisma.tournament.count({ where }),
    prisma.prefecture.findMany({ orderBy: { code: "asc" } }),
    prisma.gameType.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.tournament.findMany({
      where,
      select: { startsAt: true },
      orderBy: { startsAt: "asc" },
      take: 120,
    }),
  ]);

  const highlightMap = new Map<string, number>();
  for (const row of highlightRows) {
    const key = new Date(row.startsAt).toLocaleDateString("ja-JP");
    highlightMap.set(key, (highlightMap.get(key) ?? 0) + 1);
  }
  const highlights = Array.from(highlightMap.entries()).slice(0, 8);

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  function buildUrl(nextPage: number) {
    const sp = new URLSearchParams();
    if (prefecture) sp.set("prefecture", prefecture);
    if (gameType) sp.set("gameType", gameType);
    if (date) sp.set("date", date);
    if (nextPage > 1) sp.set("page", String(nextPage));
    return `/tournament?${sp.toString()}`;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Trophy size={24} className="text-rose-700" /> トーナメント情報
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          開催予定のトーナメントを、エリア・日付で検索できます。
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
        <form action="/tournament" className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            <select
              name="prefecture"
              defaultValue={prefecture}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
            >
              <option value="">都道府県</option>
              {prefectures.map((pref) => (
                <option key={pref.code} value={pref.code}>
                  {pref.name}
                </option>
              ))}
            </select>
            <select
              name="gameType"
              defaultValue={gameType}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
            >
              <option value="">ゲーム種別</option>
              {gameTypes.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            <input
              name="date"
              type="date"
              defaultValue={date}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <Filter size={14} /> 条件を指定して絞り込みできます
            </p>
            <button
              type="submit"
              className="bg-rose-700 hover:bg-rose-800 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
            >
              <Search size={15} /> 検索
            </button>
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-600 mb-2">
            検索結果: <span className="font-semibold text-slate-900">{total}</span>件
          </p>
          <p className="text-xs text-slate-500">
            条件に一致した開催予定トーナメントを日時順で表示しています。
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-1">
            <CalendarDays size={15} className="text-rose-700" /> 開催日ハイライト
          </p>
          {highlights.length === 0 ? (
            <p className="text-xs text-slate-400">該当日程はありません</p>
          ) : (
            <ul className="space-y-1.5">
              {highlights.map(([day, count]) => (
                <li key={day} className="text-xs text-slate-600 flex items-center justify-between">
                  <span>{day}</span>
                  <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded">{count}件</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {tournaments.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 py-16 text-center">
          <p className="text-5xl mb-3">🗓️</p>
          <p className="text-lg font-medium text-slate-700">該当するトーナメントが見つかりませんでした</p>
          <p className="text-sm text-slate-500 mt-1">条件を変更して再度お試しください。</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tournaments.map((tournament) => (
            <article key={tournament.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:border-rose-300 transition-colors">
              <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                <div>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <MapPin size={12} />
                    {tournament.store.prefecture.name} {tournament.store.city} · {tournament.store.name}
                  </p>
                  <h2 className="font-semibold text-slate-900 mt-0.5">{tournament.title}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <PlanBadge rank={tournament.store.listings[0]?.plan.rank ?? 1} />
                  <Link
                    href={`/tournament/${tournament.id}`}
                    className="text-sm text-rose-700 hover:text-rose-800 font-medium"
                  >
                    詳細を見る →
                  </Link>
                </div>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                <span>
                  📅{" "}
                  {new Date(tournament.startsAt).toLocaleString("ja-JP", {
                    month: "numeric",
                    day: "numeric",
                    weekday: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span>🃏 {tournament.gameType.abbreviation}</span>
                <span>💰 BI {formatPrice(tournament.buyinAmount)}</span>
                {tournament.guaranteeAmount && <span>🏆 GTD {formatPrice(tournament.guaranteeAmount)}</span>}
                {tournament.maxEntries && <span>👥 最大 {tournament.maxEntries}名</span>}
              </div>
            </article>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          {page > 1 && (
            <Link
              href={buildUrl(page - 1)}
              className="flex items-center gap-1 px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              <ChevronLeft size={14} /> 前へ
            </Link>
          )}
          <span className="text-sm text-slate-600">
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={buildUrl(page + 1)}
              className="flex items-center gap-1 px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              次へ <ChevronRight size={14} />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
