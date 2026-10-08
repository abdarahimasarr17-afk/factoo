import { COUNTRIES } from "@/lib/site";

const DIALS = COUNTRIES.map((c) => c.dial)
  .filter(Boolean)
  .sort((a, b) => b.length - a.length);

export function splitPhone(e164: string | null, fallbackDial = "221"): { countryCode: string; phone: string } {
  if (!e164) return { countryCode: fallbackDial, phone: "" };
  const digits = e164.replace(/^\+/, "");
  const dial = DIALS.find((d) => digits.startsWith(d)) ?? digits.slice(0, 3);
  return { countryCode: dial, phone: digits.slice(dial.length) };
}

export function formatPhone(e164: string | null): string {
  if (!e164) return "";
  const { countryCode, phone } = splitPhone(e164);
  const groups =
    phone.length === 9
      ? [phone.slice(0, 2), phone.slice(2, 5), phone.slice(5, 7), phone.slice(7)]
      : (phone.match(/.{1,2}/g) ?? [phone]);
  return `+${countryCode} ${groups.join(" ")}`;
}
