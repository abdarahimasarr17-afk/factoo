// src/lib/invoice-list.ts
import { displayStatus, type DisplayStatus } from "@/lib/invoice-status";
import type { InvoiceStatus } from "@/lib/invoice-types";
import type { Currency } from "@/lib/site";

export type ListFilter = "toutes" | "brouillons" | "attente" | "retard" | "payees" | "annulees";

export const LIST_FILTERS: { value: ListFilter; label: string }[] = [
  { value: "toutes", label: "Toutes" },
  { value: "brouillons", label: "Brouillons" },
  { value: "attente", label: "En attente" },
  { value: "retard", label: "En retard" },
  { value: "payees", label: "Payées" },
  { value: "annulees", label: "Annulées" },
];

const FILTER_STATUS: Record<Exclude<ListFilter, "toutes">, DisplayStatus> = {
  brouillons: "draft",
  attente: "pending",
  retard: "overdue",
  payees: "paid",
  annulees: "cancelled",
};

export type ListRow = {
  id: string;
  number: string | null;
  status: InvoiceStatus;
  due_date: string | null;
  total: number;
  currency: Currency;
  updated_at: string;
  issued_at: string | null;
  client_name: string | null;
};

const normalize = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function parseListFilter(value: string | undefined): ListFilter {
  return LIST_FILTERS.some((f) => f.value === value) ? (value as ListFilter) : "toutes";
}

export function filterInvoices(rows: ListRow[], filter: ListFilter, q: string, today: string): ListRow[] {
  const term = normalize(q.trim());
  return rows
    .filter((r) => filter === "toutes" || displayStatus(r, today) === FILTER_STATUS[filter])
    .filter((r) => !term || normalize(`${r.number ?? ""} ${r.client_name ?? ""}`).includes(term))
    .sort((a, b) => {
      if ((a.status === "draft") !== (b.status === "draft")) return a.status === "draft" ? -1 : 1;
      const ka = a.status === "draft" ? a.updated_at : (a.issued_at ?? "");
      const kb = b.status === "draft" ? b.updated_at : (b.issued_at ?? "");
      return kb.localeCompare(ka);
    });
}
