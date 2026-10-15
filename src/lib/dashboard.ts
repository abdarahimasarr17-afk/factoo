// src/lib/dashboard.ts
import { displayStatus } from "@/lib/invoice-status";
import type { InvoiceStatus } from "@/lib/invoice-types";
import type { Currency } from "@/lib/site";

export type DashboardRow = { status: InvoiceStatus; total: number; currency: Currency; due_date: string | null; paid_at: string | null };
export type Stat = { amount: number; count: number };
export type MonthBar = { month: string; label: string; amount: number };
export type DashboardStats = { collected: Stat; pending: Stat; overdue: Stat; months: MonthBar[]; otherCurrencies: Currency[] };

const MONTH_LABELS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

function lastMonths(today: string, count: number): string[] {
  const [y, m] = today.split("-").map(Number);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - (count - 1 - i), 1));
    return d.toISOString().slice(0, 7);
  });
}

const add = (s: Stat, amount: number) => {
  s.amount += amount;
  s.count += 1;
};

export function dashboardStats(rows: DashboardRow[], currency: Currency, today: string): DashboardStats {
  const collected = { amount: 0, count: 0 };
  const pending = { amount: 0, count: 0 };
  const overdue = { amount: 0, count: 0 };
  const months = lastMonths(today, 6).map((month) => ({ month, label: MONTH_LABELS[Number(month.slice(5)) - 1], amount: 0 }));
  const others = new Set<Currency>();
  const currentMonth = today.slice(0, 7);

  for (const row of rows) {
    if (row.status === "draft" || row.status === "cancelled") continue;
    if (row.currency !== currency) {
      others.add(row.currency);
      continue;
    }
    const status = displayStatus(row, today);
    if (status === "pending") add(pending, row.total);
    if (status === "overdue") add(overdue, row.total);
    if (status === "paid" && row.paid_at) {
      const month = row.paid_at.slice(0, 7);
      if (month === currentMonth) add(collected, row.total);
      const bar = months.find((b) => b.month === month);
      if (bar) bar.amount += row.total;
    }
  }
  return { collected, pending, overdue, months, otherCurrencies: [...others] };
}
