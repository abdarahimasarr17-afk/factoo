// src/lib/dashboard.test.ts
import { describe, expect, it } from "vitest";
import { dashboardStats, type DashboardRow } from "@/lib/dashboard";

const r = (over: Partial<DashboardRow>): DashboardRow => ({ status: "issued", total: 1000, currency: "XOF", due_date: "2026-10-30", paid_at: null, ...over });

describe("dashboardStats", () => {
  const today = "2026-10-15";
  const rows: DashboardRow[] = [
    r({ status: "paid", total: 100000, paid_at: "2026-10-02" }),
    r({ status: "paid", total: 50000, paid_at: "2026-09-30" }),
    r({ status: "paid", total: 70000, paid_at: "2026-04-10" }), // hors des 6 mois
    r({ status: "issued", total: 30000, due_date: "2026-10-15" }), // échéance aujourd'hui : en attente
    r({ status: "issued", total: 20000, due_date: "2026-10-01" }), // en retard
    r({ status: "draft", total: 999 }),
    r({ status: "cancelled", total: 888 }),
    r({ status: "paid", total: 5000, currency: "EUR", paid_at: "2026-10-03" }),
  ];
  const s = dashboardStats(rows, "XOF", today);

  it("encaissé ce mois, en attente, en retard", () => {
    expect(s.collected).toEqual({ amount: 100000, count: 1 });
    expect(s.pending).toEqual({ amount: 30000, count: 1 });
    expect(s.overdue).toEqual({ amount: 20000, count: 1 });
  });
  it("6 derniers mois, mois courant inclus, mois vides à 0", () => {
    expect(s.months.map((m) => m.month)).toEqual(["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"]);
    expect(s.months.map((m) => m.amount)).toEqual([0, 0, 0, 0, 50000, 100000]);
    expect(s.months.map((m) => m.label)).toEqual(["mai", "juin", "juil.", "août", "sept.", "oct."]);
  });
  it("encaissé du mois précédent et évolution", () => {
    expect(s.previousCollected).toBe(50000);
    expect(s.collectedChange).toBe(100); // 100 000 contre 50 000
    expect(dashboardStats([], "XOF", today).collectedChange).toBeNull();
  });
  it("signale les autres devises exclues", () => {
    expect(s.otherCurrencies).toEqual(["EUR"]);
  });
  it("passage d’année", () => {
    expect(dashboardStats([], "XOF", "2026-02-10").months.map((m) => m.month)).toEqual(["2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02"]);
  });
});
