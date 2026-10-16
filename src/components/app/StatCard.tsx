import { AlertCircle, ArrowDownRight, ArrowUpRight, Clock, Wallet } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";

const TONES = {
  green: { icon: Wallet, chip: "bg-green-50 text-green-600" },
  amber: { icon: Clock, chip: "bg-amber-50 text-amber-600" },
  red: { icon: AlertCircle, chip: "bg-red-50 text-red-600" },
};

type Props = {
  label: string;
  amount: string;
  tone: keyof typeof TONES;
  href: string;
  // Évolution en % (encaissé) ou nombre de factures (en attente, en retard).
  change?: number | null;
  count?: number;
};

export function StatCard({ label, amount, tone, href, change, count }: Props) {
  const { icon: Icon, chip } = TONES[tone];
  return (
    <Link
      href={href}
      className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm sm:p-8"
    >
      <span className={cn("flex h-10 w-10 items-center justify-center rounded-full sm:h-12 sm:w-12", chip)}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <p className="mt-4 text-slate-600 sm:mt-12">{label}</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{amount}</p>
        {change !== undefined && change !== null && (
          <span className="flex items-center gap-1 text-sm text-slate-600">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100">
              {change >= 0 ? <ArrowUpRight className="h-3 w-3" aria-hidden="true" /> : <ArrowDownRight className="h-3 w-3" aria-hidden="true" />}
            </span>
            {change >= 0 ? "+" : ""}
            {change} %<span className="sr-only"> par rapport au mois dernier</span>
          </span>
        )}
        {count !== undefined && (
          <span className="text-sm text-slate-500">
            {count} {count > 1 ? "factures" : "facture"}
          </span>
        )}
      </div>
    </Link>
  );
}
