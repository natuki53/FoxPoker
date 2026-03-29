import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DAY_OF_WEEK_LABELS } from "@/lib/utils";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  deleteStoreGalleryImage,
  deleteStorePhoto,
  moveStoreGalleryImage,
  moveStorePhoto,
  setMainStorePhoto,
  updatePublicStoreProfile,
  updateStoreOperationalInfo,
  uploadStoreGalleryImage,
  uploadStorePhoto,
} from "./actions";
import { UnsavedChangesGuard } from "./unsaved-changes-guard";
import { PublicPageBlocksEditor } from "./public-page-blocks-editor";
import { ClosedDayCheckbox } from "./closed-day-checkbox";
import { StoreEventsFields } from "./store-events-fields";
import { parsePublicPageBlocks } from "@/lib/public-page-blocks";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getMessage(saved?: string) {
  if (saved === "profile") return "公開プロフィールを更新しました。";
  if (saved === "details") return "営業時間・イベント・タグ情報を更新しました。";
  if (saved === "photos") return "サムネイル画像を更新しました。";
  if (saved === "gallery") return "ギャラリー画像を更新しました。";
  if (saved === "pagecontent") return "お知らせエリア（マップ直下）を更新しました。";
  return null;
}

export default async function StoreEditPage({ params, searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login?callbackUrl=/store-admin");
  }

  const [{ id }, query] = await Promise.all([params, searchParams]);
  const saved = typeof query.saved === "string" ? query.saved : undefined;
  const error = typeof query.error === "string" ? query.error : undefined;

  const [store, tags] = await Promise.all([
    prisma.store.findFirst({
      where: { id, ownerUserId: session.user.id },
      include: {
        photos: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
        galleryImages: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
        events: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
        hours: { orderBy: { dayOfWeek: "asc" } },
        tags: {
          include: { tag: true },
          orderBy: [{ tag: { category: "asc" } }, { tag: { sortOrder: "asc" } }],
        },
        listings: {
          where: { status: "ACTIVE", endsAt: { gt: new Date() } },
          include: { plan: true },
          orderBy: { endsAt: "desc" },
          take: 1,
        },
        infoEditRequests: {
          where: { status: "PENDING" },
          select: { id: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    }),
    prisma.tag.findMany({
      where: { isActive: true },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  if (!store) {
    redirect("/store-admin");
  }

  const successMessage = getMessage(saved);
  const activeListing = store.listings[0];
  const maxThumbnailPhotos = 1;
  const canEditPublicPage = store.status !== "PENDING";
  const selectedTagIds = new Set(store.tags.map((storeTag) => storeTag.tagId));

  const tagsByCategory = tags.reduce<Record<string, typeof tags>>((acc, tag) => {
    if (!acc[tag.category]) {
      acc[tag.category] = [];
    }
    acc[tag.category].push(tag);
    return acc;
  }, {});

  const hoursByDay = new Map(store.hours.map((hour) => [hour.dayOfWeek, hour]));
  const editableHours = DAY_OF_WEEK_LABELS.map((_, dayOfWeek) => {
    const hour = hoursByDay.get(dayOfWeek);
    return {
      dayOfWeek,
      openTime: hour?.openTime ?? "",
      closeTime: hour?.closeTime ?? "",
      isClosed: hour?.isClosed === true,
    };
  });

  const initialPublicBlocks = parsePublicPageBlocks(store.publicPageBlocks);
  const initialEventSeeds = store.events.map((e) => ({
    id: e.id,
    title: e.title,
    schedule: e.schedule,
    description: e.description,
    linkLabel: e.linkLabel,
    linkUrl: e.linkUrl,
    isActive: e.isActive,
  }));

  return (
    <div className="space-y-8">
      <UnsavedChangesGuard />

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-rose-700 tracking-wide mb-1">
            STORE PAGE EDITOR
          </p>
          <h1 className="text-2xl font-bold text-slate-800">
            公開ページ情報編集: {store.name}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            サムネイル・イベント・ギャラリーを分けて管理し、公開ページを詳細に編集できます。
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/store-admin">
            <Button variant="outline" size="sm">
              ダッシュボードへ
            </Button>
          </Link>
          <Link href={`/store-admin/stores/${store.id}/store-info`}>
            <Button variant="outline" size="sm">
              お店情報を編集（承認制）
            </Button>
          </Link>
          <Link href={`/store/${store.id}`} target="_blank">
            <Button size="sm">公開ページを確認</Button>
          </Link>
        </div>
      </div>

      {store.infoEditRequests[0] && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 text-orange-700 text-sm px-4 py-3">
          お店情報（店舗名・住所など）の変更申請を審査中です。確定まで管理者承認が必要です。
        </div>
      )}
      {!canEditPublicPage && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-sm px-4 py-3">
          公開プロフィールと写真は、掲載審査の承認後に編集できます。
        </div>
      )}

      {successMessage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm px-4 py-3">
          {successMessage}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3">
          {error}
        </div>
      )}

      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">公開プロフィール</h2>
            <p className="text-xs text-slate-500 mt-1">
              店舗ページに表示する紹介文やSNS、臨時休業表示を編集します。
            </p>
          </div>
          {activeListing && (
            <Badge variant="success">
              {activeListing.plan.name} / サムネイル 1 枚まで
            </Badge>
          )}
        </div>

        <form action={updatePublicStoreProfile} className="space-y-4" data-dirty-track="true">
          <input type="hidden" name="storeId" value={store.id} />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              店舗紹介文
            </label>
            <textarea
              name="description"
              rows={6}
              defaultValue={store.description ?? ""}
              disabled={!canEditPublicPage}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 resize-y"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Webサイト URL
            </label>
            <input
              name="websiteUrl"
              defaultValue={store.websiteUrl ?? ""}
              placeholder="https://example.com"
              disabled={!canEditPublicPage}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                X (Twitter) URL
              </label>
              <input
                name="twitterUrl"
                defaultValue={store.twitterUrl ?? ""}
                placeholder="https://x.com/..."
                disabled={!canEditPublicPage}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Instagram URL
              </label>
              <input
                name="instagramUrl"
                defaultValue={store.instagramUrl ?? ""}
                placeholder="https://instagram.com/..."
                disabled={!canEditPublicPage}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                name="isEmergencyClosed"
                defaultChecked={store.isEmergencyClosed}
                disabled={!canEditPublicPage}
                className="h-4 w-4 rounded border-slate-300 text-rose-700 focus:ring-rose-300"
              />
              現在は臨時休業中として表示する
            </label>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                臨時休業メモ（任意）
              </label>
              <textarea
                name="emergencyCloseNote"
                rows={2}
                defaultValue={store.emergencyCloseNote ?? ""}
                disabled={!canEditPublicPage}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={!canEditPublicPage}>
              公開プロフィールを保存する
            </Button>
          </div>
        </form>
      </section>

      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-800">詳細情報（営業時間・イベント・タグ）</h2>
          <p className="text-xs text-slate-500 mt-1">
            ゲーム・レートの代わりに、自由なイベント情報を登録できます。
          </p>
        </div>

        <form action={updateStoreOperationalInfo} className="space-y-6" data-dirty-track="true">
          <input type="hidden" name="storeId" value={store.id} />

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">タグ</h3>
            {Object.keys(tagsByCategory).length === 0 ? (
              <p className="text-xs text-slate-500">選択可能なタグがまだ登録されていません。</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(tagsByCategory).map(([category, categoryTags]) => (
                  <div key={category}>
                    <p className="text-xs font-semibold text-slate-500 mb-1">{category}</p>
                    <div className="flex flex-wrap gap-2">
                      {categoryTags.map((tag) => (
                        <label
                          key={tag.id}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700"
                        >
                          <input
                            type="checkbox"
                            name="tagIds"
                            value={tag.id}
                            defaultChecked={selectedTagIds.has(tag.id)}
                            disabled={!canEditPublicPage}
                          />
                          {tag.name}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">営業時間</h3>
            {store.isEmergencyClosed && (
              <div
                role="alert"
                className="rounded-lg border border-amber-300 bg-amber-50 text-amber-950 px-3 py-2.5 text-sm mb-3"
              >
                <p className="font-semibold flex items-start gap-2">
                  <AlertTriangle
                    className="h-4 w-4 shrink-0 text-amber-600 mt-0.5"
                    aria-hidden
                  />
                  <span>
                    臨時休業が有効です。公開店舗ページの営業時間欄にも、来店客向けの注意が表示されます。下記は通常時の営業時間です。
                  </span>
                </p>
                <p className="mt-2 text-xs text-amber-900/85 pl-6">
                  臨時休業のオン・オフは上の「公開プロフィール」から変更できます。
                </p>
              </div>
            )}
            <div className="space-y-3">
              {editableHours.map((hour) => (
                <div
                  key={hour.dayOfWeek}
                  className="grid grid-cols-1 md:grid-cols-[50px,1fr,1fr,auto] gap-3 items-center rounded-lg border border-slate-200 bg-white px-3 py-2"
                >
                  <p className="text-sm font-semibold text-slate-700">
                    {DAY_OF_WEEK_LABELS[hour.dayOfWeek]}
                  </p>
                  <input
                    type="time"
                    name={`hourOpenTime_${hour.dayOfWeek}`}
                    defaultValue={hour.openTime}
                    disabled={!canEditPublicPage}
                    className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                  />
                  <input
                    type="time"
                    name={`hourCloseTime_${hour.dayOfWeek}`}
                    defaultValue={hour.closeTime}
                    disabled={!canEditPublicPage}
                    className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                  />
                  <label className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                    <ClosedDayCheckbox
                      name={`hourIsClosed_${hour.dayOfWeek}`}
                      initialClosed={hour.isClosed}
                      disabled={!canEditPublicPage}
                    />
                    定休日
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">イベント情報</h3>
            <StoreEventsFields
              initialEvents={initialEventSeeds}
              disabled={!canEditPublicPage}
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={!canEditPublicPage}>
              詳細情報を保存する
            </Button>
          </div>
        </form>
      </section>

      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-800">お知らせ（マップ直下）</h2>
          <p className="text-xs text-slate-500 mt-1">
            見出し・本文・画像でお知らせを編集できます。公開店舗ページでは地図と営業時間のすぐ下に表示されます。
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <PublicPageBlocksEditor
            storeId={store.id}
            initialBlocks={initialPublicBlocks}
            disabled={!canEditPublicPage}
          />
        </div>
      </section>

      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-800">サムネイル画像</h2>
          <p className="text-xs text-slate-500 mt-1">
            一覧カードと店舗ページ上部のメイン表示に使う画像です。1枚までです。ファイルを選んで保存すると、既存サムネイルは自動で置き換わります。公開ギャラリーとは別です。
          </p>
        </div>

        {store.photos.length > maxThumbnailPhotos && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-900 text-sm px-4 py-3 mb-4">
            複数枚登録されています。新しい画像をアップロードすると1枚に整理され、古いファイルは削除されます。不要な分だけ手動で削除しても構いません。
          </div>
        )}

        <form
          action={uploadStorePhoto}
          encType="multipart/form-data"
          className="rounded-xl border border-slate-200 bg-slate-50 p-4 mb-5"
          data-dirty-track="true"
        >
          <input type="hidden" name="storeId" value={store.id} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                画像ファイル
              </label>
              <input
                type="file"
                name="photo"
                accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
                disabled={!canEditPublicPage}
                className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-rose-700 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-rose-800"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                代替テキスト
              </label>
              <input
                name="altText"
                maxLength={120}
                placeholder="例: 外観写真"
                disabled={!canEditPublicPage}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
              />
            </div>
            <div className="flex flex-col justify-end">
              <Button type="submit" disabled={!canEditPublicPage}>
                {store.photos.length === 0 ? "サムネイルを登録" : "サムネイルを置き換える"}
              </Button>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            登録済み {store.photos.length} 枚（公開は {maxThumbnailPhotos} 枚まで。アップロードで自動置換）
          </p>
        </form>

        {store.photos.length === 0 ? (
          <p className="text-sm text-slate-500">まだサムネイル画像が登録されていません。</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 max-w-md">
            {store.photos.map((photo, index) => (
              <article
                key={photo.id}
                className="rounded-xl border border-slate-200 overflow-hidden"
              >
                <div className="relative bg-slate-100 h-48">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={photo.altText ?? `${store.name} photo`}
                    className="h-full w-full object-cover"
                  />
                  {photo.isMain && (
                    <Badge variant="premium" className="absolute top-2 left-2">
                      メイン画像
                    </Badge>
                  )}
                </div>
                <div className="p-4 space-y-3">
                  <p className="text-xs text-slate-500">
                    {photo.altText ? photo.altText : "代替テキスト未設定"}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {store.photos.length > 1 && !photo.isMain ? (
                      <form action={setMainStorePhoto}>
                        <input type="hidden" name="storeId" value={store.id} />
                        <input type="hidden" name="photoId" value={photo.id} />
                        <Button
                          type="submit"
                          size="sm"
                          variant="outline"
                          disabled={!canEditPublicPage}
                        >
                          メインに設定
                        </Button>
                      </form>
                    ) : null}

                    {store.photos.length > 1 ? (
                      <>
                        <form action={moveStorePhoto}>
                          <input type="hidden" name="storeId" value={store.id} />
                          <input type="hidden" name="photoId" value={photo.id} />
                          <input type="hidden" name="direction" value="up" />
                          <Button
                            type="submit"
                            size="sm"
                            variant="ghost"
                            disabled={!canEditPublicPage || index === 0}
                          >
                            前へ
                          </Button>
                        </form>

                        <form action={moveStorePhoto}>
                          <input type="hidden" name="storeId" value={store.id} />
                          <input type="hidden" name="photoId" value={photo.id} />
                          <input type="hidden" name="direction" value="down" />
                          <Button
                            type="submit"
                            size="sm"
                            variant="ghost"
                            disabled={!canEditPublicPage || index === store.photos.length - 1}
                          >
                            後へ
                          </Button>
                        </form>
                      </>
                    ) : null}

                    <form action={deleteStorePhoto}>
                      <input type="hidden" name="storeId" value={store.id} />
                      <input type="hidden" name="photoId" value={photo.id} />
                      <Button
                        type="submit"
                        size="sm"
                        variant="danger"
                        disabled={!canEditPublicPage}
                      >
                        削除
                      </Button>
                    </form>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-800">公開ギャラリー画像</h2>
          <p className="text-xs text-slate-500 mt-1">
            店舗ページではサムネイルの直下に小さく並び、クリックで拡大表示されます。サムネイルとは別に登録します。
          </p>
        </div>

        <form
          action={uploadStoreGalleryImage}
          encType="multipart/form-data"
          className="rounded-xl border border-slate-200 bg-slate-50 p-4 mb-5"
          data-dirty-track="true"
        >
          <input type="hidden" name="storeId" value={store.id} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                画像ファイル
              </label>
              <input
                type="file"
                name="photo"
                accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
                disabled={!canEditPublicPage}
                className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-rose-700 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-rose-800"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                代替テキスト
              </label>
              <input
                name="altText"
                maxLength={120}
                placeholder="例: 店内ギャラリー画像"
                disabled={!canEditPublicPage}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
              />
            </div>
            <div className="flex flex-col justify-end">
              <Button type="submit" disabled={!canEditPublicPage}>
                ギャラリー画像を追加
              </Button>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            ギャラリー枚数: {store.galleryImages.length} / 50
          </p>
        </form>

        {store.galleryImages.length === 0 ? (
          <p className="text-sm text-slate-500">まだギャラリー画像が登録されていません。</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {store.galleryImages.map((image, index) => (
              <article
                key={image.id}
                className="rounded-xl border border-slate-200 overflow-hidden"
              >
                <div className="relative bg-slate-100 h-48">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.url}
                    alt={image.altText ?? `${store.name} gallery image`}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="p-4 space-y-3">
                  <p className="text-xs text-slate-500">
                    表示順: {index + 1}
                    {image.altText ? ` / ${image.altText}` : ""}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <form action={moveStoreGalleryImage}>
                      <input type="hidden" name="storeId" value={store.id} />
                      <input type="hidden" name="imageId" value={image.id} />
                      <input type="hidden" name="direction" value="up" />
                      <Button
                        type="submit"
                        size="sm"
                        variant="ghost"
                        disabled={!canEditPublicPage || index === 0}
                      >
                        前へ
                      </Button>
                    </form>

                    <form action={moveStoreGalleryImage}>
                      <input type="hidden" name="storeId" value={store.id} />
                      <input type="hidden" name="imageId" value={image.id} />
                      <input type="hidden" name="direction" value="down" />
                      <Button
                        type="submit"
                        size="sm"
                        variant="ghost"
                        disabled={!canEditPublicPage || index === store.galleryImages.length - 1}
                      >
                        後へ
                      </Button>
                    </form>

                    <form action={deleteStoreGalleryImage}>
                      <input type="hidden" name="storeId" value={store.id} />
                      <input type="hidden" name="imageId" value={image.id} />
                      <Button
                        type="submit"
                        size="sm"
                        variant="danger"
                        disabled={!canEditPublicPage}
                      >
                        削除
                      </Button>
                    </form>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
