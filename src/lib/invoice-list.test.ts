// src/lib/invoice-list.test.ts
import { describe, expect, it } from "vitest";
import { filterInvoices, parseListFilter, type ListRow } from "@/lib/invoice-list";

const row = (over: Partial<ListRow>): ListRow => ({
  id: "x", number: null, status: "draft", due_date: null, total: 1000, currency: "XOF",
  updated_at: "2026-10-01T10:00:00Z", issued_at: null, client_name: "Teranga", ...over,
});
const rows: ListRow[] = [
  row({ id: "d1", updated_at: "2026-10-10T10:00:00Z" }),
  row({ id: "d2", updated_at: "2026-10-12T10:00:00Z", client_name: null }),
  row({ id: "p1", status: "issued", number: "FAC-2026-0001", due_date: "2026-10-20", issued_at: "2026-10-01T09:00:00Z", client_name: "Awa Couture" }),
  row({ id: "r1", status: "issued", number: "FAC-2026-0002", due_date: "2026-10-01", issued_at: "2026-10-02T09:00:00Z" }),
  row({ id: "pa", status: "paid", number: "FAC-2026-0003", issued_at: "2026-10-03T09:00:00Z" }),
  row({ id: "c1", status: "cancelled", number: "FAC-2026-0004", issued_at: "2026-10-04T09:00:00Z" }),
];
const ids = (list: ListRow[]) => list.map((r) => r.id);
const today = "2026-10-15";

describe("filterInvoices", () => {
  it("toutes : brouillons récents d’abord, puis émises de la plus récente à la plus ancienne", () => {
    expect(ids(filterInvoices(rows, "toutes", "", today))).toEqual(["d2", "d1", "c1", "pa", "r1", "p1"]);
  });
  it("filtres par statut", () => {
    expect(ids(filterInvoices(rows, "brouillons", "", today))).toEqual(["d2", "d1"]);
    expect(ids(filterInvoices(rows, "attente", "", today))).toEqual(["p1"]);
    expect(ids(filterInvoices(rows, "retard", "", today))).toEqual(["r1"]);
    expect(ids(filterInvoices(rows, "payees", "", today))).toEqual(["pa"]);
    expect(ids(filterInvoices(rows, "annulees", "", today))).toEqual(["c1"]);
  });
  it("recherche sur le numéro et le client, sans tenir compte des accents ni de la casse", () => {
    expect(ids(filterInvoices(rows, "toutes", "0002", today))).toEqual(["r1"]);
    expect(ids(filterInvoices(rows, "toutes", "awa couture", today))).toEqual(["p1"]);
    expect(ids(filterInvoices(rows, "toutes", "TERANGA", today))).toEqual(["d1", "c1", "pa", "r1"]);
  });
});

describe("parseListFilter", () => {
  it("valeur inconnue → toutes", () => {
    expect(parseListFilter("retard")).toBe("retard");
    expect(parseListFilter("n’importe")).toBe("toutes");
    expect(parseListFilter(undefined)).toBe("toutes");
  });
});
