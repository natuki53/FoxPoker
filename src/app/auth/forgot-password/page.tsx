import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import Link from "next/link";

export const metadata: Metadata = { title: "パスワードをお忘れの方" };

async function requestReset(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) redirect("/auth/forgot-password?status=error");

  // ユーザーが存在するかどうかに関わらず同じメッセージを返す（列挙攻撃対策）
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, displayName: true, email: true, passwordHash: true },
  });

  if (user?.passwordHash) {
    // 既存の未使用トークンを無効化
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1時間

    await prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt },
    });

    await sendPasswordResetEmail({
      to: user.email,
      displayName: user.displayName,
      resetToken: token,
    }).catch((e) => console.error("[email] パスワードリセットメール送信失敗:", e));
  }

  redirect("/auth/forgot-password?status=sent");
}

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const status = typeof params.status === "string" ? params.status : "";

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-4xl">🔑</span>
          <h1 className="text-2xl font-bold text-slate-800 mt-2">パスワードをお忘れの方</h1>
          <p className="text-sm text-slate-500 mt-1">
            登録済みのメールアドレスを入力してください
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          {status === "sent" ? (
            <div className="text-center py-4">
              <p className="text-4xl mb-3">📧</p>
              <p className="font-medium text-slate-800 mb-2">メールを送信しました</p>
              <p className="text-sm text-slate-500 leading-relaxed">
                ご登録のメールアドレスにパスワードリセット用のリンクをお送りしました。
                メールが届かない場合は迷惑メールフォルダもご確認ください。
              </p>
              <p className="text-xs text-slate-400 mt-3">リンクの有効期限は1時間です</p>
            </div>
          ) : (
            <form action={requestReset} className="space-y-4">
              {status === "error" && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
                  メールアドレスを入力してください。
                </p>
              )}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  メールアドレス
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                リセットメールを送信
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-slate-500 mt-4">
          <Link href="/auth/login" className="text-orange-500 hover:text-orange-600 font-medium">
            ← ログインに戻る
          </Link>
        </p>
      </div>
    </div>
  );
}
