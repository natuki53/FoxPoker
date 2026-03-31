import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import Link from "next/link";
import { z } from "zod";

export const metadata: Metadata = { title: "パスワードの再設定" };

const passwordSchema = z
  .string()
  .min(8, "パスワードは8文字以上で入力してください")
  .regex(/[A-Za-z]/, "英字を含めてください")
  .regex(/[0-9]/, "数字を含めてください");

async function resetPassword(formData: FormData) {
  "use server";

  const token = String(formData.get("token") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const base = `/auth/reset-password?token=${encodeURIComponent(token)}`;

  if (!token) redirect("/auth/forgot-password");

  if (password !== confirm) {
    redirect(`${base}&status=mismatch`);
  }

  const validation = passwordSchema.safeParse(password);
  if (!validation.success) {
    redirect(`${base}&status=weak`);
  }

  const record = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { user: { select: { id: true } } },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    redirect("/auth/reset-password?status=expired");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);

  redirect("/auth/login?status=password_reset");
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";
  const status = typeof params.status === "string" ? params.status : "";

  // トークンなし or 期限切れ
  if (!token || status === "expired") {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <p className="text-5xl mb-4">⏰</p>
          <h1 className="text-xl font-bold text-slate-800 mb-2">リンクが無効です</h1>
          <p className="text-sm text-slate-500 mb-6">
            このリンクは有効期限切れか、すでに使用済みです。
            再度パスワードリセットを申請してください。
          </p>
          <Link
            href="/auth/forgot-password"
            className="inline-block px-6 py-2.5 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600"
          >
            パスワードリセットを申請
          </Link>
        </div>
      </div>
    );
  }

  // トークンの有効性を確認
  const record = await prisma.passwordResetToken.findUnique({
    where: { token },
    select: { usedAt: true, expiresAt: true },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <p className="text-5xl mb-4">⏰</p>
          <h1 className="text-xl font-bold text-slate-800 mb-2">リンクが無効です</h1>
          <p className="text-sm text-slate-500 mb-6">
            このリンクは有効期限切れか、すでに使用済みです。
          </p>
          <Link
            href="/auth/forgot-password"
            className="inline-block px-6 py-2.5 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600"
          >
            パスワードリセットを申請
          </Link>
        </div>
      </div>
    );
  }

  const errorMessage =
    status === "mismatch"
      ? "パスワードが一致しません。"
      : status === "weak"
      ? "パスワードは8文字以上で、英字と数字を含めてください。"
      : null;

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-4xl">🔐</span>
          <h1 className="text-2xl font-bold text-slate-800 mt-2">新しいパスワードの設定</h1>
          <p className="text-sm text-slate-500 mt-1">
            新しいパスワードを入力してください
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          {errorMessage && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg mb-4">
              {errorMessage}
            </p>
          )}
          <form action={resetPassword} className="space-y-4">
            <input type="hidden" name="token" value={token} />
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                新しいパスワード
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              <p className="text-xs text-slate-400 mt-1">8文字以上・英字と数字を含む</p>
            </div>
            <div>
              <label
                htmlFor="confirm"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                パスワード（確認）
              </label>
              <input
                id="confirm"
                name="confirm"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              パスワードを変更する
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
