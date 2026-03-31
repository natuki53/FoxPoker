import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
  "image/gif": ".gif",
};

function isR2Configured(): boolean {
  return !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME &&
    process.env.R2_PUBLIC_URL
  );
}

function createR2Client(): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

/**
 * 画像ファイルをストレージにアップロードする。
 * R2環境変数が設定されている場合はCloudflare R2へ、
 * 未設定の場合はローカルファイルシステム（開発用）へ保存する。
 *
 * @returns publicUrl - ブラウザからアクセス可能なURL
 * @returns storageKey - 削除時に使用するキー（R2ではオブジェクトキー、ローカルでは /uploads/... パス）
 */
export async function uploadStoreFile(
  storeId: string,
  file: File
): Promise<{ publicUrl: string; storageKey: string }> {
  const safeStoreId = storeId.replace(/[^a-zA-Z0-9_-]/g, "");
  const ext = EXT_BY_MIME[file.type] ?? (path.extname(file.name).toLowerCase() || ".jpg");
  const fileName = `${Date.now()}-${randomUUID()}${ext}`;
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (isR2Configured()) {
    const storageKey = `stores/${safeStoreId}/${fileName}`;
    const client = createR2Client();
    await client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: storageKey,
        Body: buffer,
        ContentType: file.type,
      })
    );
    const publicUrl = `${process.env.R2_PUBLIC_URL!.replace(/\/$/, "")}/${storageKey}`;
    return { publicUrl, storageKey };
  }

  // ローカルファイルシステム（開発環境フォールバック）
  const uploadDir = path.join(process.cwd(), "public", "uploads", "stores", safeStoreId);
  await mkdir(uploadDir, { recursive: true });
  const absFilePath = path.join(uploadDir, fileName);
  await writeFile(absFilePath, buffer);
  const publicUrl = `/uploads/stores/${safeStoreId}/${fileName}`;
  return { publicUrl, storageKey: publicUrl };
}

/**
 * ストレージからファイルを削除する。
 * - ローカルパス（/uploads/stores/...）→ ローカルファイルシステムから削除
 * - R2オブジェクトキー（stores/...）→ R2から削除
 * - R2公開URL（https://...）→ URLからキーを抽出してR2から削除
 */
export async function deleteStorageFile(storageKeyOrUrl: string | null | undefined): Promise<void> {
  if (!storageKeyOrUrl) return;

  // フルURL（R2公開URL）
  if (storageKeyOrUrl.startsWith("http://") || storageKeyOrUrl.startsWith("https://")) {
    if (!isR2Configured()) return;
    const r2Base = process.env.R2_PUBLIC_URL!.replace(/\/$/, "");
    if (storageKeyOrUrl.startsWith(r2Base + "/")) {
      const key = storageKeyOrUrl.slice(r2Base.length + 1);
      const client = createR2Client();
      await client
        .send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME!, Key: key }))
        .catch(() => undefined);
    }
    return;
  }

  // R2オブジェクトキー（先頭が "/" でない）
  if (!storageKeyOrUrl.startsWith("/")) {
    if (!isR2Configured()) return;
    const client = createR2Client();
    await client
      .send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME!, Key: storageKeyOrUrl }))
      .catch(() => undefined);
    return;
  }

  // ローカルファイルシステム（開発環境）
  if (storageKeyOrUrl.startsWith("/uploads/stores/")) {
    const publicRoot = path.resolve(process.cwd(), "public");
    const absolutePath = path.resolve(publicRoot, storageKeyOrUrl.replace(/^\//, ""));
    if (absolutePath.startsWith(publicRoot)) {
      await unlink(absolutePath).catch(() => undefined);
    }
  }
}

/**
 * ページコンテンツ画像URLとして許可されるURLかどうかを判定する。
 * ローカル開発（/uploads/stores/...）とR2（R2_PUBLIC_URL/stores/...）の両方に対応。
 */
export function isAllowedStoreImageUrl(storeId: string, url: string): boolean {
  const safeId = storeId.replace(/[^a-zA-Z0-9_-]/g, "");

  // ローカル開発
  if (url.startsWith(`/uploads/stores/${safeId}/`)) return true;

  // Cloudflare R2
  const r2Base = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
  if (r2Base && url.startsWith(`${r2Base}/stores/${safeId}/`)) return true;

  return false;
}
