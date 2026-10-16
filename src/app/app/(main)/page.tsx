import { ChevronRight, Plus, Search } from "lucide-react";
import Link from "next/link";
import { RevenueChart } from "@/components/app/RevenueChart";
import { StatCard } from "@/components/app/StatCard";
import { StatusBadge } from "@/components/app/StatusBadge";
import { inputClass } from "@/components/forms/Field";
import { cn } from "@/lib/cn";
import { dashboardStats } from "@/lib/dashboard";
import { displayStatus, formatDateFr, todayInDakar } from "@/lib/invoice-status";
import { formatMoney } from "@/lib/money";
import { profileCompletion } from "@/lib/profile";
import { dashboardRows } from "@/lib/repos";
import { getSession } from "@/lib/session";

const darkButton =
  "inline-flex h-11 items-center justify-center gap-2 rounded-md bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800";
const lightButton =
  "inline-flex h-11 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50";

function todayLabel(): string {
  const text = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Africa/Dakar" }).format(new Date());
  return `Nous sommes ${text}`;
}

export default async function DashboardPage() {
  const { supabase, profile } = await getSession();
  const completion = profileCompletion(profile);
  const today = todayInDakar();
  const rows = await dashboardRows(supabase);
  const stats = dashboardStats(rows, profile.currency, today);
  const recent = [...rows].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 5);
  const money = (n: number) => formatMoney(n, profile.currency);

  return (
    <div className="space-y-12">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm text-slate-600 first-letter:uppercase">{todayLabel()}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Tableau de bord</h1>
        </div>
        <form action="/app/factures" role="search" className="relative w-full md:w-80">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            name="q"
            placeholder="Rechercher une facture, un client…"
            aria-label="Rechercher une facture ou un client"
            className={cn(inputClass, "rounded-md pl-11 text-sm")}
          />
        </form>
      </div>

      <section className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Votre vue d’ensemble</h2>
            <p className="mt-1 text-slate-500">Chiffres du mois en cours</p>
          </div>
          {stats.otherCurrencies.length > 0 && <p className="text-xs text-slate-500">Hors factures en {stats.otherCurrencies.join(", ")}.</p>}
        </div>
        <div className="grid gap-4 md:grid-cols-3 md:gap-6">
          <StatCard label="Encaissé ce mois-ci" amount={money(stats.collected.amount)} change={stats.collectedChange} tone="green" href="/app/factures?statut=payees" />
          <StatCard label="En attente" amount={money(stats.pending.amount)} count={stats.pending.count} tone="amber" href="/app/factures?statut=attente" />
          <StatCard label="En retard" amount={money(stats.overdue.amount)} count={stats.overdue.count} tone="red" href="/app/factures?statut=retard" />
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Dernières factures</h2>
            <p className="mt-1 text-slate-500">Les 5 plus récentes</p>
          </div>
          <div className="flex gap-3">
            <Link href="/app/factures/nouvelle" className={darkButton}>
              <Plus className="h-4 w-4" aria-hidden="true" /> Nouvelle facture
            </Link>
            {rows.length > 0 && (
              <Link href="/app/factures" className={lightButton}>
                Voir tout
              </Link>
            )}
          </div>
        </div>

        {recent.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="font-semibold">Créez votre première facture en 2 minutes</p>
            <p className="mt-1 text-sm text-slate-500">Elle apparaîtra ici avec son statut.</p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white md:block">
              <table className="w-full text-left">
                <thead className="border-b border-slate-200 bg-slate-50/60 text-sm text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-medium">Numéro</th>
                    <th className="px-6 py-4 font-medium">Client</th>
                    <th className="px-6 py-4 font-medium">Échéance</th>
                    <th className="px-6 py-4 text-right font-medium">Montant</th>
                    <th className="px-6 py-4 font-medium">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recent.map((r) => (
                    <tr key={r.id} className="relative hover:bg-slate-50">
                      <td className="px-6 py-5 font-medium">
                        <Link href={`/app/factures/${r.id}`} className="after:absolute after:inset-0">
                          {r.number ?? "Brouillon"}
                        </Link>
                      </td>
                      <td className="max-w-56 truncate px-6 py-5">{r.client_name ?? "Sans client"}</td>
                      <td className="px-6 py-5 text-slate-600">{r.due_date && r.status !== "draft" ? formatDateFr(r.due_date) : "—"}</td>
                      <td className="whitespace-nowrap px-6 py-5 text-right font-medium">{formatMoney(r.total, r.currency)}</td>
                      <td className="px-6 py-5">
                        <StatusBadge status={displayStatus(r, today)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white md:hidden">
              {recent.map((r) => (
                <li key={r.id}>
                  <Link href={`/app/factures/${r.id}`} className="flex items-center justify-between gap-3 px-4 py-4 hover:bg-slate-50">
                    <div className="min-w-0">
                      <p className="whitespace-nowrap font-medium">{r.number ?? "Brouillon"}</p>
                      <p className="mt-1 flex min-w-0 items-center gap-2 text-sm text-slate-500">
                        <span className="shrink-0">
                          <StatusBadge status={displayStatus(r, today)} />
                        </span>
                        <span className="truncate">{r.client_name ?? "Sans client"}</span>
                      </p>
                    </div>
                    <span className="flex shrink-0 items-center gap-2 font-medium">
                      {formatMoney(r.total, r.currency)}
                      <ChevronRight className="h-5 w-5 text-slate-400" aria-hidden="true" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <RevenueChart months={stats.months} currency={profile.currency} />

      {completion < 100 && (
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Profil complété</h2>
            <span className="font-semibold text-[#007A33]">{completion} %</span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-slate-100" role="progressbar" aria-label="Profil complété" aria-valuenow={completion} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-2 rounded-full bg-[#00C853]" style={{ width: `${completion}%` }} />
          </div>
          <p className="mt-3 text-sm text-slate-500">
            Ces informations apparaîtront sur vos factures.{" "}
            <Link href="/app/parametres" className="font-semibold text-slate-900 underline underline-offset-4">
              Compléter mon profil
            </Link>
          </p>
        </section>
      )}
    </div>
  );
}
