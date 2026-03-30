"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { deleteStoreTournaments } from "./actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatPrice } from "@/lib/utils";

const TOURNAMENT_STATUS_LABELS = {
  SCHEDULED: "開催予定",
  ONGOING: "開催中",
  COMPLETED: "終了",
  CANCELLED: "中止",
} as const;

const TOURNAMENT_STATUS_BADGE_VARIANTS = {
  SCHEDULED: "warning",
  ONGOING: "success",
  COMPLETED: "default",
  CANCELLED: "danger",
} as const;

export type RegisteredTournamentRow = {
  id: string;
  title: string;
  startsAt: Date | string;
  gameTypeName: string;
  buyinAmount: number;
  status: keyof typeof TOURNAMENT_STATUS_LABELS;
};

type RowModel = RegisteredTournamentRow;

export function RegisteredTournamentsEditor({
  storeId,
  tournaments,
  disabled,
}: {
  storeId: string;
  tournaments: RegisteredTournamentRow[];
  disabled: boolean;
}) {
  const [rows, setRows] = useState<RowModel[]>(() => tournaments);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);

  const removeRow = useCallback((id: string) => {
    setRows((prev) => prev.filter((t) => t.id !== id));
    setDeletedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  return (
    <form action={deleteStoreTournaments} className="space-y-4" data-dirty-track="true">
      <input type="hidden" name="storeId" value={storeId} />
      <input type="hidden" name="tab" value="tournaments" />
      {deletedIds.map((id) => (
        <input type="hidden" name="deletedTournamentIds" value={id} key={id} />
      ))}

      <p className="text-xs text-slate-500">
        ゴミ箱アイコンで一覧から外します（「削除を保存」で反映）。新規作成は上のフォームから行います。
      </p>

      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">まだトーナメントは登録されていません。</p>
      ) : (
        <div className="space-y-2">
          {rows.map((tournament) => (
            <div
              key={tournament.id}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800">{tournament.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {formatDateTime(tournament.startsAt)} / {tournament.gameTypeName} / BI{" "}
                    {formatPrice(tournament.buyinAmount)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={TOURNAMENT_STATUS_BADGE_VARIANTS[tournament.status]}>
                    {TOURNAMENT_STATUS_LABELS[tournament.status]}
                  </Badge>
                  <Link href={`/tournament/${tournament.id}`} target="_blank">
                    <Button type="button" size="sm" variant="outline">
                      公開ページ
                    </Button>
                  </Link>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-slate-500 hover:text-rose-700"
                    onClick={() => removeRow(tournament.id)}
                    disabled={disabled}
                    aria-label="このトーナメントを一覧から外す"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {deletedIds.length > 0 ? (
        <div className="flex justify-end">
          <Button type="submit" disabled={disabled} size="sm">
            削除を保存
          </Button>
        </div>
      ) : null}
    </form>
  );
}
