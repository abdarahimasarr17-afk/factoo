// src/lib/invoice-status.ts
import type { DueKind, InvoiceStatus } from "@/lib/invoice-types";

// Dakar est en UTC+0 toute l'année : la date UTC est la date locale.
export function todayInDakar(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function dueDateFor(kind: DueKind, from: string, custom: string | null): string | null {
  if (kind === "date") return custom;
  return addDays(from, Number(kind));
}

export function formatDateFr(date: string): string {
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}

export type DisplayStatus = "draft" | "pending" | "overdue" | "paid" | "cancelled";

export const STATUS_LABELS: Record<DisplayStatus, string> = {
  draft: "Brouillon",
  pending: "En attente",
  overdue: "En retard",
  paid: "Payée",
  cancelled: "Annulée",
};

export function displayStatus(inv: { status: InvoiceStatus; due_date: string | null }, today: string): DisplayStatus {
  if (inv.status === "draft") return "draft";
  if (inv.status === "paid") return "paid";
  if (inv.status === "cancelled") return "cancelled";
  return inv.due_date !== null && inv.due_date < today ? "overdue" : "pending";
}
