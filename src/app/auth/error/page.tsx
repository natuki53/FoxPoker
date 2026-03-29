import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "認証エラー" };

export default function AuthErrorPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-6 text-center">
        <p className="text-4xl mb-3">⚠️</p>
        <h1 className="text-xl font-bold text-slate-900 mb-2">ログイン処理でエラーが発生しました</h1>
        <p className="text-sm text-slate-600 mb-4">
          お手数ですが、再度ログインをお試しください。
        </p>
        <Link
          href="/auth/login"
          className="inline-flex items-center justify-center px-4 py-2 bg-rose-700 text-white rounded-lg text-sm font-medium hover:bg-rose-800"
        >
          ログイン画面へ戻る
        </Link>
      </div>
    </div>
  );
}
