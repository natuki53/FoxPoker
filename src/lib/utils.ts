import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

const NO_EXPIRY_LISTING_END_AT_ISO = "9999-12-31T23:59:59.999Z";

export function calcListingEndsAt(
  startsAt: Date,
  period: string,
  isFreePlan = false
): Date {
  if (isFreePlan) {
    return new Date(NO_EXPIRY_LISTING_END_AT_ISO);
  }

  const date = new Date(startsAt);
  switch (period) {
    case "ONE_MONTH":
      date.setMonth(date.getMonth() + 1);
      break;
    case "THREE_MONTHS":
      date.setMonth(date.getMonth() + 3);
      break;
    case "SIX_MONTHS":
      date.setMonth(date.getMonth() + 6);
      break;
    case "TWELVE_MONTHS":
      date.setFullYear(date.getFullYear() + 1);
      break;
  }
  return date;
}

export function getPlanPrice(
  plan: { price1month: number; price3months: number; price6months: number; price12months: number },
  period: string
): number {
  switch (period) {
    case "ONE_MONTH":
      return plan.price1month;
    case "THREE_MONTHS":
      return plan.price3months;
    case "SIX_MONTHS":
      return plan.price6months;
    case "TWELVE_MONTHS":
      return plan.price12months;
    default:
      return plan.price1month;
  }
}

export const BILLING_PERIOD_LABELS: Record<string, string> = {
  ONE_MONTH: "1ヶ月",
  THREE_MONTHS: "3ヶ月（5%割引）",
  SIX_MONTHS: "6ヶ月（10%割引）",
  TWELVE_MONTHS: "12ヶ月（15%割引）",
};

export function getBillingPeriodLabel(period: string, price: number): string {
  if (price === 0) {
    return "無期限（無料プラン）";
  }
  return BILLING_PERIOD_LABELS[period] || period;
}

export const DAY_OF_WEEK_LABELS = ["日", "月", "火", "水", "木", "金", "土"];
