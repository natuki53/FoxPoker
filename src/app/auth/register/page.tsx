import type { Metadata } from "next";
import { Suspense } from "react";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "新規登録" };

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center">
          <p className="text-slate-400">読み込み中...</p>
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
