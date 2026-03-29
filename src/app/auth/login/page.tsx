import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "ログイン" };

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center">
          <p className="text-slate-400">読み込み中...</p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
