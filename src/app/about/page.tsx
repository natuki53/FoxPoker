import type { Metadata } from "next";
import { CheckCircle2, Globe2, ShieldCheck, Target } from "lucide-react";

export const metadata: Metadata = { title: "FoxPokerとは" };

const VALUES = [
  {
    icon: Target,
    title: "ポーカー情報の一元化",
    text: "店舗情報・トーナメント・口コミを横断して、次に行くお店を探しやすくします。",
  },
  {
    icon: ShieldCheck,
    title: "安心できる情報設計",
    text: "掲載審査や法令配慮を通じて、プレイヤーと店舗双方が使いやすい場を目指します。",
  },
  {
    icon: Globe2,
    title: "全国をつなぐ検索体験",
    text: "エリア、ゲーム種別、バイインなど多軸検索で地域差を越えた情報収集を支援します。",
  },
];

export default function AboutPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-3">FoxPokerとは</h1>
      <p className="text-slate-600 leading-relaxed mb-8">
        FoxPokerは、日本国内のアミューズメントポーカー店舗を横断検索できる情報プラットフォームです。
        プレイヤーが「どこでプレイするか」を比較しやすく、店舗が「どのように魅力を伝えるか」を整えやすい環境を提供します。
      </p>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        {VALUES.map((value) => (
          <article key={value.title} className="bg-white rounded-xl border border-slate-200 p-5">
            <value.icon size={20} className="text-rose-700 mb-2" />
            <h2 className="font-semibold text-slate-900 mb-1">{value.title}</h2>
            <p className="text-sm text-slate-600">{value.text}</p>
          </article>
        ))}
      </section>

      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-3">運営ポリシー</h2>
        <ul className="space-y-2 text-sm text-slate-600">
          <li className="flex items-start gap-2">
            <CheckCircle2 size={16} className="text-rose-700 mt-0.5" />
            本サービスは情報提供を目的としており、賭博行為の推奨や仲介は行いません。
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 size={16} className="text-rose-700 mt-0.5" />
            掲載情報は店舗提供情報および運営審査に基づいて表示されます。
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 size={16} className="text-rose-700 mt-0.5" />
            利用者の声を継続反映し、検索性と透明性の改善を続けます。
          </li>
        </ul>
      </section>
    </div>
  );
}
