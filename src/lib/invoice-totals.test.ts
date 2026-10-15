// src/lib/invoice-totals.test.ts
import { describe, expect, it } from "vitest";
import { computeTotals } from "@/lib/invoice-totals";

describe("computeTotals", () => {
  it("sans remise, TVA 18 %", () => {
    expect(computeTotals([{ quantity: 2, unitPrice: 50000 }, { quantity: 1, unitPrice: 25000 }], null, 18)).toEqual({
      lineTotals: [100000, 25000], subtotal: 125000, discountAmount: 0, net: 125000, vatAmount: 22500, total: 147500,
    });
  });
  it("remise en pourcentage", () => {
    const t = computeTotals([{ quantity: 1, unitPrice: 100000 }], { type: "percent", value: 10 }, 18);
    expect(t).toMatchObject({ discountAmount: 10000, net: 90000, vatAmount: 16200, total: 106200 });
  });
  it("remise en montant égale au total", () => {
    const t = computeTotals([{ quantity: 1, unitPrice: 5000 }], { type: "amount", value: 5000 }, 18);
    expect(t).toMatchObject({ net: 0, vatAmount: 0, total: 0 });
  });
  it("TVA 0 % et 19,25 %", () => {
    expect(computeTotals([{ quantity: 1, unitPrice: 10000 }], null, 0).total).toBe(10000);
    expect(computeTotals([{ quantity: 1, unitPrice: 10000 }], null, 19.25).vatAmount).toBe(1925);
  });
  it("quantités décimales arrondies à l’unité mineure (demi vers le haut)", () => {
    expect(computeTotals([{ quantity: 1.5, unitPrice: 333 }], null, 0).lineTotals).toEqual([500]); // 499,5 → 500
    expect(computeTotals([{ quantity: 0.333, unitPrice: 1000 }], null, 0).lineTotals).toEqual([333]);
  });
  it("TVA arrondie une seule fois sur le total", () => {
    // 3 × 333 = 999 ; 18 % = 179,82 → 180
    expect(computeTotals([{ quantity: 1, unitPrice: 333 }, { quantity: 1, unitPrice: 333 }, { quantity: 1, unitPrice: 333 }], null, 18).vatAmount).toBe(180);
  });
  it("aucune ligne", () => {
    expect(computeTotals([], null, 18)).toEqual({ lineTotals: [], subtotal: 0, discountAmount: 0, net: 0, vatAmount: 0, total: 0 });
  });
});
