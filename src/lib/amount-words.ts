// src/lib/amount-words.ts
import type { Currency } from "@/lib/site";

const UNITS = [
  "zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf",
  "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize",
];
const TENS: Record<number, string> = { 2: "vingt", 3: "trente", 4: "quarante", 5: "cinquante", 6: "soixante" };

// « final » : le groupe n'est pas suivi de « mille » (invariable) → « cents » et « quatre-vingts » prennent un s.
function below100(n: number, final: boolean): string {
  if (n < 17) return UNITS[n];
  if (n < 20) return `dix-${UNITS[n - 10]}`;
  const tens = Math.floor(n / 10);
  const unit = n % 10;
  if (tens === 7) return unit === 1 ? "soixante et onze" : `soixante-${below100(10 + unit, false)}`;
  if (tens === 9) return `quatre-vingt-${below100(10 + unit, false)}`;
  if (tens === 8) return unit === 0 ? (final ? "quatre-vingts" : "quatre-vingt") : `quatre-vingt-${UNITS[unit]}`;
  if (unit === 0) return TENS[tens];
  if (unit === 1) return `${TENS[tens]} et un`;
  return `${TENS[tens]}-${UNITS[unit]}`;
}

function below1000(n: number, final: boolean): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (hundreds === 1) parts.push("cent");
  else if (hundreds > 1) parts.push(`${UNITS[hundreds]} ${rest === 0 && final ? "cents" : "cent"}`);
  if (rest) parts.push(below100(rest, final));
  return parts.join(" ");
}

export function numberToFrench(n: number): string {
  if (n === 0) return "zéro";
  const billions = Math.floor(n / 1e9);
  const millions = Math.floor(n / 1e6) % 1000;
  const thousands = Math.floor(n / 1000) % 1000;
  const rest = n % 1000;
  const parts: string[] = [];
  if (billions) parts.push(`${numberToFrench(billions)} ${billions > 1 ? "milliards" : "milliard"}`);
  if (millions) parts.push(`${below1000(millions, true)} ${millions > 1 ? "millions" : "million"}`);
  if (thousands) parts.push(thousands === 1 ? "mille" : `${below1000(thousands, false)} mille`);
  if (rest) parts.push(below1000(rest, true));
  return parts.join(" ");
}

const exactMillions = (n: number) => n >= 1e6 && n % 1e6 === 0;

export function amountInWords(minor: number, currency: Currency): string {
  if (currency === "EUR") {
    const euros = Math.floor(minor / 100);
    const cents = minor % 100;
    const unit = exactMillions(euros) ? "d’euros" : euros > 1 ? "euros" : "euro";
    let text = `${numberToFrench(euros)} ${unit}`;
    if (cents) text += ` et ${numberToFrench(cents)} ${cents > 1 ? "centimes" : "centime"}`;
    return text;
  }
  const unit = exactMillions(minor) ? "de francs CFA" : minor > 1 ? "francs CFA" : "franc CFA";
  return `${numberToFrench(minor)} ${unit}`;
}
