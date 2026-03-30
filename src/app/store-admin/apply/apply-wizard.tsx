"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { submitApplication } from "./actions";
import { formatPrice } from "@/lib/utils";

type Prefecture = { code: string; name: string };

interface Props {
  prefectures: Prefecture[];
}

const STEPS = ["店舗情報", "確認・送信"] as const;

export function ApplyWizard({ prefectures }: Props) {
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] = useState({
    name: "",
    nameKana: "",
    prefectureCode: "",
    city: "",
    address: "",
    postalCode: "",
    phone: "",
  });

  function update(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  function next() {
    setError("");
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
    setStep(1);
  }

  function prev() {
    setError("");
    setStep(0);
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

  const selectedPref = prefectures.find(
    (p) => p.code === formData.prefectureCode
  );

  return (
    <div>
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

          <p className="text-xs text-slate-500">
            店舗紹介文・SNS・写真などの公開情報は、審査承認後に管理画面から自由に編集できます。
          </p>

          <div className="flex justify-end pt-2">
            <Button onClick={next}>次へ: 確認</Button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
          <h2 className="text-lg font-bold text-slate-800">申請内容の確認</h2>

          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">
                店舗情報
              </h3>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div>
                  <dt className="text-slate-500">店舗名</dt>
                  <dd className="font-medium text-slate-800">{formData.name}</dd>
                </div>
                {formData.nameKana && (
                  <div>
                    <dt className="text-slate-500">店舗名（カナ）</dt>
                    <dd className="font-medium text-slate-800">{formData.nameKana}</dd>
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
                  <dd className="font-medium text-slate-800">{formData.postalCode}</dd>
                </div>
                {formData.phone && (
                  <div>
                    <dt className="text-slate-500">電話番号</dt>
                    <dd className="font-medium text-slate-800">{formData.phone}</dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">
                掲載・審査
              </h3>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div>
                  <dt className="text-slate-500">掲載プラン</dt>
                  <dd className="font-medium text-slate-800">FREE（無料掲載）</dd>
                </div>
                <div>
                  <dt className="text-slate-500">掲載期間</dt>
                  <dd className="font-medium text-slate-800">無期限</dd>
                </div>
                <div>
                  <dt className="text-slate-500">料金（税抜）</dt>
                  <dd className="font-medium text-slate-800">{formatPrice(0)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">料金（税込）</dt>
                  <dd className="font-bold text-lg text-orange-600">{formatPrice(0)}</dd>
                </div>
              </dl>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            ※ この申請は実在確認の審査用です。承認後に無料掲載の準備が完了し、管理画面から公開できます。宣伝用の有料プランは承認後に別画面から申請できます。
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
