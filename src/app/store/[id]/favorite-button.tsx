"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { toggleFavorite } from "./actions";

interface FavoriteButtonProps {
  storeId: string;
  initialIsFavorited: boolean;
  /** "card" = 小さいオーバーレイ用, "detail" = 店舗詳細ページ用 */
  variant?: "card" | "detail";
}

export function FavoriteButton({
  storeId,
  initialIsFavorited,
  variant = "card",
}: FavoriteButtonProps) {
  const [isFavorited, setIsFavorited] = useState(initialIsFavorited);
  const [isPending, startTransition] = useTransition();

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      const result = await toggleFavorite(storeId);
      setIsFavorited(result.isFavorited);
    });
  }

  if (variant === "detail") {
    return (
      <button
        onClick={handleClick}
        disabled={isPending}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors text-sm font-medium ${
          isFavorited
            ? "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100"
            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
        } disabled:opacity-60`}
        aria-label={isFavorited ? "お気に入りから削除" : "お気に入りに追加"}
      >
        <Heart
          size={16}
          className={isFavorited ? "fill-rose-500 text-rose-500" : "text-slate-400"}
        />
        {isFavorited ? "お気に入り済み" : "お気に入りに追加"}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="p-1.5 rounded-full bg-white/90 shadow-sm hover:bg-white transition-colors disabled:opacity-60"
      aria-label={isFavorited ? "お気に入りから削除" : "お気に入りに追加"}
    >
      <Heart
        size={15}
        className={isFavorited ? "fill-rose-500 text-rose-500" : "text-slate-400"}
      />
    </button>
  );
}
