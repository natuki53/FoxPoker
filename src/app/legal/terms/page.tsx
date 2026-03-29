import type { Metadata } from "next";

export const metadata: Metadata = { title: "利用規約" };

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-4">利用規約</h1>
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5 text-sm text-slate-600 leading-relaxed">
        <section>
          <h2 className="font-semibold text-slate-900 mb-1">第1条（適用）</h2>
          <p>
            本規約は、FoxPoker（以下「当サービス」）の利用に関する条件を定めるものです。利用者は本規約に同意のうえ当サービスを利用するものとします。
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-slate-900 mb-1">第2条（サービス内容）</h2>
          <p>
            当サービスはアミューズメントポーカー店舗に関する情報提供を目的としたポータルです。賭博行為の勧誘・仲介・斡旋を目的とするものではありません。
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-slate-900 mb-1">第3条（禁止事項）</h2>
          <p>
            利用者は法令違反行為、公序良俗に反する行為、虚偽情報の投稿、第三者への誹謗中傷、システムへの不正アクセスその他運営が不適切と判断する行為を行ってはなりません。
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-slate-900 mb-1">第4条（免責）</h2>
          <p>
            当サービスは掲載情報の正確性確保に努めますが、最新性・完全性を保証するものではありません。利用者は自己責任で情報を確認し利用するものとします。
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-slate-900 mb-1">第5条（規約変更）</h2>
          <p>
            当サービスは必要に応じて本規約を変更できるものとし、変更後はサイト上で告知した時点から効力を生じます。
          </p>
        </section>
      </div>
    </div>
  );
}
