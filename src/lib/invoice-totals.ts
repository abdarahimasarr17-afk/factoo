// src/lib/invoice-totals.ts
import type { DiscountType } from "@/lib/invoice-types";

export type Discount = { type: DiscountType; value: number } | null;
export type Totals = {
  lineTotals: number[];
  subtotal: number;
  discountAmount: number;
  net: number;
  vatAmount: number;
  total: number;
};

// a × b / d arrondi demi vers le haut, en BigInt pour éviter toute erreur de flottant.
function mulDivRound(a: bigint, b: bigint, d: bigint): bigint {
  return (a * b * 2n + d) / (2n * d);
}

const scaled = (n: number, factor: number) => BigInt(Math.round(n * factor));

export function computeTotals(lines: { quantity: number; unitPrice: number }[], discount: Discount, vatRate: number): Totals {
  const lineTotals = lines.map((l) => Number(mulDivRound(scaled(l.quantity, 1000), BigInt(l.unitPrice), 1000n)));
  const subtotal = lineTotals.reduce((sum, v) => sum + v, 0);
  let discountAmount = 0;
  if (discount?.type === "percent") discountAmount = Number(mulDivRound(BigInt(subtotal), scaled(discount.value, 100), 10000n));
  if (discount?.type === "amount") discountAmount = Math.round(discount.value);
  discountAmount = Math.min(discountAmount, subtotal);
  const net = subtotal - discountAmount;
  const vatAmount = Number(mulDivRound(BigInt(net), scaled(vatRate, 100), 10000n));
  return { lineTotals, subtotal, discountAmount, net, vatAmount, total: net + vatAmount };
}
