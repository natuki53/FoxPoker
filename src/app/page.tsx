import Link from "next/link";
import { Search, MapPin, Trophy, Star, Crown, Megaphone } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
import { Button } from "@/components/ui/button";
import { PlanBadge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import { HomeEventsSidebar } from "@/app/home-events-sidebar";

async function getTopPageData() {
  const featuredStores = await prisma.store.findMany({
    where: {
      status: "APPROVED",
      isEmergencyClosed: false,
      listings: { some: { status: "ACTIVE", endsAt: { gt: new Date() } } },
    },
    include: {
      prefecture: true,
      photos: { where: { isMain: true }, take: 1 },
      events: { where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], take: 2 },
      listings: {
        where: { status: "ACTIVE", endsAt: { gt: new Date() } },
        include: { plan: true },
        orderBy: { plan: { rank: "desc" } },
        take: 1,
      },
      _count: { select: { reviews: { where: { status: "ACTIVE" } } } },
    },
    take: 8,
  });

  const upcomingTournaments = await prisma.tournament.findMany({
    where: {
      status: "SCHEDULED",
      startsAt: { gt: new Date() },
      store: {
        status: "APPROVED",
        listings: { some: { status: "ACTIVE", endsAt: { gt: new Date() } } },
      },
    },
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
      gameType: true,
    },
    orderBy: { startsAt: "asc" },
    take: 6,
  });

  return { featuredStores, upcomingTournaments };
}

/** 人口規模の大きい県を、北から南の地理順 */
const MAJOR_PREFECTURES = [
  { slug: "hokkaido", name: "北海道" },
  { slug: "tokyo", name: "東京" },
  { slug: "kanagawa", name: "神奈川" },
  { slug: "aichi", name: "愛知" },
  { slug: "kyoto", name: "京都" },
  { slug: "osaka", name: "大阪" },
  { slug: "hyogo", name: "兵庫" },
  { slug: "fukuoka", name: "福岡" },
];

