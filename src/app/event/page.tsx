import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Filter,
  MapPin,
  Search,
} from "lucide-react";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureMasterPrefectures } from "@/lib/prefectures";
import { PlanBadge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "イベント情報" };

const ITEMS_PER_PAGE = 12;

function summarize(text: string | null, limit = 120) {
  if (!text) return null;
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length <= limit) return compact;
  return `${compact.slice(0, limit)}…`;
}

export default async function EventPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const keyword = typeof params.keyword === "string" ? params.keyword : "";
  const prefecture = typeof params.prefecture === "string" ? params.prefecture : "";
  const page = typeof params.page === "string" ? Math.max(1, parseInt(params.page, 10) || 1) : 1;

  const storeFilter: Prisma.StoreWhereInput = {
    status: "APPROVED",
    isEmergencyClosed: false,
    listings: { some: { status: "ACTIVE", endsAt: { gt: new Date() } } },
  };
  if (prefecture) storeFilter.prefectureCode = prefecture;

  const where: Prisma.StoreEventWhereInput = {
    isActive: true,
    store: storeFilter,
  };

  if (keyword) {
    where.OR = [
      { title: { contains: keyword, mode: "insensitive" } },
      { schedule: { contains: keyword, mode: "insensitive" } },
      { description: { contains: keyword, mode: "insensitive" } },
      {
        store: {
          OR: [
            { name: { contains: keyword, mode: "insensitive" } },
            { city: { contains: keyword, mode: "insensitive" } },
            { address: { contains: keyword, mode: "insensitive" } },
            { prefecture: { name: { contains: keyword, mode: "insensitive" } } },
          ],
        },
      },
    ];
  }

  await ensureMasterPrefectures();
  const [events, total, prefectures] = await Promise.all([
    prisma.storeEvent.findMany({
      where,
      include: {
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
      orderBy: [{ createdAt: "desc" }, { sortOrder: "asc" }],
      skip: (page - 1) * ITEMS_PER_PAGE,
      take: ITEMS_PER_PAGE,
    }),
    prisma.storeEvent.count({ where }),
    prisma.prefecture.findMany({ orderBy: { code: "asc" } }),
  ]);

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  function buildUrl(nextPage: number) {
    const sp = new URLSearchParams();
    if (keyword) sp.set("keyword", keyword);
    if (prefecture) sp.set("prefecture", prefecture);
    if (nextPage > 1) sp.set("page", String(nextPage));
    const query = sp.toString();
    return query ? `/event?${query}` : "/event";
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <CalendarDays size={24} className="text-rose-700" /> イベント情報
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          公開中のイベントを、キーワード・エリアで検索できます。
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
        <form action="/event" className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              name="keyword"
              type="text"
              defaultValue={keyword}
              placeholder="イベント名・店舗名・エリアで検索..."
              className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
            />
            <button
              type="submit"
              className="bg-rose-700 hover:bg-rose-800 text-white px-6 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
            >
              <Search size={15} /> 検索
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
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
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <Filter size={14} /> 条件を指定して絞り込みできます
            </p>
          </div>
        </form>
      </div>

      <div className="mb-4">
        <p className="text-sm text-slate-600">
          {keyword && <span className="font-medium">「{keyword}」の</span>}
          検索結果: <span className="font-semibold text-slate-900">{total}</span>件
        </p>
      </div>

      {events.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 py-16 text-center">
          <p className="text-5xl mb-3">📣</p>
          <p className="text-lg font-medium text-slate-700">該当するイベントが見つかりませんでした</p>
          <p className="text-sm text-slate-500 mt-1">条件を変更して再度お試しください。</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <article
              key={event.id}
              className="bg-white rounded-xl border border-slate-200 p-4 hover:border-rose-300 transition-colors"
            >
              <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                <div>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <MapPin size={12} />
                    {event.store.prefecture.name} {event.store.city} · {event.store.name}
                  </p>
                  <h2 className="font-semibold text-slate-900 mt-0.5">{event.title}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <PlanBadge rank={event.store.listings[0]?.plan.rank ?? 1} />
                  <Link
                    href={`/store/${event.storeId}`}
                    className="text-sm text-rose-700 hover:text-rose-800 font-medium"
                  >
                    店舗ページへ →
                  </Link>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-slate-600">
                  <span className="font-medium text-slate-700">日程:</span>{" "}
                  {event.schedule ?? "店舗ページでご確認ください"}
                </p>

                {event.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={event.imageUrl}
                    alt={`${event.title} の画像`}
                    className="w-full max-w-md h-44 object-cover rounded-lg border border-slate-200"
                  />
                )}

                {summarize(event.description) && (
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {summarize(event.description)}
                  </p>
                )}

                {event.linkUrl && (
                  <a
                    href={event.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm text-rose-700 hover:text-rose-800 font-medium"
                  >
                    {event.linkLabel ?? "詳細リンク"} ↗
                  </a>
                )}
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
