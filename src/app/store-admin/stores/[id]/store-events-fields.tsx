"use client";

import { useCallback, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const MAX_EVENT_ROWS = 40;

export type StoreEventFormSeed = {
  id: string;
  title: string;
  schedule: string | null;
  description: string | null;
  linkLabel: string | null;
  linkUrl: string | null;
  isActive: boolean;
};

type RowModel = {
  key: string;
  id: string | null;
  seed: {
    title: string;
    schedule: string;
    description: string;
    linkLabel: string;
    linkUrl: string;
    isActive: boolean;
  };
};

function emptySeed(): RowModel["seed"] {
  return {
    title: "",
    schedule: "",
    description: "",
    linkLabel: "",
    linkUrl: "",
    isActive: true,
  };
}

function seedFromEvent(e: StoreEventFormSeed): RowModel["seed"] {
  return {
    title: e.title,
    schedule: e.schedule ?? "",
    description: e.description ?? "",
    linkLabel: e.linkLabel ?? "",
    linkUrl: e.linkUrl ?? "",
    isActive: e.isActive,
  };
}

function newRowKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `new-${crypto.randomUUID()}`;
  }
  return `new-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function StoreEventsFields({
  initialEvents,
  disabled,
}: {
  initialEvents: StoreEventFormSeed[];
  disabled: boolean;
}) {
  const [state, setState] = useState(() => ({
    rows: initialEvents.map((e) => ({
      key: e.id,
      id: e.id,
      seed: seedFromEvent(e),
    })) as RowModel[],
    deletedIds: [] as string[],
  }));

  const { rows, deletedIds } = state;

  const addRow = useCallback(() => {
    setState((prev) => {
      if (prev.rows.length >= MAX_EVENT_ROWS) return prev;
      return {
        ...prev,
        rows: [...prev.rows, { key: newRowKey(), id: null, seed: emptySeed() }],
      };
    });
  }, []);

  const removeRow = useCallback((key: string) => {
    setState((prev) => {
      const row = prev.rows.find((r) => r.key === key);
      if (!row) return prev;
      const nextRows = prev.rows.filter((r) => r.key !== key);
      if (!row.id) {
        return { ...prev, rows: nextRows };
      }
      if (prev.deletedIds.includes(row.id)) {
        return { ...prev, rows: nextRows };
      }
      return { rows: nextRows, deletedIds: [...prev.deletedIds, row.id] };
    });
  }, []);

  const canAdd = rows.length < MAX_EVENT_ROWS;

  return (
    <>
      <input type="hidden" name="eventRowCount" value={String(rows.length)} />
      {deletedIds.map((id) => (
        <input type="hidden" name="deletedEventIds" value={id} key={id} />
      ))}

      <p className="text-xs text-slate-500 mb-3">
        ＋ボタンでイベントを追加できます。削除アイコンで一覧から外します（保存で反映）。イベント名を空のまま保存した既存行は削除されます。
      </p>

      <div className="space-y-3">
        {rows.length === 0 ? (
          <p className="text-xs text-slate-500 rounded-lg border border-dashed border-slate-300 bg-white/60 px-3 py-4 text-center">
            まだイベントがありません。＋から追加してください。
          </p>
        ) : null}

        {rows.map((row, index) => (
          <div
            key={row.key}
            className="rounded-lg border border-slate-200 bg-white p-3 space-y-3"
          >
            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-slate-500 hover:text-rose-700"
                onClick={() => removeRow(row.key)}
                disabled={disabled}
                aria-label="このイベントを削除"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <input type="hidden" name={`eventId_${index}`} value={row.id ?? ""} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">イベント名</label>
                <input
                  name={`eventTitle_${index}`}
                  defaultValue={row.seed.title}
                  placeholder="例: 毎週金曜ディープスタック"
                  disabled={disabled}
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  日時ラベル（自由入力）
                </label>
                <input
                  name={`eventSchedule_${index}`}
                  defaultValue={row.seed.schedule}
                  placeholder="例: 毎週金曜 19:00 / 4月29日(水祝)"
                  disabled={disabled}
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-1">
                内容説明（自由入力）
              </label>
              <textarea
                name={`eventDescription_${index}`}
                rows={3}
                defaultValue={row.seed.description}
                placeholder="構成・参加条件・特典など、自由に記載できます。"
                disabled={disabled}
                className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm resize-y"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  外部リンク表示名（任意）
                </label>
                <input
                  name={`eventLinkLabel_${index}`}
                  defaultValue={row.seed.linkLabel}
                  placeholder="例: 参加申込はこちら"
                  disabled={disabled}
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  外部リンクURL（任意）
                </label>
                <input
                  name={`eventLinkUrl_${index}`}
                  defaultValue={row.seed.linkUrl}
                  placeholder="https://example.com/event"
                  disabled={disabled}
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                />
              </div>
            </div>

            <label className="inline-flex items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                name={`eventIsActive_${index}`}
                defaultChecked={row.seed.isActive}
                disabled={disabled}
              />
              公開ページに表示する
            </label>
          </div>
        ))}
      </div>

      <div className="mt-3 flex justify-start">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={addRow}
          disabled={disabled || !canAdd}
        >
          <Plus className="h-4 w-4" />
          イベントを追加
        </Button>
        {!canAdd ? (
          <span className="ml-3 self-center text-xs text-slate-500">
            最大{MAX_EVENT_ROWS}件までです。
          </span>
        ) : null}
      </div>
    </>
  );
}