export default async function Home() {
  const { featuredStores, upcomingTournaments } = await getTopPageData();
  const sidebarTournaments = upcomingTournaments.map((tournament) => ({
    id: `tournament-${tournament.id}`,
    title: tournament.title,
    startsAt: tournament.startsAt.toISOString(),
    schedule: null,
    storeName: tournament.store.name,
    prefectureCode: tournament.store.prefecture.code,
    planRank: tournament.store.listings[0]?.plan.rank ?? 0,
    href: `/tournament/${tournament.id}`,
  }));
  const sidebarStoreEvents = featuredStores.flatMap((store) =>
    store.events.map((event) => ({
      id: `event-${event.id}`,
      title: event.title,
      startsAt: null,
      schedule: event.schedule,
      storeName: store.name,
      prefectureCode: store.prefecture.code,
      planRank: store.listings[0]?.plan.rank ?? 0,
      href: `/store/${store.id}`,
    }))
  );

  return (
    <div>
      {/* HERO */}
      <section className="bg-gradient-to-br from-slate-800 to-slate-900 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl md:text-5xl font-bold mb-4 leading-tight">
            全国のポーカー情報が、<br className="hidden md:block" />ここに集まる。
          </h1>
          <p className="text-slate-300 text-lg mb-8">
            アミューズメントポーカー店舗の検索・トーナメント情報・口コミを一元確認
          </p>
          <form action="/search" className="flex max-w-xl mx-auto rounded-xl overflow-hidden shadow-xl shadow-slate-950/30">
            <input
              name="keyword"
              type="text"
              placeholder="店舗名・エリア名で検索..."
              className="flex-1 px-5 py-4 bg-white text-slate-900 placeholder:text-slate-500 text-base caret-slate-900 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:ring-inset"
            />
            <button
              type="submit"
              className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-4 flex items-center gap-2 font-medium transition-colors"
            >
              <Search size={20} /> 検索
            </button>
          </form>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {["東京", "大阪", "神奈川", "NLH"].map((tag) => (
              <Link
                key={tag}
                href={`/search?keyword=${tag}`}
                className="text-sm text-slate-400 hover:text-white px-3 py-1 bg-white/10 rounded-full transition-colors"
              >
                {tag}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* エリアクイックアクセス */}
      <section className="max-w-7xl mx-auto px-4 py-10">
        <h2 className="text-xl font-bold text-slate-800 mb-5 flex items-center gap-2">
          <MapPin size={20} className="text-orange-500" /> エリアから探す
        </h2>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
          {MAJOR_PREFECTURES.map((p) => (
            <Link
              key={p.slug}
              href={`/area/${p.slug}`}
              className="flex items-center justify-center p-3 bg-white rounded-xl border border-slate-200 hover:border-orange-300 hover:shadow-sm transition-all text-xs font-medium text-slate-700 text-center"
            >
              {p.name}
            </Link>
          ))}
          <Link
            href="/area"
            className="flex items-center justify-center p-3 bg-slate-50 rounded-xl border border-dashed border-slate-300 hover:border-orange-300 transition-all text-xs text-slate-500 text-center"
          >
            全国を見る →
          </Link>
        </div>
      </section>

      {/* 直近のトーナメント */}
      {upcomingTournaments.length > 0 && (
        <section className="bg-white border-y border-slate-200 py-10">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Trophy size={20} className="text-orange-500" /> 直近のトーナメント
              </h2>
              <Link href="/tournament" className="text-sm text-orange-500 hover:text-orange-600 font-medium">
                すべて見る →
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingTournaments.map((tn) => (
                <Link
                  key={tn.id}
                  href={`/store/${tn.storeId}`}
                  className="p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-orange-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-xs text-slate-500">
                        {tn.store.name}（{tn.store.prefecture.name}・{tn.store.city}）
                      </p>
                      <p className="font-semibold text-slate-800 mt-0.5">{tn.title}</p>
                    </div>
                    <PlanBadge rank={tn.store.listings[0]?.plan.rank ?? 1} />
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600 mt-2">
                    <span>
                      📅{" "}
                      {new Date(tn.startsAt).toLocaleDateString("ja-JP", {
                        month: "numeric",
                        day: "numeric",
                        weekday: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span>💰 BI {formatPrice(tn.buyinAmount)}</span>
                    {tn.guaranteeAmount && <span>🏆 GTD {formatPrice(tn.guaranteeAmount)}</span>}
                    <span>🃏 {tn.gameType.abbreviation}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 掲載店舗 */}
      <section className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Star size={20} className="text-orange-500" /> 掲載店舗
          </h2>
          <Link href="/search" className="text-sm text-orange-500 hover:text-orange-600 font-medium">
            すべて見る →
          </Link>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] items-start">
          <div>
            {featuredStores.length === 0 ? (
              <div className="text-center py-16 text-slate-400 bg-white rounded-xl border border-slate-200">
                <p className="text-5xl mb-4">🃏</p>
                <p className="text-lg font-medium">現在掲載中の店舗はありません</p>
                <Link href="/store-owner" className="mt-4 inline-block">
                  <Button>最初の店舗を掲載する</Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
                {featuredStores.map((store) => {
                  const planRank = store.listings[0]?.plan.rank ?? 1;
                  const photo = store.photos[0];
                  return (
                    <Link
                      key={store.id}
                      href={`/store/${store.id}`}
                      className="bg-white rounded-xl border border-slate-200 hover:border-orange-300 hover:shadow-md transition-all overflow-hidden"
                    >
                      <div className="relative h-36 bg-slate-100">
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
                      <div className="p-3">
                        <p className="font-semibold text-slate-800 truncate">{store.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{store.prefecture.name} · {store.city}</p>
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
          </div>

          <aside className="space-y-4 xl:sticky xl:top-24">
            <HomeEventsSidebar
              events={sidebarStoreEvents}
              tournaments={sidebarTournaments}
            />

            <section className="rounded-xl border border-orange-200 bg-gradient-to-b from-orange-50 to-white p-4">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Megaphone size={18} className="text-orange-500" />
                有料プランで集客を強化
              </h3>
              <p className="text-sm text-slate-600 mt-2">
                PREMIUM / PLATINUMプランで検索表示やトップページ露出を強化し、来店の導線を増やせます。
              </p>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                <li className="flex items-start gap-2">
                  <Crown size={16} className="text-amber-500 mt-0.5 shrink-0" />
                  <span>検索結果・一覧での視認性アップ</span>
                </li>
                <li className="flex items-start gap-2">
                  <Crown size={16} className="text-amber-500 mt-0.5 shrink-0" />
                  <span>イベント情報の露出枠を拡張</span>
                </li>
                <li className="flex items-start gap-2">
                  <Crown size={16} className="text-amber-500 mt-0.5 shrink-0" />
                  <span>掲載店舗ページでの訴求を強化</span>
                </li>
              </ul>
              <div className="mt-4 space-y-2">
                <Link href="/store-owner" className="block">
                  <Button className="w-full">料金プランを見る</Button>
                </Link>
                <Link href="/store-admin/apply" className="block">
                  <Button variant="outline" className="w-full">有料プランを相談する</Button>
                </Link>
              </div>
            </section>
          </aside>
        </div>
      </section>

      {/* 店舗オーナー向けCTA */}
      <section className="bg-orange-50 border-t border-orange-100 py-12">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-slate-800 mb-3">あなたのお店を掲載しませんか？</h2>
          <p className="text-slate-600 mb-6">
            店舗ページの掲載は無料で始められます。有料プランでは検索・一覧での上位表示や、トップページのイベント情報などでの紹介など、露出を強化できます。
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/store-owner">
              <Button size="lg">掲載案内を見る</Button>
            </Link>
            <Link href="/store-admin/apply">
              <Button variant="outline" size="lg">無料審査を申請する</Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
