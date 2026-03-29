import type { Metadata } from "next";

export const metadata: Metadata = { title: "免責事項" };

export default function DisclaimerPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-4">免責事項</h1>
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 text-sm text-slate-600 leading-relaxed">
        <p>
          FoxPokerは、アミューズメントポーカー店舗に関する情報提供を目的としたサービスです。掲載情報の正確性・完全性・有用性について保証するものではありません。
        </p>
        <p>
          当サービスを利用したこと、または利用できなかったことにより生じた損害について、当サービスに故意または重大な過失がある場合を除き責任を負いません。
        </p>
        <p>
          法令解釈や営業許可の適法性判断は各店舗および利用者の責任において行ってください。当サービスは法的助言を提供しません。
        </p>
      </div>
    </div>
  );
}
