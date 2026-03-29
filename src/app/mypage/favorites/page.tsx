import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Heart, MapPin } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PlanBadge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "お気に入り店舗" };

export default async function FavoriteStoresPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login?callbackUrl=/mypage/favorites");

  const favorites = await prisma.favoriteStore.findMany({
    where: { userId: session.user.id },
    include: {
      store: {
        include: {
          prefecture: true,
          photos: { where: { isMain: true }, take: 1 },
          listings: {
            where: { status: "ACTIVE", endsAt: { gt: new Date() } },
            include: { plan: true },
            orderBy: { plan: { rank: "desc" } },
            take: 1,
          },
          _count: { select: { reviews: { where: { status: "ACTIVE" } } } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <p className="text-sm text-slate-500 mb-3">
        <Link href="/mypage" className="hover:text-rose-700">マイページ</Link>
        {" / "}
        <span className="text-slate-700">お気に入り店舗</span>
      </p>
      <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2 mb-6">
        <Heart size={22} className="text-rose-700" /> お気に入り店舗
      </h1>

      {favorites.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 py-16 text-center">
          <p className="text-5xl mb-3">🤍</p>
          <p className="text-lg font-medium text-slate-700">お気に入り店舗はまだありません</p>
          <Link href="/search" className="text-sm text-rose-700 hover:text-rose-800 mt-2 inline-block">
            店舗を探す →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {favorites.map(({ store }) => {
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
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <MapPin size={12} /> {store.prefecture.name} · {store.city}
                  </p>
                  <p className="text-xs text-slate-400 mt-2">{store._count.reviews}件の口コミ</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
