import { z } from "zod";

export const publicPageBlockSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("heading"),
    level: z.union([z.literal(2), z.literal(3)]),
    text: z.string().min(1).max(500),
  }),
  z.object({
    type: z.literal("paragraph"),
    text: z.string().max(12000),
  }),
  z.object({
    type: z.literal("image"),
    url: z.string().min(1).max(2000),
    alt: z.string().max(200).optional(),
  }),
]);

export type PublicPageBlock = z.infer<typeof publicPageBlockSchema>;

export const publicPageBlocksSchema = z.array(publicPageBlockSchema).max(100);

export function parsePublicPageBlocks(raw: unknown): PublicPageBlock[] {
  if (raw == null) return [];
  const parsed = publicPageBlocksSchema.safeParse(raw);
  return parsed.success ? parsed.data : [];
}

/** @deprecated isAllowedStoreImageUrl from @/lib/storage を使用してください */
export function isAllowedPageContentImageUrl(storeId: string, url: string): boolean {
  const safeId = storeId.replace(/[^a-zA-Z0-9_-]/g, "");
  return url.startsWith(`/uploads/stores/${safeId}/`);
}
