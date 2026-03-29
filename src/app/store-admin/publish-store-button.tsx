"use client";

import { publishStore } from "./actions";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";

type Props = {
  storeId: string;
  storeName: string;
};

export function PublishStoreButton({ storeId, storeName }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  function handleConfirm() {
    const fd = new FormData();
    fd.set("storeId", storeId);
    startTransition(async () => {
      await publishStore(fd);
      close();
      router.refresh();
    });
  }

  return (
    <>
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        公開する
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
            aria-labelledby="publish-store-title"
            className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 border border-slate-200"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h2
              id="publish-store-title"
              className="text-lg font-semibold text-slate-800 mb-2"
            >
              店舗を公開しますか？
            </h2>
            <p className="text-sm text-slate-600 mb-6">
              「{storeName}」を公開すると、検索結果や店舗ページに表示されます。この操作はすぐに反映されます。
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={close}
                disabled={pending}
              >
                キャンセル
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirm}
                disabled={pending}
              >
                {pending ? "処理中…" : "公開する"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
