"use client";

import { markStorePaymentCompleteAdmin } from "./actions";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState, useTransition, useEffect, useRef, useCallback } from "react";

type Props = {
  storeId: string;
  storeName: string;
};

export function MarkPaymentCompleteButton({ storeId, storeName }: Props) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setPassword("");
    setError("");
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => passwordInputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const fd = new FormData();
    fd.set("storeId", storeId);
    fd.set("password", password);
    startTransition(async () => {
      const result = await markStorePaymentCompleteAdmin(fd);
      if (result.ok) {
        close();
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
      >
        支払い済みにする
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="mark-paid-title"
            className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 border border-slate-200"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h2
              id="mark-paid-title"
              className="text-lg font-semibold text-slate-800 mb-2"
            >
              支払い済みとして記録
            </h2>
            <p className="text-sm text-slate-600 mb-4">
              「{storeName}」を Stripe を通さず支払い済みとして登録します。掲載期間は開始されますが、公開は店舗オーナーが管理画面の公開ボタンで行います。本当に実行しますか？
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor={`admin-password-${storeId}`}
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  管理者パスワード
                </label>
                <input
                  ref={passwordInputRef}
                  id={`admin-password-${storeId}`}
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                  disabled={pending}
                />
              </div>

              {error ? (
                <p className="text-sm text-red-600" role="alert">
                  {error}
                </p>
              ) : null}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={close}
                  disabled={pending}
                >
                  キャンセル
                </Button>
                <Button type="submit" size="sm" variant="danger" disabled={pending}>
                  {pending ? "処理中…" : "実行する"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
