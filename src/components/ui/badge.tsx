import { cn } from "@/lib/utils";

type BadgeVariant = "platinum" | "premium" | "basic" | "free" | "default" | "success" | "warning" | "danger";

const variants: Record<BadgeVariant, string> = {
  platinum: "bg-amber-100 text-amber-900 border border-amber-300",
  premium:  "bg-slate-200 text-slate-800 border border-slate-400",
  basic:    "bg-stone-200 text-stone-700 border border-stone-300",
  free:     "bg-emerald-100 text-emerald-800 border border-emerald-200",
  default:  "bg-sky-100 text-sky-800 border border-sky-200",
  success:  "bg-emerald-100 text-emerald-800 border border-emerald-200",
  warning:  "bg-orange-100 text-orange-800 border border-orange-200",
  danger:   "bg-red-100 text-red-800 border border-red-200",
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = "default", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function PlanBadge({ rank }: { rank: number }) {
  if (rank >= 3) return <Badge variant="platinum">PLATINUM</Badge>;
  if (rank === 2) return <Badge variant="premium">PREMIUM</Badge>;
  if (rank === 1) return <Badge variant="basic">BASIC</Badge>;
  return <Badge variant="free">FREE</Badge>;
}
