"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { PublicPageBlock } from "@/lib/public-page-blocks";
import { updateStorePublicPageContent, uploadStorePageContentImage } from "./actions";

type LocalBlock = PublicPageBlock & { _key: string };

function newKey() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `k-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function toLocal(blocks: PublicPageBlock[]): LocalBlock[] {
  return blocks.map((b) => ({ ...b, _key: newKey() }));
}

function stripKeys(blocks: LocalBlock[]): PublicPageBlock[] {
  return blocks.map(({ _key: _k, ...rest }) => rest);
}

type Props = {
  storeId: string;
  initialBlocks: PublicPageBlock[];
  disabled: boolean;
};

export function PublicPageBlocksEditor({ storeId, initialBlocks, disabled }: Props) {
  const [blocks, setBlocks] = useState<LocalBlock[]>(() => toLocal(initialBlocks));
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingImageIndex = useRef<number | null>(null);

  const jsonPayload = useMemo(() => JSON.stringify(stripKeys(blocks)), [blocks]);

  const addBlock = useCallback((kind: PublicPageBlock["type"]) => {
    setBlocks((prev) => {
      const next: LocalBlock[] = [...prev];
      if (kind === "heading") {
        next.push({ type: "heading", level: 2, text: "", _key: newKey() });
      } else if (kind === "paragraph") {
        next.push({ type: "paragraph", text: "", _key: newKey() });
      } else {
        next.push({ type: "image", url: "", alt: "", _key: newKey() });
      }
      return next;
    });
  }, []);

  const removeBlock = useCallback((index: number) => {
    setBlocks((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const moveBlock = useCallback((index: number, dir: -1 | 1) => {
    setBlocks((prev) => {
      const j = index + dir;
      if (j < 0 || j >= prev.length) return prev;
      const copy = [...prev];
      [copy[index], copy[j]] = [copy[j]!, copy[index]!];
      return copy;
    });
  }, []);

  const patchBlock = useCallback(<K extends LocalBlock["type"]>(
    index: number,
    patch: Partial<Extract<LocalBlock, { type: K }>>
  ) => {
    setBlocks((prev) =>
      prev.map((b, i) => {
        if (i !== index) return b;
        return { ...b, ...patch } as LocalBlock;
      })
    );
  }, []);

  const triggerImagePick = (index: number) => {
    pendingImageIndex.current = index;
    fileRef.current?.click();
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    const idx = pendingImageIndex.current;
    pendingImageIndex.current = null;
    if (!file || idx == null) return;

    setUploadError(null);
    setUploadingIndex(idx);
    const fd = new FormData();
    fd.set("storeId", storeId);
    fd.set("photo", file);
    const result = await uploadStorePageContentImage(fd);
    setUploadingIndex(null);
    if (!result.ok) {
      setUploadError(result.error);
      return;
    }
    patchBlock(idx, { url: result.url } as Partial<Extract<LocalBlock, { type: "image" }>>);
  };

  return (
    <div className="space-y-4">
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
        className="hidden"
        onChange={onFileChange}
      />

      <p className="text-xs text-slate-500">
        見出し・本文・画像でお知らせを組み立て、公開店舗ページの地図直下に表示できます。画像はこの画面からアップロードしてください。
      </p>

      {uploadError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {uploadError}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => addBlock("heading")}
        >
          見出し（大）
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => {
            setBlocks((prev) => [...prev, { type: "heading", level: 3, text: "", _key: newKey() }]);
          }}
        >
          見出し（小）
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => addBlock("paragraph")}
        >
          本文
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => addBlock("image")}
        >
          画像
        </Button>
      </div>

      <div className="space-y-3">
        {blocks.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center border border-dashed border-slate-200 rounded-lg">
            ブロックがまだありません。上のボタンから追加してください。
          </p>
        ) : (
          blocks.map((block, index) => (
            <div
              key={block._key}
              className="rounded-lg border border-slate-200 bg-white p-3 space-y-2 shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {block.type === "heading" && block.level === 2 && "見出し（大）"}
                  {block.type === "heading" && block.level === 3 && "見出し（小）"}
                  {block.type === "paragraph" && "本文"}
                  {block.type === "image" && "画像"}
                </span>
                <div className="flex flex-wrap gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={disabled || index === 0}
                    onClick={() => moveBlock(index, -1)}
                  >
                    上へ
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={disabled || index === blocks.length - 1}
                    onClick={() => moveBlock(index, 1)}
                  >
                    下へ
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="danger"
                    disabled={disabled}
                    onClick={() => removeBlock(index)}
                  >
                    削除
                  </Button>
                </div>
              </div>

              {block.type === "heading" && (
                <input
                  type="text"
                  value={block.text}
                  onChange={(e) => patchBlock(index, { text: e.target.value })}
                  disabled={disabled}
                  placeholder="見出しテキスト"
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                />
              )}

              {block.type === "paragraph" && (
                <textarea
                  value={block.text}
                  onChange={(e) => patchBlock(index, { text: e.target.value })}
                  disabled={disabled}
                  rows={5}
                  placeholder="本文を入力（改行はそのまま表示されます）"
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm resize-y"
                />
              )}

              {block.type === "image" && (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2 items-center">
                    <Button
                      type="button"
                      size="sm"
                      disabled={disabled || uploadingIndex === index}
                      onClick={() => triggerImagePick(index)}
                    >
                      {uploadingIndex === index ? "アップロード中…" : "画像をアップロード"}
                    </Button>
                    {block.url ? (
                      <span className="text-xs text-emerald-600 truncate max-w-[200px]">設定済み</span>
                    ) : (
                      <span className="text-xs text-amber-600">未アップロード</span>
                    )}
                  </div>
                  {block.url ? (
                    <div className="relative rounded-md border border-slate-200 bg-slate-50 overflow-hidden max-h-48">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={block.url} alt="" className="w-full h-full object-contain max-h-48" />
                    </div>
                  ) : null}
                  <input
                    type="text"
                    value={block.alt ?? ""}
                    onChange={(e) => patchBlock(index, { alt: e.target.value })}
                    disabled={disabled}
                    placeholder="代替テキスト（任意・キャプションにも使えます）"
                    maxLength={200}
                    className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <form action={updateStorePublicPageContent} className="flex justify-end pt-2">
        <input type="hidden" name="storeId" value={storeId} />
        <input type="hidden" name="blocksJson" value={jsonPayload} readOnly />
        <Button type="submit" disabled={disabled}>
          お知らせを保存する
        </Button>
      </form>
    </div>
  );
}
