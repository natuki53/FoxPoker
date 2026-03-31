import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { sendContactNotification, sendContactAutoReply } from "@/lib/email";

export const metadata: Metadata = { title: "お問い合わせ" };

async function submitContact(formData: FormData) {
  "use server";

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!name || !email || !category || !message) {
    redirect("/contact?status=error");
  }

  const [notifyResult] = await Promise.all([
    sendContactNotification({ name, email, category, message }),
    sendContactAutoReply({ name, email, category }),
  ]);

  if (!notifyResult.ok) {
    redirect("/contact?status=error");
  }

  redirect("/contact?status=sent");
}

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const status = typeof params.status === "string" ? params.status : "";

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">お問い合わせ</h1>
      <p className="text-sm text-slate-600 mb-6">
        サービスに関するご質問・ご相談は以下フォームよりご連絡ください。
      </p>

      {status === "sent" && (
        <div className="mb-4 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg px-4 py-3 text-sm">
          お問い合わせを受け付けました。ご入力いただいたメールアドレスに確認メールをお送りしました。内容確認のうえ順次ご連絡します。
        </div>
      )}
      {status === "error" && (
        <div className="mb-4 bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-3 text-sm">
          送信に失敗しました。必須項目をすべて入力のうえ、もう一度お試しください。
        </div>
      )}

      <form action={submitContact} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
            お名前 <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            name="name"
            required
            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
            メールアドレス <span className="text-red-500">*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
          />
        </div>
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-slate-700 mb-1">
            お問い合わせ種別 <span className="text-red-500">*</span>
          </label>
          <select
            id="category"
            name="category"
            required
            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-300"
          >
            <option value="">選択してください</option>
            <option value="general">サービス全般について</option>
            <option value="store-owner">店舗掲載について</option>
            <option value="billing">料金・決済について</option>
            <option value="report">不具合報告</option>
          </select>
        </div>
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-slate-700 mb-1">
            お問い合わせ内容 <span className="text-red-500">*</span>
          </label>
          <textarea
            id="message"
            name="message"
            rows={6}
            required
            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-rose-300"
          />
        </div>
        <button
          type="submit"
          className="px-5 py-2.5 bg-rose-700 text-white rounded-lg text-sm font-medium hover:bg-rose-800"
        >
          送信する
        </button>
      </form>
    </div>
  );
}
