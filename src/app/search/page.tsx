import type { Metadata } from "next";
import Link from "next/link";
import { Search, MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PlanBadge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "店舗検索" };

const ITEMS_PER_PAGE = 12;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const keyword = typeof params.keyword === "string" ? params.keyword : "";
  const prefecture = typeof params.prefecture === "string" ? params.prefecture : "";
  const page = typeof params.page === "string" ? Math.max(1, parseInt(params.page) || 1) : 1;

  const where: Record<string, unknown> = {
    status: "APPROVED",
    isEmergencyClosed: false,
    listings: { some: { status: "ACTIVE", endsAt: { gt: new Date() } } },
  };

  if (keyword) {
    where.OR = [
      { name: { contains: keyword, mode: "insensitive" } },
      { nameKana: { contains: keyword, mode: "insensitive" } },
      { city: { contains: keyword, mode: "insensitive" } },
      { address: { contains: keyword, mode: "insensitive" } },
      { prefecture: { name: { contains: keyword, mode: "insensitive" } } },
    ];
  }

  if (prefecture) where.prefectureCode = prefecture;

  const [stores, total, prefectures] = await Promise.all([
    prisma.store.findMany({
      where,
      include: {
        prefecture: true,
        photos: { where: { isMain: true }, take: 1 },
        events: {
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          take: 3,
        },
        listings: {
          where: { status: "ACTIVE", endsAt: { gt: new Date() } },
          include: { plan: true },
          orderBy: { plan: { rank: "desc" } },
          take: 1,
        },
        _count: { select: { reviews: { where: { status: "ACTIVE" } } } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * ITEMS_PER_PAGE,
      take: ITEMS_PER_PAGE,
    }),
    prisma.store.count({ where }),
    prisma.prefecture.findMany({ orderBy: { code: "asc" } }),
  ]);

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  function buildUrl(p: number) {
    const sp = new URLSearchParams();
    if (keyword) sp.set("keyword", keyword);
    if (prefecture) sp.set("prefecture", prefecture);
    if (p > 1) sp.set("page", String(p));
    return `/search?${sp.toString()}`;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
        <form action="/search" className="space-y-4">
          <div className="flex gap-2">
            <input
              name="keyword"
              type="text"
              defaultValue={keyword}
              placeholder="店舗名・エリア名で検索..."
              className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <button
              type="submit"
              className="bg-orange-500 hover:bg-orange-600 text-white px-6 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
            >
              <Search size={16} /> 検索
            </button>
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              name="prefecture"
              defaultValue={prefecture}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
            >
              <option value="">都道府県を選択</option>
              {prefectures.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </form>
      </div>

      {/* Result Count */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-600">
          {keyword && <span className="font-medium">「{keyword}」の</span>}
          検索結果：<span className="font-semibold text-slate-800">{total}</span>件
        </p>
      </div>

      {/* Results */}
      {stores.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <p className="text-5xl mb-4">🔍</p>
          <p className="text-lg font-medium">条件に一致する店舗が見つかりませんでした</p>
          <p className="text-sm mt-2">キーワードや条件を変えてお試しください</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {stores.map((store) => {
            const planRank = store.listings[0]?.plan.rank ?? 1;
            const photo = store.photos[0];
            return (
              <Link
                key={store.id}
                href={`/store/${store.id}`}
                className="bg-white rounded-xl border border-slate-200 hover:border-orange-300 hover:shadow-md transition-all overflow-hidden"
              >
                <div className="relative h-40 bg-slate-100">
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photo.url}
                      alt={photo.altText ?? store.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl">🃏</div>
                  )}
                  <div className="absolute top-2 right-2">
                    <PlanBadge rank={planRank} />
                  </div>
                </div>
                <div className="p-4">
                  <p className="font-semibold text-slate-800 truncate">{store.name}</p>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <MapPin size={12} /> {store.prefecture.name} · {store.city}
                  </p>
                  {store.events.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {store.events.map((event) => (
                        <p key={event.id} className="text-xs text-slate-600 truncate">
                          {event.schedule ? `${event.schedule} ` : ""}{event.title}
                        </p>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-slate-400 mt-2">
                    {store._count.reviews}件の口コミ
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Pagination */}
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
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => Math.abs(p - page) <= 2 || p === 1 || p === totalPages)
            .map((p, idx, arr) => {
              const prev = arr[idx - 1];
              return (
                <span key={p}>
                  {prev && p - prev > 1 && (
                    <span className="px-1 text-slate-400">...</span>
                  )}
                  <Link
                    href={buildUrl(p)}
                    className={`px-3 py-2 text-sm rounded-lg ${
                      p === page
                        ? "bg-orange-500 text-white"
                        : "border border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {p}
                  </Link>
                </span>
              );
            })}
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
