"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { PlanBadge } from "@/components/ui/badge";
import {
  BILLING_PERIOD_LABELS,
  formatPrice,
  getPlanPrice,
} from "@/lib/utils";
import { submitUpgradeApplication } from "./actions";

type StoreOption = {
  id: string;
  name: string;
  status: string;
};

type PaidPlan = {
  id: string;
  name: string;
  rank: number;
  price1month: number;
  price3months: number;
  price6months: number;
  price12months: number;
  description: string | null;
};

interface Props {
  stores: StoreOption[];
  plans: PaidPlan[];
}

export function UpgradeForm({ stores, plans }: Props) {
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] = useState({
    storeId: stores[0]?.id ?? "",
    planId: plans[0]?.id ?? "",
    billingPeriod: "ONE_MONTH",
  });

  function update(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit() {
    setError("");
    const fd = new FormData();
    fd.append("storeId", formData.storeId);
    fd.append("planId", formData.planId);
    fd.append("billingPeriod", formData.billingPeriod);

    startTransition(async () => {
      const result = await submitUpgradeApplication(fd);
      if (result?.error) setError(result.error);
    });
  }

  if (stores.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <p className="text-sm text-slate-600">
          有料プランを申請できる店舗がありません。まずは無料掲載の審査申請を完了してください。
        </p>
        <Link href="/store-admin/apply">
          <Button>無料掲載の審査を申請する</Button>
        </Link>
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <p className="text-sm text-slate-600">
          現在申請できる有料プランがありません。しばらくしてからお試しください。
        </p>
      </div>
    );
  }

  const selectedPlan = plans.find((plan) => plan.id === formData.planId) || plans[0];
  const selectedStore =
    stores.find((store) => store.id === formData.storeId) || stores[0];
  const price = getPlanPrice(selectedPlan, formData.billingPeriod);
  const taxIncluded = Math.floor(price * 1.1);

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-800 mb-2">対象店舗</h2>
          <select
            value={formData.storeId}
            onChange={(e) => update("storeId", e.target.value)}
            className="w-full md:w-[28rem] px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}（{store.status === "APPROVED" ? "公開中" : "公開準備中"}）
              </option>
            ))}
          </select>
        </div>

        <div>
          <h2 className="text-lg font-bold text-slate-800 mb-2">有料プラン</h2>
          <p className="text-sm text-slate-600 mb-4">
            有料プランは検索・一覧・イベント枠などの露出を強化する宣伝オプションです。
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <button
                type="button"
                key={plan.id}
                onClick={() => update("planId", plan.id)}
                className={`p-5 rounded-xl border-2 text-left transition-all ${
                  formData.planId === plan.id
                    ? "border-orange-500 bg-orange-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between mb-2 gap-2">
                  <h3 className="font-bold text-slate-800">{plan.name}</h3>
                  <PlanBadge rank={plan.rank} />
                </div>
                <p className="text-2xl font-bold text-slate-800 mb-2">
                  {formatPrice(plan.price1month)}
                  <span className="text-sm font-normal text-slate-500">/月〜</span>
                </p>
                {plan.description && (
                  <p className="text-xs text-slate-500">{plan.description}</p>
                )}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-slate-800 mb-2">契約期間</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {Object.entries(BILLING_PERIOD_LABELS).map(([key, label]) => (
              <button
                type="button"
                key={key}
                onClick={() => update("billingPeriod", key)}
                className={`p-3 rounded-lg border text-sm text-center transition-all ${
                  formData.billingPeriod === key
                    ? "border-orange-500 bg-orange-50 font-medium"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <p>{label}</p>
                <p className="font-bold text-slate-800 mt-1">
                  {formatPrice(getPlanPrice(selectedPlan, key))}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-3">申請内容</h2>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div>
            <dt className="text-slate-500">店舗</dt>
            <dd className="font-medium text-slate-800">{selectedStore.name}</dd>
          </div>
          <div>
            <dt className="text-slate-500">プラン</dt>
            <dd className="font-medium text-slate-800">{selectedPlan.name}</dd>
          </div>
          <div>
            <dt className="text-slate-500">契約期間</dt>
            <dd className="font-medium text-slate-800">
              {BILLING_PERIOD_LABELS[formData.billingPeriod]}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">料金（税抜）</dt>
            <dd className="font-medium text-slate-800">{formatPrice(price)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">料金（税込）</dt>
            <dd className="font-bold text-lg text-orange-600">
              {formatPrice(taxIncluded)}
            </dd>
          </div>
        </dl>

        <p className="text-xs text-slate-500 mt-4">
          ※ 申請後、運営チームが内容を確認します。承認後にお支払いへ進めます。既存の無料掲載はそのまま継続されます。
        </p>

        <div className="mt-4">
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "送信中..." : "有料プランを申請する"}
          </Button>
        </div>
      </div>
    </div>
  );
}
