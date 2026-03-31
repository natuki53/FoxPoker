import { notFound } from "next/navigation";
import {
  MapPin,
  Clock,
  Phone,
  Globe,
  Star,
  Trophy,
  CalendarDays,
  ExternalLink,
  Link2,
  AlertTriangle,
} from "lucide-react";

export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { PlanBadge, Badge } from "@/components/ui/badge";
import { formatPrice, DAY_OF_WEEK_LABELS } from "@/lib/utils";
import type { Metadata } from "next";
import { StoreGalleryLightbox } from "./store-gallery-lightbox";
import { StorePublicBlocks } from "./store-public-blocks";
import { parsePublicPageBlocks } from "@/lib/public-page-blocks";
import { FavoriteButton } from "./favorite-button";
import { ReviewForm } from "./review-form";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const store = await prisma.store.findUnique({
    where: { id },
    select: { name: true, city: true, prefecture: { select: { name: true } } },
  });
  if (!store) return {};
  return {
    title: `${store.name}（${store.prefecture.name}${store.city}）`,
    description: `${store.name}の店舗情報・イベント・トーナメント・口コミ`,
  };
}

export default async function StoreDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  const userId = session?.user?.id ?? null;

  const store = await prisma.store.findUnique({
    where: { id, status: "APPROVED" },
    include: {
      prefecture: true,
      photos: { orderBy: { sortOrder: "asc" } },
      galleryImages: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      events: {
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
      hours: { orderBy: { dayOfWeek: "asc" } },
      tags: { include: { tag: true } },
      listings: {
        where: { status: "ACTIVE", endsAt: { gt: new Date() } },
        include: { plan: true },
        orderBy: { plan: { rank: "desc" } },
        take: 1,
      },
      tournaments: {
        where: { status: "SCHEDULED", startsAt: { gt: new Date() } },
        include: { gameType: true },
        orderBy: { startsAt: "asc" },
        take: 5,
      },
      reviews: {
        where: { status: "ACTIVE" },
        include: {
          user: { select: { displayName: true, avatarUrl: true } },
          reply: { include: { replier: { select: { displayName: true } } } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      _count: { select: { reviews: { where: { status: "ACTIVE" } } } },
    },
  });

  if (!store) notFound();

  const [isFavorited, existingReview] = await Promise.all([
    userId
      ? prisma.favoriteStore.findUnique({
          where: { userId_storeId: { userId, storeId: id } },
          select: { userId: true },
        })
      : null,
    userId
      ? prisma.review.findUnique({
          where: { storeId_userId: { storeId: id, userId } },
          select: { id: true },
        })
      : null,
  ]);

  const publicPageBlocks = parsePublicPageBlocks(store.publicPageBlocks);

  const mainPhoto = store.photos.find((p) => p.isMain) || store.photos[0];
  const avgRating =
    store.reviews.length > 0
      ? (
          store.reviews.reduce((sum, r) => sum + r.scoreOverall, 0) /
          store.reviews.length
        ).toFixed(1)
      : null;
  const addressQuery = encodeURIComponent(
    `${store.prefecture.name}${store.city}${store.address}`
  );
  const mapLink = `https://www.google.com/maps/search/?api=1&query=${addressQuery}`;
  const mapEmbedUrl = `https://maps.google.com/maps?q=${addressQuery}&z=16&output=embed`;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Emergency Closed Notice */}
      {store.isEmergencyClosed && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6">
          <p className="font-semibold">現在臨時休業中です</p>
          {store.emergencyCloseNote && (
            <p className="text-sm mt-1">{store.emergencyCloseNote}</p>
          )}
        </div>
      )}

      {/* Hero */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 space-y-3">
          <div className="relative h-64 md:h-80 bg-slate-100 rounded-xl overflow-hidden">
            {mainPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mainPhoto.url}
                alt={mainPhoto.altText ?? store.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-7xl">
                🃏
              </div>
            )}
            {store.listings[0] && (
              <div className="absolute top-3 right-3">
                <PlanBadge rank={store.listings[0].plan.rank} />
              </div>
            )}
          </div>
          <StoreGalleryLightbox
            storeName={store.name}
            images={store.galleryImages.map((image) => ({
              id: image.id,
              url: image.url,
              altText: image.altText,
            }))}
          />
        </div>

        {/* Store Info Sidebar */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 h-fit">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{store.name}</h1>
            {store.nameKana && (
              <p className="text-xs text-slate-400 mt-0.5">{store.nameKana}</p>
            )}
          </div>

          {avgRating && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-orange-500">
                <Star size={18} fill="currentColor" />
                <span className="font-bold text-lg">{avgRating}</span>
              </div>
              <span className="text-sm text-slate-500">
                ({store._count.reviews}件の口コミ)
              </span>
            </div>
          )}

          <FavoriteButton
            storeId={store.id}
            initialIsFavorited={!!isFavorited}
            variant="detail"
          />

          {store.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {store.tags.map(({ tag }) => (
                <Badge key={tag.id} variant="default">
                  {tag.name}
                </Badge>
              ))}
            </div>
          )}

          {store.description && (
            <div className="pt-1 border-t border-slate-100">
              <h2 className="text-sm font-bold text-slate-800 mb-2">店舗紹介</h2>
              <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
                {store.description}
              </p>
            </div>
          )}

          <div className="space-y-2 text-sm text-slate-600">
            <p className="flex items-start gap-2">
              <MapPin size={16} className="text-slate-400 flex-shrink-0 mt-0.5" />
              <span>
                〒{store.postalCode}
                <br />
                {store.prefecture.name}
                {store.city}
                {store.address}
              </span>
            </p>
            <p className="flex items-center gap-2">
              <MapPin size={16} className="text-slate-400" />
              <a
                href={mapLink}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-orange-500 flex items-center gap-1"
              >
                地図を開く <ExternalLink size={12} />
              </a>
            </p>
            {store.phone && (
              <p className="flex items-center gap-2">
                <Phone size={16} className="text-slate-400" />
                <a href={`tel:${store.phone}`} className="hover:text-orange-500">
                  {store.phone}
                </a>
              </p>
            )}
            {store.websiteUrl && (
              <p className="flex items-center gap-2">
                <Globe size={16} className="text-slate-400" />
                <a
                  href={store.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-orange-500 flex items-center gap-1"
                >
                  公式サイト <ExternalLink size={12} />
                </a>
              </p>
            )}
          </div>

          <div className="flex gap-2">
            {store.twitterUrl && (
              <a
                href={store.twitterUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-sm text-slate-600"
              >
                <Link2 size={14} /> X (Twitter)
              </a>
            )}
            {store.instagramUrl && (
              <a
                href={store.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-sm text-slate-600"
              >
                <Link2 size={14} /> Instagram
              </a>
            )}
          </div>
        </div>
      </div>

      <section className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4">アクセス・営業時間</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
          <div className="overflow-hidden rounded-lg border border-slate-200 min-h-[280px] lg:min-h-[320px]">
            <iframe
              src={mapEmbedUrl}
              title={`${store.name} map`}
              className="w-full h-full min-h-[280px] lg:min-h-[320px] border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 flex flex-col">
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Clock size={16} className="text-orange-500" /> 営業時間
            </h3>
            {store.isEmergencyClosed && (
              <div
                role="alert"
                className="mb-3 rounded-lg border border-amber-400/90 bg-amber-50 px-3 py-2.5 text-amber-950"
              >
                <p className="text-sm font-semibold flex items-start gap-2">
                  <AlertTriangle
                    className="h-5 w-5 shrink-0 text-amber-600 mt-0.5"
                    aria-hidden
                  />
                  <span>
                    現在臨時休業中です。下記の営業時間は通常時の目安であり、本日・近日の実際の営業とは異なる場合があります。
                  </span>
                </p>
                {store.emergencyCloseNote ? (
                  <p className="mt-2 text-sm text-amber-900/90 pl-7 border-t border-amber-200/90 pt-2 whitespace-pre-wrap">
                    {store.emergencyCloseNote}
                  </p>
                ) : null}
              </div>
            )}
            {store.hours.length > 0 ? (
              <div className="space-y-2 flex-1">
                {store.hours.map((hour) => (
                  <div
                    key={hour.id}
                    className="flex items-center justify-between py-2 border-b border-slate-200/80 last:border-b-0"
                  >
                    <span className="text-sm font-medium text-slate-700 w-8">
                      {DAY_OF_WEEK_LABELS[hour.dayOfWeek]}
                    </span>
                    {hour.isClosed ? (
                      <span className="text-sm text-slate-400">定休日</span>
                    ) : (
                      <span className="text-sm text-slate-600">
                        {hour.openTime} 〜 {hour.closeTime}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">営業時間は未登録です。</p>
            )}
          </div>
        </div>
      </section>

      <StorePublicBlocks
        storeId={store.id}
        storeName={store.name}
        blocks={publicPageBlocks}
      />

      {store.events.length > 0 && (
        <section className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <CalendarDays size={18} className="text-orange-500" /> イベント情報
          </h2>
          <div className="space-y-3">
            {store.events.map((event) => (
              <div
                key={event.id}
                className="p-4 bg-slate-50 rounded-lg border border-slate-100"
              >
                {event.imageUrl && (
                  <div className="mb-3 overflow-hidden rounded-md border border-slate-200 bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={event.imageUrl}
                      alt={`${event.title} の画像`}
                      className="h-44 w-full object-cover"
                    />
                  </div>
                )}
                <div className="space-y-1">
                  <p className="font-medium text-slate-800">{event.title}</p>
                  {event.schedule && (
                    <p className="text-xs text-orange-600 font-medium">{event.schedule}</p>
                  )}
                  {event.description && (
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">
                      {event.description}
                    </p>
                  )}
                  {event.linkUrl && (
                    <a
                      href={event.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-rose-700 hover:text-rose-800"
                    >
                      {event.linkLabel ?? "詳細を見る"} <ExternalLink size={14} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tournaments */}
      {store.tournaments.length > 0 && (
        <section className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Trophy size={18} className="text-orange-500" /> 開催予定トーナメント
          </h2>
          <div className="space-y-3">
            {store.tournaments.map((tn) => (
              <div
                key={tn.id}
                className="p-4 bg-slate-50 rounded-lg border border-slate-100"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-slate-800">{tn.title}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {tn.gameType.name}
                    </p>
                  </div>
                  <Badge variant="warning">
                    {new Date(tn.startsAt).toLocaleDateString("ja-JP", {
                      month: "numeric",
                      day: "numeric",
                      weekday: "short",
                    })}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600 mt-3">
                  <span>
                    {new Date(tn.startsAt).toLocaleTimeString("ja-JP", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    開始
                  </span>
                  <span>BI {formatPrice(tn.buyinAmount)}</span>
                  {tn.guaranteeAmount && (
                    <span>GTD {formatPrice(tn.guaranteeAmount)}</span>
                  )}
                  {tn.maxEntries && <span>最大 {tn.maxEntries}名</span>}
                  {tn.rebuyAllowed && <span>リバイ可</span>}
                </div>
                {tn.description && (
                  <p className="text-xs text-slate-500 mt-2">
                    {tn.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Reviews */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Star size={18} className="text-orange-500" /> 口コミ ({store._count.reviews}件)
          </h2>
          <ReviewForm
            storeId={store.id}
            isLoggedIn={!!userId}
            hasReviewed={!!existingReview}
          />
        </div>

        {store.reviews.length === 0 ? (
          <p className="text-center py-8 text-slate-400">
            まだ口コミはありません。最初の口コミを投稿してみましょう！
          </p>
        ) : (
          <div className="space-y-4">
            {store.reviews.map((review) => (
              <div
                key={review.id}
                className="p-4 border border-slate-100 rounded-lg"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-xs font-bold text-slate-600">
                      {review.user.displayName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">
                        {review.user.displayName}
                      </p>
                      <p className="text-xs text-slate-400">
                        {new Date(review.createdAt).toLocaleDateString("ja-JP")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-orange-500">
                    <Star size={14} fill="currentColor" />
                    <span className="font-semibold text-sm">
                      {review.scoreOverall.toFixed(1)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 mb-2">
                  <span>雰囲気 {review.scoreAtmosphere}/5</span>
                  <span>スタッフ {review.scoreStaff}/5</span>
                  <span>コスパ {review.scoreValue}/5</span>
                  <span>設備 {review.scoreFacility}/5</span>
                </div>

                <p className="text-sm text-slate-600 whitespace-pre-wrap">
                  {review.comment}
                </p>

                {review.reply && (
                  <div className="mt-3 pl-4 border-l-2 border-orange-200 bg-orange-50/50 p-3 rounded-r-lg">
                    <p className="text-xs font-medium text-slate-700 mb-1">
                      店舗からの返信 ({review.reply.replier.displayName})
                    </p>
                    <p className="text-sm text-slate-600">
                      {review.reply.comment}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
