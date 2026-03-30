import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureMasterPrefectures } from "@/lib/prefectures";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requestStoreInfoEdit } from "./actions";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getRequestStatusLabel(status: "PENDING" | "APPROVED" | "REJECTED") {
  if (status === "PENDING") return { label: "審査中", variant: "warning" as const };
  if (status === "APPROVED") return { label: "承認済み", variant: "success" as const };
  return { label: "却下", variant: "danger" as const };
}

export default async function StoreInfoEditPage({ params, searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login?callbackUrl=/store-admin");
  }

  const [{ id }, query] = await Promise.all([params, searchParams]);
  const saved = typeof query.saved === "string";
  const error = typeof query.error === "string" ? query.error : undefined;

  await ensureMasterPrefectures();
  const [store, prefectures] = await Promise.all([
    prisma.store.findFirst({
      where: { id, ownerUserId: session.user.id },
      include: {
        prefecture: true,
        infoEditRequests: {
          orderBy: { createdAt: "desc" },
          take: 5,
          include: {
            prefecture: true,
            reviewer: { select: { displayName: true } },
          },
        },
      },
    }),
    prisma.prefecture.findMany({ orderBy: { code: "asc" } }),
  ]);

  if (!store) {
    redirect("/store-admin");
  }

  const pendingRequest = store.infoEditRequests.find((request) => request.status === "PENDING");
  const latestRequest = store.infoEditRequests[0];

  const initialValues = {
    name: pendingRequest?.name ?? store.name,
    nameKana: pendingRequest?.nameKana ?? store.nameKana ?? "",
    prefectureCode: pendingRequest?.prefectureCode ?? store.prefectureCode,
    city: pendingRequest?.city ?? store.city,
    address: pendingRequest?.address ?? store.address,
    postalCode: pendingRequest?.postalCode ?? store.postalCode,
    phone: pendingRequest?.phone ?? store.phone ?? "",
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-rose-700 tracking-wide mb-1">STORE VERIFIED INFO</p>
          <h1 className="text-2xl font-bold text-slate-800">承認対象の基本情報: {store.name}</h1>
          <p className="text-sm text-slate-500 mt-1">
            店舗名・住所・電話番号など、実在確認に使う基本情報の変更は承認制です。
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/store-admin/stores/${store.id}`}>
            <Button variant="outline" size="sm">公開ページ情報編集へ</Button>
          </Link>
          <Link href="/store-admin">
            <Button variant="outline" size="sm">ダッシュボードへ</Button>
          </Link>
        </div>
      </div>

      {saved && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm px-4 py-3">
          基本情報の変更申請を送信しました。管理者承認後に反映されます。
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3">
          {error}
        </div>
      )}

      <section className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">現在の承認済み情報</h2>
          <p className="text-xs text-slate-500 mt-1">
            公開ページの紹介文・SNS・写真は別画面で自由に編集できます。ここは実在確認情報専用です。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-500">店舗名</p>
            <p className="text-slate-800 font-medium">{store.name}</p>
          </div>
          <div>
            <p className="text-slate-500">店舗名（カナ）</p>
            <p className="text-slate-800 font-medium">{store.nameKana || "-"}</p>
          </div>
          <div>
            <p className="text-slate-500">所在地</p>
            <p className="text-slate-800 font-medium">
              {store.prefecture.name} {store.city} {store.address}
            </p>
          </div>
          <div>
            <p className="text-slate-500">郵便番号</p>
            <p className="text-slate-800 font-medium">{store.postalCode}</p>
          </div>
          <div>
            <p className="text-slate-500">電話番号</p>
            <p className="text-slate-800 font-medium">{store.phone || "-"}</p>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4 gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">基本情報の変更申請</h2>
            <p className="text-xs text-slate-500 mt-1">申請後は管理者承認まで内容がロックされます。</p>
          </div>
          {pendingRequest && <Badge variant="warning">審査中の申請あり</Badge>}
        </div>

        <form action={requestStoreInfoEdit} className="space-y-4">
          <input type="hidden" name="storeId" value={store.id} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">店舗名</label>
              <input
                name="name"
                defaultValue={initialValues.name}
                disabled={Boolean(pendingRequest)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">店舗名（カナ）</label>
              <input
                name="nameKana"
                defaultValue={initialValues.nameKana}
                disabled={Boolean(pendingRequest)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 disabled:bg-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">都道府県</label>
              <select
                name="prefectureCode"
                defaultValue={initialValues.prefectureCode}
                disabled={Boolean(pendingRequest)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 disabled:bg-slate-100"
              >
                {prefectures.map((prefecture) => (
                  <option key={prefecture.code} value={prefecture.code}>
                    {prefecture.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">市区町村</label>
              <input
                name="city"
                defaultValue={initialValues.city}
                disabled={Boolean(pendingRequest)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 disabled:bg-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">住所</label>
              <input
                name="address"
                defaultValue={initialValues.address}
                disabled={Boolean(pendingRequest)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">郵便番号</label>
              <input
                name="postalCode"
                defaultValue={initialValues.postalCode}
                disabled={Boolean(pendingRequest)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 disabled:bg-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">電話番号</label>
            <input
              name="phone"
              defaultValue={initialValues.phone}
              disabled={Boolean(pendingRequest)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 disabled:bg-slate-100"
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={Boolean(pendingRequest)}>
              変更申請を送信する
            </Button>
          </div>
        </form>
      </section>

      {latestRequest && (
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-3">直近の申請ステータス</h2>
          <div className="flex items-center gap-3 mb-2">
            <Badge variant={getRequestStatusLabel(latestRequest.status).variant}>
              {getRequestStatusLabel(latestRequest.status).label}
            </Badge>
            <p className="text-xs text-slate-500">申請日時: {formatDateTime(latestRequest.createdAt)}</p>
          </div>
          {latestRequest.reviewedAt && (
            <p className="text-xs text-slate-500 mb-1">審査日時: {formatDateTime(latestRequest.reviewedAt)}</p>
          )}
          {latestRequest.reviewer && (
            <p className="text-xs text-slate-500 mb-1">審査者: {latestRequest.reviewer.displayName}</p>
          )}
          {latestRequest.status === "REJECTED" && latestRequest.rejectionReason && (
            <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3 mt-3">
              却下理由: {latestRequest.rejectionReason}
            </div>
          )}
        </section>
      )}
    </div>
  );
}