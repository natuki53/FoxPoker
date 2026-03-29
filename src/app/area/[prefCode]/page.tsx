import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PlanBadge } from "@/components/ui/badge";

type Props = {
  params: Promise<{ prefCode: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";
const ITEMS_PER_PAGE = 12;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { prefCode } = await params;
  const prefecture = await prisma.prefecture.findFirst({
    where: { OR: [{ code: prefCode }, { slug: prefCode }] },
    select: { name: true },
  });
  if (!prefecture) return {};
  return {
    title: `${prefecture.name}のポーカー店舗`,
    description: `${prefecture.name}で掲載中のポーカー店舗一覧`,
  };
}

export default async function AreaPrefecturePage({ params, searchParams }: Props) {
  const { prefCode } = await params;
  const query = await searchParams;
  const keyword = typeof query.keyword === "string" ? query.keyword : "";
  const page = typeof query.page === "string" ? Math.max(1, parseInt(query.page, 10) || 1) : 1;

  const prefecture = await prisma.prefecture.findFirst({
    where: { OR: [{ code: prefCode }, { slug: prefCode }] },
  });
  if (!prefecture) notFound();
  const resolvedPrefecture = prefecture;

  const where: Prisma.StoreWhereInput = {
    status: "APPROVED",
    isEmergencyClosed: false,
    prefectureCode: resolvedPrefecture.code,
    listings: { some: { status: "ACTIVE", endsAt: { gt: new Date() } } },
  };

  if (keyword) {
    where.OR = [
      { name: { contains: keyword, mode: "insensitive" } },
      { city: { contains: keyword, mode: "insensitive" } },
      { address: { contains: keyword, mode: "insensitive" } },
    ];
  }

  const [stores, total] = await Promise.all([
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
      orderBy: [{ listings: { _count: "desc" } }, { createdAt: "desc" }],
      skip: (page - 1) * ITEMS_PER_PAGE,
      take: ITEMS_PER_PAGE,
    }),
    prisma.store.count({ where }),
  ]);

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  function buildUrl(nextPage: number) {
    const sp = new URLSearchParams();
    if (keyword) sp.set("keyword", keyword);
    if (nextPage > 1) sp.set("page", String(nextPage));
    return `/area/${resolvedPrefecture.slug}?${sp.toString()}`;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <p className="text-sm text-slate-500 mb-4">
        <Link href="/" className="hover:text-rose-700">トップ</Link>
        {" / "}
        <Link href="/area" className="hover:text-rose-700">エリア一覧</Link>
        {" / "}
        <span className="text-slate-700">{resolvedPrefecture.name}</span>
      </p>

      <section className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <MapPin size={23} className="text-rose-700" />
          {resolvedPrefecture.name}の掲載店舗
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          掲載中店舗は <span className="font-semibold text-slate-900">{total}</span> 件です。
        </p>

        <form action={`/area/${resolvedPrefecture.slug}`} className="mt-4 flex gap-2">
          <input
            name="keyword"
            defaultValue={keyword}
            placeholder={`${resolvedPrefecture.name}内で店舗名・市区町村を検索`}
            className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
          />
          <button
            type="submit"
            className="px-4 py-2.5 bg-rose-700 hover:bg-rose-800 text-white text-sm rounded-lg font-medium"
          >
            絞り込む
          </button>
        </form>
      </section>

      {stores.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 py-16 text-center">
          <p className="text-5xl mb-3">🔎</p>
          <p className="text-lg font-medium text-slate-700">条件に合う店舗が見つかりませんでした</p>
          <p className="text-sm text-slate-500 mt-1">キーワードを変更してお試しください。</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {stores.map((store) => {
            const photo = store.photos[0];
            const planRank = store.listings[0]?.plan.rank ?? 1;
            return (
              <Link
                key={store.id}
                href={`/store/${store.id}`}
                className="bg-white rounded-xl border border-slate-200 hover:border-rose-300 hover:shadow-md transition-all overflow-hidden"
              >
                <div className="relative h-40 bg-slate-100">
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photo.url} alt={photo.altText ?? store.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl">🃏</div>
                  )}
                  <div className="absolute top-2 right-2">
                    <PlanBadge rank={planRank} />
                  </div>
                </div>
                <div className="p-4">
                  <p className="font-semibold text-slate-900 truncate">{store.name}</p>
                  <p className="text-xs text-slate-500 mt-1">{store.prefecture.name} · {store.city}</p>
                  {store.events.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {store.events.map((event) => (
                        <p key={event.id} className="text-xs text-slate-600 truncate">
                          {event.schedule ? `${event.schedule} ` : ""}{event.title}
                        </p>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-slate-400 mt-2">{store._count.reviews}件の口コミ</p>
                </div>
              </Link>
            );
          })}
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
