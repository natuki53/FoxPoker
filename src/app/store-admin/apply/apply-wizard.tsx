"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { PlanBadge } from "@/components/ui/badge";
import { submitApplication } from "./actions";
import {
  formatPrice,
  BILLING_PERIOD_LABELS,
  getPlanPrice,
} from "@/lib/utils";

type Prefecture = { code: string; name: string };
type Plan = {
  id: string;
  name: string;
  rank: number;
  price1month: number;
  price3months: number;
  price6months: number;
  price12months: number;
  description: string | null;
  maxPhotos: number;
};

interface Props {
  prefectures: Prefecture[];
  plans: Plan[];
}

const STEPS = ["店舗情報", "プラン選択", "確認・送信"] as const;

export function ApplyWizard({ prefectures, plans }: Props) {
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const hasSelectablePlans = plans.length > 0;

  const [formData, setFormData] = useState({
    name: "",
    nameKana: "",
    prefectureCode: "",
    city: "",
    address: "",
    postalCode: "",
    phone: "",
    planId: plans[0]?.id ?? "",
    billingPeriod: "ONE_MONTH",
  });

  function update(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  function next() {
    setError("");
    if (step === 0) {
      if (
        !formData.name ||
        !formData.prefectureCode ||
        !formData.city ||
        !formData.address ||
        !formData.postalCode
      ) {
        setError("必須項目を入力してください。");
        return;
      }
    }
    if (step === 1) {
      if (!hasSelectablePlans) {
        setError("現在選択できるプランがありません。管理者にお問い合わせください。");
        return;
      }
      if (!plans.some((plan) => plan.id === formData.planId)) {
        setError("プランを選択してください。");
        return;
      }
    }
    setStep((s) => s + 1);
  }

  function prev() {
    setError("");
    setStep((s) => s - 1);
  }

  function handleSubmit() {
    setError("");
    const fd = new FormData();
    Object.entries(formData).forEach(([k, v]) => fd.append(k, v));

    startTransition(async () => {
      const result = await submitApplication(fd);
      if (result?.error) setError(result.error);
    });
  }

  const selectedPlan = plans.find((p) => p.id === formData.planId);
  const isFreePlan = Boolean(selectedPlan && selectedPlan.price1month === 0);
  const price = selectedPlan
    ? getPlanPrice(selectedPlan, formData.billingPeriod)
    : 0;
  const taxIncluded = Math.floor(price * 1.1);
  const selectedPref = prefectures.find(
    (p) => p.code === formData.prefectureCode
  );

  return (
    <div>
      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step >= i
                  ? "bg-orange-500 text-white"
                  : "bg-slate-200 text-slate-500"
              }`}
            >
              {i + 1}
            </div>
            <span
              className={`text-sm hidden sm:inline ${
                step >= i ? "text-slate-800" : "text-slate-400"
              }`}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div
                className={`w-8 h-0.5 ${
                  step > i ? "bg-orange-500" : "bg-slate-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Step 1: Store Info */}
      {step === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-800">店舗情報</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                店舗名 <span className="text-red-500">*</span>
              </label>
              <input
                value={formData.name}
                onChange={(e) => update("name", e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="ポーカーハウス東京"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                店舗名（カナ）
              </label>
              <input
                value={formData.nameKana}
                onChange={(e) => update("nameKana", e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="ポーカーハウストウキョウ"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                都道府県 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.prefectureCode}
                onChange={(e) => update("prefectureCode", e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                <option value="">選択してください</option>
                {prefectures.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                市区町村 <span className="text-red-500">*</span>
              </label>
              <input
                value={formData.city}
                onChange={(e) => update("city", e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="渋谷区"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                住所 <span className="text-red-500">*</span>
              </label>
              <input
                value={formData.address}
                onChange={(e) => update("address", e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="神南1-2-3 ABCビル5F"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                郵便番号 <span className="text-red-500">*</span>
              </label>
              <input
                value={formData.postalCode}
                onChange={(e) => update("postalCode", e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="150-0041"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                電話番号
              </label>
              <input
                value={formData.phone}
                onChange={(e) => update("phone", e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="03-1234-5678"
              />
            </div>
          </div>
          <p className="text-xs text-slate-500">
            店舗紹介文・SNS・写真などの公開情報は、審査承認後に管理画面から自由に編集できます。
          </p>

          <div className="flex justify-end pt-2">
            <Button onClick={next}>次へ: プラン選択</Button>
          </div>
        </div>
      )}

      {/* Step 2: Plan Selection */}
      {step === 1 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
          <h2 className="text-lg font-bold text-slate-800">プラン選択</h2>
          <p className="text-sm text-slate-600">
            店舗ページの掲載は原則無料です。有料プランは、検索・店舗一覧での上位表示や、トップページのイベント情報（サイドバー等）での紹介など、集客面の露出を強化するオプションです（内容はプランにより異なります）。
          </p>

          {!hasSelectablePlans && (
            <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm p-3 rounded-lg">
              現在選択できるプランがありません。管理者にお問い合わせください。
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {plans.map((plan) => (
              <button
                key={plan.id}
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    planId: plan.id,
                    ...(plan.price1month === 0
                      ? { billingPeriod: "ONE_MONTH" as const }
                      : {}),
                  }))
                }
                className={`p-5 rounded-xl border-2 text-left transition-all ${
                  formData.planId === plan.id
                    ? "border-orange-500 bg-orange-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-slate-800">{plan.name}</h3>
                  <PlanBadge rank={plan.rank} />
                </div>
                <p className="text-2xl font-bold text-slate-800 mb-2">
                  {formatPrice(plan.price1month)}
                  <span className="text-sm font-normal text-slate-500">
                    /月〜
                  </span>
                </p>
                {plan.description && (
                  <p className="text-xs text-slate-500 mb-3">
                    {plan.description}
                  </p>
                )}
                <ul className="text-xs text-slate-600 space-y-1">
                  {plan.price1month === 0 ? (
                    <>
                      <li>店舗ページを無料・無期限で掲載</li>
                      <li>
                        検索上位表示・トップのイベント枠などの強化露出は対象外
                      </li>
                      <li>トーナメント掲載: 非対応</li>
                    </>
                  ) : (
                    <>
                      <li>店舗ページ掲載（無料プラン相当のベースを含む）</li>
                      <li>
                        検索・一覧での優先表示、トップのイベント情報などでの紹介（プランにより範囲が異なります）
                      </li>
                      <li>トーナメント掲載: 対応</li>
                    </>
                  )}
                </ul>
              </button>
            ))}
          </div>

          {isFreePlan ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              無料プランでは掲載期間の指定はありません。審査承認後、無期限で店舗ページを無料掲載できます。
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                契約期間
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.entries(BILLING_PERIOD_LABELS).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => update("billingPeriod", key)}
                    disabled={!selectedPlan}
                    className={`p-3 rounded-lg border text-sm text-center transition-all ${
                      formData.billingPeriod === key
                        ? "border-orange-500 bg-orange-50 font-medium"
                        : "border-slate-200 hover:border-slate-300"
                    } ${
                      !selectedPlan
                        ? "opacity-50 cursor-not-allowed hover:border-slate-200"
                        : ""
                    }`}
                  >
                    <p>{label}</p>
                    {selectedPlan && (
                      <p className="font-bold text-slate-800 mt-1">
                        {formatPrice(getPlanPrice(selectedPlan, key))}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={prev}>
              戻る
            </Button>
            <Button onClick={next} disabled={!hasSelectablePlans}>
              次へ: 確認
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Confirmation */}
      {step === 2 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
          <h2 className="text-lg font-bold text-slate-800">
            申請内容の確認
          </h2>

          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">
                店舗情報
              </h3>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div>
                  <dt className="text-slate-500">店舗名</dt>
                  <dd className="font-medium text-slate-800">
                    {formData.name}
                  </dd>
                </div>
                {formData.nameKana && (
                  <div>
                    <dt className="text-slate-500">店舗名（カナ）</dt>
                    <dd className="font-medium text-slate-800">
                      {formData.nameKana}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-slate-500">所在地</dt>
                  <dd className="font-medium text-slate-800">
                    {selectedPref?.name} {formData.city} {formData.address}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">郵便番号</dt>
                  <dd className="font-medium text-slate-800">
                    {formData.postalCode}
                  </dd>
                </div>
                {formData.phone && (
                  <div>
                    <dt className="text-slate-500">電話番号</dt>
                    <dd className="font-medium text-slate-800">
                      {formData.phone}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">
                プラン・お支払い
              </h3>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div>
                  <dt className="text-slate-500">プラン</dt>
                  <dd className="font-medium text-slate-800">
                    {selectedPlan?.name}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">掲載期間</dt>
                  <dd className="font-medium text-slate-800">
                    {isFreePlan
                      ? "無期限（無料プラン）"
                      : BILLING_PERIOD_LABELS[formData.billingPeriod]}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">料金（税抜）</dt>
                  <dd className="font-medium text-slate-800">
                    {formatPrice(price)}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">料金（税込）</dt>
                  <dd className="font-bold text-lg text-orange-600">
                    {formatPrice(taxIncluded)}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            {price === 0
              ? "※ 申請後、運営チームが審査を行います。無料プランは承認後すぐに掲載準備へ進めます。"
              : "※ 申請後、運営チームが審査を行います。承認後にお支払いリンクをお送りします。"}
          </p>

          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={prev}>
              戻る
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? "送信中..." : "申請を送信する"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
