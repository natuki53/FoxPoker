"use client";

import { useEffect, useMemo, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

type GalleryImage = {
  id: string;
  url: string;
  altText: string | null;
};

type Props = {
  storeName: string;
  images: GalleryImage[];
};

export function StoreGalleryLightbox({ storeName, images }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const activeImage = useMemo(() => {
    if (activeIndex === null) return null;
    return images[activeIndex] ?? null;
  }, [activeIndex, images]);

  useEffect(() => {
    if (activeIndex === null) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveIndex(null);
      } else if (event.key === "ArrowLeft") {
        setActiveIndex((prev) => {
          if (prev === null) return prev;
          return prev === 0 ? images.length - 1 : prev - 1;
        });
      } else if (event.key === "ArrowRight") {
        setActiveIndex((prev) => {
          if (prev === null) return prev;
          return prev === images.length - 1 ? 0 : prev + 1;
        });
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeIndex, images.length]);

  if (images.length === 0) return null;

  return (
    <>
      <div className="flex flex-wrap gap-2" role="list">
        {images.map((image, index) => (
          <button
            key={image.id}
            type="button"
            role="listitem"
            onClick={() => setActiveIndex(index)}
            aria-label={
              image.altText
                ? `${image.altText}を拡大表示`
                : `ギャラリー画像 ${index + 1} を拡大表示`
            }
            className="group relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 rounded-md overflow-hidden border border-slate-200/90 bg-slate-100 ring-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 cursor-zoom-in"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.url}
              alt=""
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/15 transition-colors pointer-events-none" />
          </button>
        ))}
      </div>

      {activeImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 px-4 py-6 flex items-center justify-center"
          onClick={() => setActiveIndex(null)}
        >
          <button
            type="button"
            onClick={() => setActiveIndex(null)}
            className="absolute top-4 right-4 rounded-full bg-white/10 hover:bg-white/20 text-white p-2"
            aria-label="閉じる"
          >
            <X size={20} />
          </button>

          {images.length > 1 && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setActiveIndex((prev) => {
                  if (prev === null) return prev;
                  return prev === 0 ? images.length - 1 : prev - 1;
                });
              }}
              className="absolute left-3 md:left-6 rounded-full bg-white/10 hover:bg-white/20 text-white p-2"
              aria-label="前の画像"
            >
              <ChevronLeft size={22} />
            </button>
          )}

          <div className="max-w-5xl w-full max-h-[85vh]" onClick={(event) => event.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activeImage.url}
              alt={activeImage.altText ?? `${storeName} のギャラリー画像`}
              className="w-full h-full max-h-[85vh] object-contain rounded-lg"
            />
          </div>

          {images.length > 1 && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setActiveIndex((prev) => {
                  if (prev === null) return prev;
                  return prev === images.length - 1 ? 0 : prev + 1;
                });
              }}
              className="absolute right-3 md:right-6 rounded-full bg-white/10 hover:bg-white/20 text-white p-2"
              aria-label="次の画像"
            >
              <ChevronRight size={22} />
            </button>
          )}
        </div>
      )}
    </>
  );
}
