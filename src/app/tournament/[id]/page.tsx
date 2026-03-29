import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Link2, MapPin, Store, Trophy } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Badge, PlanBadge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";

type Props = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    select: {
      title: true,
      store: { select: { name: true, prefecture: { select: { name: true } }, city: true } },
    },
  });
  if (!tournament) return {};
  return {
    title: `${tournament.title} | ${tournament.store.name}`,
    description: `${tournament.store.prefecture.name}${tournament.store.city} ${tournament.store.name}で開催されるトーナメント情報`,
  };
}

export default async function TournamentDetailPage({ params }: Props) {
  const { id } = await params;
  const tournament = await prisma.tournament.findUnique({
    where: { id },
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
  });

  if (!tournament || tournament.status === "CANCELLED") notFound();

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <p className="text-sm text-slate-500 mb-4">
        <Link href="/" className="hover:text-rose-700">トップ</Link>
        {" / "}
        <Link href="/tournament" className="hover:text-rose-700">トーナメント</Link>
        {" / "}
        <span className="text-slate-700">{tournament.title}</span>
      </p>

      <section className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
              <Store size={12} /> {tournament.store.name}
            </p>
            <h1 className="text-2xl font-bold text-slate-900">{tournament.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <PlanBadge rank={tournament.store.listings[0]?.plan.rank ?? 1} />
            {tournament.status === "SCHEDULED" && <Badge variant="warning">開催予定</Badge>}
            {tournament.status === "ONGOING" && <Badge variant="success">開催中</Badge>}
            {tournament.status === "COMPLETED" && <Badge variant="default">終了</Badge>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mb-5">
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-slate-500 text-xs mb-1 flex items-center gap-1">
              <CalendarDays size={12} /> 開催日時
            </p>
            <p className="font-medium text-slate-800">
              {new Date(tournament.startsAt).toLocaleString("ja-JP", {
                year: "numeric",
                month: "long",
                day: "numeric",
                weekday: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-slate-500 text-xs mb-1 flex items-center gap-1">
              <MapPin size={12} /> 会場
            </p>
            <p className="font-medium text-slate-800">
              {tournament.store.prefecture.name}
              {tournament.store.city}
              {tournament.store.address}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
          <div className="border border-slate-200 rounded-lg p-3">
            <p className="text-xs text-slate-500">ゲーム種別</p>
            <p className="font-semibold text-slate-800 mt-1">{tournament.gameType.name}</p>
            <p className="text-xs text-slate-500">{tournament.gameType.abbreviation}</p>
          </div>
          <div className="border border-slate-200 rounded-lg p-3">
            <p className="text-xs text-slate-500">バイイン</p>
            <p className="font-semibold text-slate-800 mt-1">{formatPrice(tournament.buyinAmount)}</p>
            {tournament.rebuyAllowed && (
              <p className="text-xs text-slate-500">
                リバイ {tournament.rebuyAmount ? formatPrice(tournament.rebuyAmount) : "あり"}
              </p>
            )}
          </div>
          <div className="border border-slate-200 rounded-lg p-3">
            <p className="text-xs text-slate-500">賞金・参加上限</p>
            <p className="font-semibold text-slate-800 mt-1">
              {tournament.guaranteeAmount ? `GTD ${formatPrice(tournament.guaranteeAmount)}` : "保証額なし"}
            </p>
            <p className="text-xs text-slate-500">{tournament.maxEntries ? `最大 ${tournament.maxEntries}名` : "上限未設定"}</p>
          </div>
        </div>

        {tournament.description && (
          <section className="mb-5">
            <h2 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
              <Trophy size={16} className="text-rose-700" /> トーナメント説明
            </h2>
            <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{tournament.description}</p>
          </section>
        )}

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/store/${tournament.storeId}`}
            className="px-4 py-2 rounded-lg bg-rose-700 text-white text-sm font-medium hover:bg-rose-800"
          >
            店舗ページを見る
          </Link>
          {tournament.store.websiteUrl && (
            <a
              href={tournament.store.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-1"
            >
              <Link2 size={14} /> 公式サイト
            </a>
          )}
        </div>
      </section>
    </div>
  );
}
