// src/lib/money.ts
import type { Currency } from "@/lib/site";

const NB = " ";
export const MINOR_FACTOR: Record<Currency, number> = { XOF: 1, XAF: 1, EUR: 100 };
export const MAX_TOTAL = 1e15;

const SYMBOL: Record<Currency, string> = { XOF: "FCFA", XAF: "FCFA", EUR: "€" };

function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, NB);
}

// "1 250,50" → unité mineure ; null si invalide (négatif, texte, trop de décimales).
export function parseAmount(input: string, currency: Currency): number | null {
  const cleaned = input.replace(/[\s  ]/g, "").replace(",", ".");
  const decimals = currency === "EUR" ? 2 : 0;
  const pattern = decimals ? /^\d+(\.\d{1,2})?$/ : /^\d+$/;
  if (!pattern.test(cleaned)) return null;
  const [whole, fraction = ""] = cleaned.split(".");
  const minor = Number(whole) * MINOR_FACTOR[currency] + Number(fraction.padEnd(decimals, "0") || 0);
  return Number.isSafeInteger(minor) ? minor : null;
}

export function minorToInput(minor: number, currency: Currency): string {
  if (currency !== "EUR") return String(minor);
  const whole = Math.floor(minor / 100);
  const cents = minor % 100;
  return cents ? `${whole},${String(cents).padStart(2, "0")}` : String(whole);
}

export function formatMoney(minor: number, currency: Currency): string {
  const negative = minor < 0;
  const abs = Math.abs(minor);
  let text: string;
  if (currency === "EUR") {
    text = `${groupThousands(String(Math.floor(abs / 100)))},${String(abs % 100).padStart(2, "0")}`;
  } else {
    text = groupThousands(String(abs));
  }
  return `${negative ? "-" : ""}${text}${NB}${SYMBOL[currency]}`;
}

export function formatCompact(minor: number, currency: Currency): string {
  const value = minor / MINOR_FACTOR[currency];
  const fmt = (n: number) => n.toFixed(1).replace(/\.0$/, "").replace(".", ",");
  if (value >= 1e9) return `${fmt(value / 1e9)} Md`;
  if (value >= 1e6) return `${fmt(value / 1e6)} M`;
  if (value >= 1e3) return `${fmt(value / 1e3)} k`;
  return String(Math.round(value));
}
