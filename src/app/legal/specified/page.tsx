import type { Metadata } from "next";

export const metadata: Metadata = { title: "特定商取引法表記" };

const COMPANY_INFO = [
  { label: "販売事業者名", value: "FoxPoker運営事務局" },
  { label: "運営責任者", value: "運営責任者名（準備中）" },
  { label: "所在地", value: "東京都（詳細は請求に応じて遅滞なく開示）" },
  { label: "電話番号", value: "請求に応じて遅滞なく開示" },
  { label: "メールアドレス", value: "support@foxpoker.example" },
  { label: "販売価格", value: "各プラン申込ページに表示（税抜・税込）" },
  { label: "商品代金以外の必要料金", value: "インターネット接続料金、通信料金など" },
  { label: "支払方法", value: "クレジットカード（Stripe）" },
  { label: "支払時期", value: "申込時に決済" },
  { label: "サービス提供時期", value: "審査通過および決済完了後に掲載開始" },
  { label: "返品・キャンセル", value: "デジタルサービスの性質上、決済後の返金は原則不可" },
];

export default function SpecifiedPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-4">特定商取引法に基づく表記</h1>
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <dl className="divide-y divide-slate-200">
          {COMPANY_INFO.map((row) => (
            <div key={row.label} className="grid grid-cols-1 md:grid-cols-3">
              <dt className="bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">{row.label}</dt>
              <dd className="md:col-span-2 px-4 py-3 text-sm text-slate-600">{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
