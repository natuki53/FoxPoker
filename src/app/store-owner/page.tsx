import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, CheckCircle2, ChevronRight, Megaphone, MessageSquareMore, Trophy } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "掲載案内" };

const FLOW_STEPS = [
  "フォーム入力",
  "運営チーム審査（通常3〜5営業日）",
  "承認後、無料プランは即時反映・有料プランは決済リンク送付",
  "掲載準備完了後、公開ボタンで掲載開始",
];

const MERITS = [
  {
    icon: Megaphone,
    title: "全国のプレイヤーに訴求",
    text: "店舗ページの掲載は無料で始められます。エリア検索などから店舗情報を届け、有料プランでは検索・一覧での露出をさらに強化できます。",
  },
  {
    icon: Trophy,
    title: "トーナメント集客を強化",
    text: "開催予定を一元掲載し、日付・バイイン条件で見つけてもらえます。",
  },
  {
    icon: MessageSquareMore,
    title: "口コミ返信で信頼構築",
    text: "来店者の声に返信して、店舗の透明性と安心感を高められます。",
  },
  {
    icon: BarChart3,
    title: "継続改善しやすい管理画面",
    text: "掲載状況や申請履歴をダッシュボードで確認しながら運用できます。",
  },
];

export default async function StoreOwnerPage() {
  const plans = await prisma.listingPlan.findMany({
    where: { isActive: true },
    orderBy: { rank: "desc" },
  });

  return (
    <div>
      <section className="bg-gradient-to-b from-rose-900 to-rose-800 text-white py-14 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-4">
            全国のポーカープレイヤーに
            <br className="hidden md:block" />
            あなたのお店を届けよう
          </h1>
          <p className="text-rose-100 max-w-2xl mx-auto mb-8">
            FoxPokerは、エリア検索とトーナメント情報を軸に来店候補を探すプレイヤーへ店舗を届ける掲載プラットフォームです。店舗ページの掲載は基本無料で、有料プランは検索での上位表示やトップページのイベント情報（サイドバー等）など、露出を強化するオプションです。
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/store-admin/apply">
              <Button size="lg" className="min-w-56">
                無料審査を申請する
              </Button>
            </Link>
            <Link href="/store-admin">
              <Button
                variant="outline"
                size="lg"
                className="min-w-56 border-white bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                管理画面にログイン
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-slate-900 mb-5">掲載のメリット</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {MERITS.map((merit) => (
            <article key={merit.title} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-2 mb-2">
                <merit.icon size={18} className="text-rose-700" />
                <h3 className="font-semibold text-slate-900">{merit.title}</h3>
              </div>
              <p className="text-sm text-slate-600">{merit.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-white border-y border-slate-200 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">プラン比較</h2>
          <p className="text-sm text-slate-600 mb-6 max-w-3xl">
            無料プランで店舗ページを掲載できます。有料プランは、検索・店舗一覧での表示強化や、トップページのイベント枠での紹介など、集客上のメリットが増える設計です（詳細は各プランの範囲に準じます）。
          </p>
          {plans.length === 0 ? (
            <p className="text-sm text-slate-500">現在提供中のプラン情報はありません。</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {plans.map((plan) => (
                <article key={plan.id} className="rounded-xl border border-slate-200 p-5 bg-slate-50/60">
                  <p className="text-xs text-rose-700 font-semibold tracking-wide mb-1">RANK {plan.rank}</p>
                  <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                  <p className="text-3xl font-bold text-slate-900 mt-3">
                    {formatPrice(plan.price1month)}
                    <span className="text-sm text-slate-500 font-normal"> / 月〜</span>
                  </p>
                  <ul className="text-sm text-slate-600 mt-4 space-y-2">
                    {plan.price1month === 0 ? (
                      <>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 size={16} className="text-rose-700 mt-0.5 shrink-0" />
                          店舗ページを無料・無期限で掲載
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 size={16} className="text-rose-700 mt-0.5 shrink-0" />
                          検索上位・イベント枠などの強化露出は対象外
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 size={16} className="text-rose-700 mt-0.5 shrink-0" />
                          トーナメント掲載: 非対応
                        </li>
                      </>
                    ) : (
                      <>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 size={16} className="text-rose-700 mt-0.5 shrink-0" />
                          店舗ページ掲載（無料プラン相当のベースを含む）
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 size={16} className="text-rose-700 mt-0.5 shrink-0" />
                          検索・一覧の優先表示、トップのイベント情報など（プランにより範囲が異なります）
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 size={16} className="text-rose-700 mt-0.5 shrink-0" />
                          トーナメント掲載: 対応
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 size={16} className="text-rose-700 mt-0.5 shrink-0" />
                          3ヶ月: {formatPrice(plan.price3months)} / 6ヶ月: {formatPrice(plan.price6months)}
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 size={16} className="text-rose-700 mt-0.5 shrink-0" />
                          12ヶ月: {formatPrice(plan.price12months)}
                        </li>
                      </>
                    )}
                  </ul>
                  <Link
                    href="/store-admin/apply"
                    className="mt-4 inline-flex items-center gap-1 text-sm text-rose-700 hover:text-rose-800 font-medium"
                  >
                    このプランで申請する <ChevronRight size={14} />
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">掲載開始までの流れ</h2>
        <ol className="space-y-3">
          {FLOW_STEPS.map((step, index) => (
            <li key={step} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-rose-700 text-white text-sm font-bold flex items-center justify-center">
                {index + 1}
              </span>
              <span className="text-slate-700">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-rose-50 border-t border-rose-100 py-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-3">まずは無料審査からはじめましょう</h2>
          <p className="text-slate-600 mb-6">
            店舗情報と希望プランを入力すると、審査後に無料プランは店舗ページ掲載の準備へ、そのまま進めます。有料プランは露出強化オプションとして、決済後に該当機能が有効になります。
          </p>
          <Link href="/store-admin/apply">
            <Button size="lg">掲載申請フォームへ進む</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
