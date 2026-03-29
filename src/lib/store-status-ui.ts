export type StoreStatusBadge = {
  label: string;
  variant: "success" | "warning" | "danger" | "default";
};

const ADMIN_STORE_TABLE: Record<string, StoreStatusBadge> = {
  PENDING: { label: "審査待ち", variant: "warning" },
  AWAITING_PAYMENT: { label: "支払い待ち", variant: "warning" },
  APPROVED: { label: "公開中", variant: "success" },
  SUSPENDED: { label: "停止", variant: "danger" },
  CLOSED: { label: "閉店", variant: "default" },
};

const STORE_OWNER_CARD: Record<string, StoreStatusBadge> = {
  PENDING: { label: "審査待ち", variant: "warning" },
  AWAITING_PAYMENT: { label: "支払い待ち", variant: "warning" },
  APPROVED: { label: "公開中", variant: "success" },
  SUSPENDED: { label: "停止中", variant: "danger" },
  CLOSED: { label: "閉店", variant: "default" },
};

/**
 * AWAITING_PAYMENT は「未払い（有料・掲載レコード未作成）」「決済済み・オーナー公開前」
 * 「無料承認済み・公開前」のいずれでも使う。
 * 有効な掲載（決済済みまたは無料で作成済み）があるときは支払い待ちではなく公開前とみなす。
 */
export function adminStoreTableBadge(
  status: string,
  hasApprovedUnpaidApplication: boolean,
  hasPaidActiveListing: boolean
): StoreStatusBadge {
  if (status === "AWAITING_PAYMENT" && hasPaidActiveListing) {
    return { label: "公開準備完了", variant: "warning" };
  }
  if (status === "PENDING" && hasApprovedUnpaidApplication) {
    return { label: "支払い待ち", variant: "warning" };
  }
  return ADMIN_STORE_TABLE[status] ?? ADMIN_STORE_TABLE.PENDING;
}

export function storeOwnerStoreCardBadge(
  status: string,
  hasApprovedUnpaidApplication: boolean,
  activeListing: unknown | undefined
): StoreStatusBadge {
  if (status === "AWAITING_PAYMENT" && activeListing) {
    return { label: "公開準備完了", variant: "warning" };
  }
  if (status === "PENDING" && hasApprovedUnpaidApplication) {
    return { label: "支払い待ち", variant: "warning" };
  }
  return STORE_OWNER_CARD[status] ?? STORE_OWNER_CARD.PENDING;
}

export function hasApprovedApplicationWithoutListing(
  applications: { status: string; listing: unknown | null }[]
): boolean {
  return applications.some(
    (a) => a.status === "APPROVED" && a.listing == null
  );
}
