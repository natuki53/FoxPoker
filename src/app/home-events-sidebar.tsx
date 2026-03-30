"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarClock, MapPin, Trophy } from "lucide-react";
import { distanceToPrefectureCenterKm } from "@/lib/prefecture-centers";

export type HomeSidebarItem = {
  id: string;
  title: string;
  startsAt: string | null;
  schedule: string | null;
  storeName: string;
  prefectureCode: string;
  planRank: number;
  href: string;
};

function sortByPaidAndStartsAt(
  a: HomeSidebarItem,
  b: HomeSidebarItem
): number {
  const paidDiff = Number(b.planRank > 0) - Number(a.planRank > 0);
  if (paidDiff !== 0) return paidDiff;
  const aStartsAt = a.startsAt ? new Date(a.startsAt).getTime() : Number.POSITIVE_INFINITY;
  const bStartsAt = b.startsAt ? new Date(b.startsAt).getTime() : Number.POSITIVE_INFINITY;
  return aStartsAt - bStartsAt;
}

function rankByNearbyPrefecture(
  items: HomeSidebarItem[],
  userLocation: { lat: number; lng: number }
): HomeSidebarItem[] {
  return items
    .map((item, index) => ({
      item,
      index,
      distance: distanceToPrefectureCenterKm(item.prefectureCode, userLocation),
    }))
    .sort((a, b) => {
      if (a.distance !== b.distance) return a.distance - b.distance;

      const paidDiff =
        Number(b.item.planRank > 0) - Number(a.item.planRank > 0);
      if (paidDiff !== 0) return paidDiff;

      const startsAtDiff =
        (a.item.startsAt
          ? new Date(a.item.startsAt).getTime()
          : Number.POSITIVE_INFINITY) -
        (b.item.startsAt
          ? new Date(b.item.startsAt).getTime()
          : Number.POSITIVE_INFINITY);
      if (startsAtDiff !== 0) return startsAtDiff;

      return a.index - b.index;
    })
    .map((row) => row.item);
}

export function HomeEventsSidebar({
  events,
  tournaments,
}: {
  events: HomeSidebarItem[];
  tournaments: HomeSidebarItem[];
}) {
  const defaultSortedEvents = useMemo(
    () => [...events].sort(sortByPaidAndStartsAt),
    [events]
  );
  const defaultSortedTournaments = useMemo(
    () => [...tournaments].sort(sortByPaidAndStartsAt),
    [tournaments]
  );
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  useEffect(() => {
    if (events.length === 0 && tournaments.length === 0) return;
    if (typeof window === "undefined") return;
    if (!("geolocation" in navigator)) return;

    let active = true;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!active) return;
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {},
      {
        enableHighAccuracy: false,
        timeout: 7000,
        maximumAge: 1000 * 60 * 30,
      }
    );

    return () => {
      active = false;
    };
  }, [events.length, tournaments.length]);

  const rankedEvents = useMemo(() => {
    if (!userLocation) return defaultSortedEvents;
    return rankByNearbyPrefecture(defaultSortedEvents, userLocation);
  }, [defaultSortedEvents, userLocation]);
  const rankedTournaments = useMemo(() => {
    if (!userLocation) return defaultSortedTournaments;
    return rankByNearbyPrefecture(defaultSortedTournaments, userLocation);
  }, [defaultSortedTournaments, userLocation]);

  const isNearbyApplied = userLocation !== null;

  return (
    <section className="bg-white rounded-xl border border-slate-200 p-4">
      <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
        <CalendarClock size={18} className="text-orange-500" />
        イベント情報
      </h3>
      {isNearbyApplied && (
        <p className="mt-2 text-xs text-slate-500 flex items-center gap-1">
          <MapPin size={12} className="text-orange-500" />
          現在地に近い都道府県を優先表示中
        </p>
      )}

      {rankedEvents.length === 0 ? (
        <p className="text-sm text-slate-500 mt-3">現在、公開中のイベント情報はありません。</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {rankedEvents.slice(0, 4).map((event) => (
            <li key={event.id}>
              <Link
                href={event.href}
                className="block hover:bg-slate-50 rounded-lg p-2 -m-2 transition-colors"
              >
                <p className="text-sm font-medium text-slate-800 leading-snug">{event.title}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {event.schedule ?? "日程は店舗ページでご確認ください"}
                </p>
                <p className="text-xs text-slate-600 mt-1">{event.storeName}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/event"
        className="mt-4 inline-flex items-center gap-1 text-sm text-orange-500 hover:text-orange-600 font-medium"
      >
        一覧でイベントを確認する →
      </Link>

      <div className="my-4 border-t border-slate-200" />

      <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
        <Trophy size={18} className="text-orange-500" />
        トーナメント情報
      </h3>

      {rankedTournaments.length === 0 ? (
        <p className="text-sm text-slate-500 mt-3">現在、公開中のトーナメント情報はありません。</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {rankedTournaments.slice(0, 4).map((tournament) => (
            <li key={tournament.id}>
              <Link
                href={tournament.href}
                className="block hover:bg-slate-50 rounded-lg p-2 -m-2 transition-colors"
              >
                <p className="text-sm font-medium text-slate-800 leading-snug">{tournament.title}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {tournament.startsAt
                    ? new Date(tournament.startsAt).toLocaleDateString("ja-JP", {
                      month: "numeric",
                      day: "numeric",
                      weekday: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                    : tournament.schedule ?? "日程は店舗ページでご確認ください"}
                </p>
                <p className="text-xs text-slate-600 mt-1">{tournament.storeName}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/tournament"
        className="mt-4 inline-flex items-center gap-1 text-sm text-orange-500 hover:text-orange-600 font-medium"
      >
        一覧でトーナメントを確認する →
      </Link>
    </section>
  );
}
