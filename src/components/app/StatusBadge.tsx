// src/components/app/StatusBadge.tsx
import { cn } from "@/lib/cn";
import { STATUS_LABELS, type DisplayStatus } from "@/lib/invoice-status";

const STYLES: Record<DisplayStatus, string> = {
  draft: "bg-slate-100 text-slate-600",
  pending: "bg-amber-100 text-amber-800",
  overdue: "bg-red-100 text-red-700",
  paid: "bg-green-100 text-green-800",
  cancelled: "bg-slate-100 text-slate-500 line-through",
};

export function StatusBadge({ status }: { status: DisplayStatus }) {
  return <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold", STYLES[status])}>{STATUS_LABELS[status]}</span>;
}
