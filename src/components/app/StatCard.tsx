// src/components/app/StatCard.tsx
import Link from "next/link";
import { cn } from "@/lib/cn";

type Props = { label: string; amount: string; count: number; tone: "green" | "amber" | "red"; href: string };

const TONES = { green: "text-green-700", amber: "text-amber-700", red: "text-red-700" };

export function StatCard({ label, amount, count, tone, href }: Props) {
  return (
    <Link href={href} className={cn("rounded-2xl border bg-white p-5 transition hover:border-[#0F766E]", tone === "red" && count > 0 ? "border-red-200" : "border-slate-200")}>
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className={cn("mt-1 text-2xl font-extrabold", TONES[tone])}>{amount}</p>
      <p className="text-sm text-slate-500">{count} {count > 1 ? "factures" : "facture"}</p>
    </Link>
  );
}
