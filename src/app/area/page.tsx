import type { Metadata } from "next";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ensureMasterPrefectures } from "@/lib/prefectures";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "エリアから探す" };

export default async function AreaPage() {
  await ensureMasterPrefectures();
  const prefectures = await prisma.prefecture.findMany({
    orderBy: { code: "asc" },
    include: {
      _count: {
        select: {
          stores: {
            where: {
              status: "APPROVED",
              isEmergencyClosed: false,
              listings: { some: { status: "ACTIVE", endsAt: { gt: new Date() } } },
            },
          },
        },
      },
    },
  });

  const grouped = new Map<string, typeof prefectures>();
  for (const pref of prefectures) {
    const list = grouped.get(pref.region) || [];
    list.push(pref);
    grouped.set(pref.region, list);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-2 flex items-center gap-2">
        <MapPin size={24} className="text-rose-700" /> エリアから探す
      </h1>
      <p className="text-sm text-slate-700 mb-8">
        都道府県を選んで、掲載中のポーカー店舗を検索できます。
      </p>

      <div className="space-y-8">
        {Array.from(grouped.entries()).map(([region, prefs]) => (
          <section key={region} className="bg-white/95 rounded-2xl border border-rose-100 p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-rose-800 mb-3 border-b border-rose-100 pb-2">
              {region}
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {prefs.map((pref) => (
                <Link
                  key={pref.code}
                  href={`/search?prefecture=${pref.code}`}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-300 hover:border-rose-300 hover:bg-rose-50 transition-all text-sm"
                >
                  <span className="font-medium text-slate-800">{pref.name}</span>
                  {pref._count.stores > 0 && (
                    <span className="text-xs text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
                      {pref._count.stores}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>

      {prefectures.length === 0 && (
        <div className="text-center py-16 text-slate-500">
          <p className="text-5xl mb-4">🗾</p>
          <p className="text-lg font-medium text-slate-700">都道府県データがまだ登録されていません</p>
        </div>
      )}
    </div>
  );
}
