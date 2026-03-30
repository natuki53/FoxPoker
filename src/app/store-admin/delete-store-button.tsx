"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { deleteOwnedStore } from "./actions";
import { Button } from "@/components/ui/button";

type Props = {
  storeId: string;
  storeName: string;
  accountHasPassword: boolean;
};

export function DeleteStoreButton({ storeId, storeName, accountHasPassword }: Props) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmStoreName, setConfirmStoreName] = useState("");
  const [pending, startTransition] = useTransition();

  const close = useCallback(() => {
    setOpen(false);
    setPassword("");
    setConfirmStoreName("");
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  function handleOpen() {
    setPassword("");
    setConfirmStoreName("");
    setOpen(true);
  }

  function handleConfirm() {
    const fd = new FormData();
    fd.set("storeId", storeId);
    if (accountHasPassword) {
      fd.set("password", password);
    } else {
      fd.set("confirmStoreName", confirmStoreName);
    }
    startTransition(async () => {
      await deleteOwnedStore(fd);
    });
  }

  const canSubmit = accountHasPassword
    ? password.trim().length > 0
    : confirmStoreName.trim().length > 0;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
        onClick={handleOpen}
      >
        店舗を削除
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
            aria-labelledby={`delete-store-title-${storeId}`}
            className="bg-white rounded-xl shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto p-6 border border-slate-200"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h2
              id={`delete-store-title-${storeId}`}
              className="text-lg font-semibold text-slate-800 mb-2"
            >
              店舗データを完全に削除
            </h2>
            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
              「{storeName}」と関連する掲載・トーナメント・口コミなど<strong>すべて</strong>が削除され、復元できません。非公開に戻したいだけの場合は「非公開にする」を利用してください。
              {accountHasPassword
                ? " 続行するにはログインパスワードを入力してください。"
                : " SNSログインのみのため、下欄に店舗名を正確に入力して確認してください。"}
            </p>

            {accountHasPassword ? (
              <div className="mb-6">
                <label
                  htmlFor={`store-delete-pw-${storeId}`}
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  パスワード
                </label>
                <input
                  id={`store-delete-pw-${storeId}`}
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                />
              </div>
            ) : (
              <div className="mb-6">
                <label
                  htmlFor={`store-delete-name-${storeId}`}
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  店舗名（確認）
                </label>
                <input
                  id={`store-delete-name-${storeId}`}
                  type="text"
                  autoComplete="off"
                  placeholder="カードに表示されている店舗名と同一の文字列"
                  value={confirmStoreName}
                  onChange={(e) => setConfirmStoreName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                />
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={close} disabled={pending}>
                キャンセル
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleConfirm}
                disabled={pending || !canSubmit}
              >
                {pending ? "削除中…" : "店舗を完全に削除する"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
