"use client";

import { useActionState, useState } from "react";
import { Star, ChevronDown, ChevronUp } from "lucide-react";
import { submitReview, type ReviewFormState } from "./actions";

const SCORE_CATEGORIES = [
  { name: "scoreOverall", label: "総合評価" },
  { name: "scoreAtmosphere", label: "雰囲気" },
  { name: "scoreStaff", label: "スタッフ" },
  { name: "scoreValue", label: "コスパ" },
  { name: "scoreFacility", label: "設備" },
] as const;

function StarPicker({
  name,
  label,
  value,
  onChange,
}: {
  name: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-slate-600 w-20 shrink-0">{label}</span>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className="p-0.5"
            aria-label={`${label} ${star}点`}
          >
            <Star
              size={22}
              className={
                (hovered || value) >= star
                  ? "fill-orange-400 text-orange-400"
                  : "text-slate-200"
              }
            />
          </button>
        ))}
      </div>
      {value > 0 && (
        <span className="text-xs text-slate-500">{value}/5</span>
      )}
      <input type="hidden" name={name} value={value || ""} />
    </div>
  );
}

interface ReviewFormProps {
  storeId: string;
  isLoggedIn: boolean;
  hasReviewed: boolean;
}

export function ReviewForm({ storeId, isLoggedIn, hasReviewed }: ReviewFormProps) {
  const [state, formAction, isPending] = useActionState<ReviewFormState, FormData>(
    submitReview,
    { status: "idle" }
  );
  const [open, setOpen] = useState(false);
  const [scores, setScores] = useState<Record<string, number>>({});

  if (state.status === "success") {
    return (
      <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
        口コミを投稿しました。ありがとうございます！
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <a
        href={`/auth/login?callbackUrl=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "")}`}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-orange-300 bg-orange-50 text-orange-700 text-sm font-medium hover:bg-orange-100 transition-colors"
      >
        <Star size={15} /> ログインして口コミを書く
      </a>
    );
  }

  if (hasReviewed) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-500 text-xs">
        <Star size={13} className="fill-orange-400 text-orange-400" />
        投稿済みです
      </span>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-orange-300 bg-orange-50 text-orange-700 text-sm font-medium hover:bg-orange-100 transition-colors"
      >
        <Star size={15} /> 口コミを書く
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {open && (
        <form
          action={formAction}
          className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4"
        >
          <input type="hidden" name="storeId" value={storeId} />

          <div className="space-y-3">
            {SCORE_CATEGORIES.map(({ name, label }) => (
              <StarPicker
                key={name}
                name={name}
                label={label}
                value={scores[name] ?? 0}
                onChange={(v) => setScores((prev) => ({ ...prev, [name]: v }))}
              />
            ))}
          </div>

          <div>
            <label className="block text-sm text-slate-600 mb-1">
              コメント <span className="text-slate-400">（任意・2000字以内）</span>
            </label>
            <textarea
              name="comment"
              rows={4}
              maxLength={2000}
              placeholder="訪問した感想をご記入ください"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-y"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-600 mb-1">
              訪問日 <span className="text-slate-400">（任意）</span>
            </label>
            <input
              type="date"
              name="visitDate"
              max={new Date().toISOString().split("T")[0]}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          {state.status === "error" && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
              {state.message}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
            >
              {isPending ? "投稿中..." : "投稿する"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-5 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition-colors"
            >
              キャンセル
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
