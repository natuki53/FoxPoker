import type { Metadata } from "next";

export const metadata: Metadata = { title: "プライバシーポリシー" };

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-4">プライバシーポリシー</h1>
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5 text-sm text-slate-600 leading-relaxed">
        <section>
          <h2 className="font-semibold text-slate-900 mb-1">1. 取得する情報</h2>
          <p>
            当サービスは、会員登録時の氏名・メールアドレス等の情報、利用ログ、Cookie等の識別子を取得することがあります。
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-slate-900 mb-1">2. 利用目的</h2>
          <p>
            取得した情報は、本人確認、サービス提供、問い合わせ対応、品質改善、不正利用防止、重要なお知らせの送付のために利用します。
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-slate-900 mb-1">3. 第三者提供</h2>
          <p>
            法令に基づく場合を除き、本人同意なく個人情報を第三者提供しません。決済や認証等の委託先には必要範囲で情報を提供する場合があります。
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-slate-900 mb-1">4. 安全管理</h2>
          <p>
            当サービスは、個人情報の漏えい・滅失・毀損を防止するため、アクセス制御など合理的な安全管理措置を講じます。
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-slate-900 mb-1">5. 開示・訂正・削除</h2>
          <p>
            利用者本人からの開示・訂正・削除等の請求には、法令に従い適切に対応します。お問い合わせはお問い合わせフォームよりご連絡ください。
          </p>
        </section>
      </div>
    </div>
  );
}
