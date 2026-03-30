import type { PublicPageBlock } from "@/lib/public-page-blocks";
import { isAllowedPageContentImageUrl } from "@/lib/public-page-blocks";

type Props = {
  storeId: string;
  storeName: string;
  blocks: PublicPageBlock[];
};

export function StorePublicBlocks({ storeId, storeName, blocks }: Props) {
  if (blocks.length === 0) return null;

  return (
    <section className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
      <div className="store-public-blocks">
        {blocks.map((block, index) => {
          if (block.type === "heading") {
            return (
              <h3 key={index} className="text-xl font-bold mt-6 mb-3 first:mt-0">
                {block.text}
              </h3>
            );
          }
          if (block.type === "paragraph") {
            return (
              <p key={index} className="text-sm leading-relaxed whitespace-pre-wrap mb-4 last:mb-0">
                {block.text}
              </p>
            );
          }
          if (block.type === "image") {
            if (!isAllowedPageContentImageUrl(storeId, block.url)) return null;
            return (
              <figure key={index} className="my-5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={block.url}
                  alt={block.alt ?? `${storeName} の画像`}
                  className="w-full max-h-[480px] object-contain rounded-lg border border-slate-200 bg-slate-50"
                />
                {block.alt ? (
                  <figcaption className="text-xs text-slate-500 mt-2 text-center">{block.alt}</figcaption>
                ) : null}
              </figure>
            );
          }
          return null;
        })}
      </div>
    </section>
  );
}
