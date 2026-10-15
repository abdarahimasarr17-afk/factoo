import { Building2, ChevronRight, FilePlus2, FileText, UserPlus } from "lucide-react";
import Link from "next/link";
import { RevenueChart } from "@/components/app/RevenueChart";
import { StatCard } from "@/components/app/StatCard";
import { StatusBadge } from "@/components/app/StatusBadge";
import { buttonClass } from "@/components/ui/button";
import { dashboardStats } from "@/lib/dashboard";
import { displayStatus, todayInDakar } from "@/lib/invoice-status";
import { formatMoney } from "@/lib/money";
import { displayName, profileCompletion } from "@/lib/profile";
import { dashboardRows } from "@/lib/repos";
import { getSession } from "@/lib/session";

const card = "flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 font-semibold transition hover:border-[#00C853]";

export default async function DashboardPage() {
  const { supabase, user, profile } = await getSession();
  const completion = profileCompletion(profile);
  const today = todayInDakar();
  const rows = await dashboardRows(supabase);
  const stats = dashboardStats(rows, profile.currency, today);
  const recent = [...rows].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 5);
  const money = (n: number) => formatMoney(n, profile.currency);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">Bonjour {displayName(profile, user.email)} 👋</h1>
          <p className="mt-1 text-slate-500">Voici où en sont vos factures.</p>
        </div>
        <Link href="/app/factures/nouvelle" className={buttonClass("brand", "md")}>
          <FilePlus2 className="h-5 w-5" aria-hidden="true" /> Nouvelle facture
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Encaissé ce mois-ci" amount={money(stats.collected.amount)} count={stats.collected.count} tone="green" href="/app/factures?statut=payees" />
        <StatCard label="En attente" amount={money(stats.pending.amount)} count={stats.pending.count} tone="amber" href="/app/factures?statut=attente" />
        <StatCard label="En retard" amount={money(stats.overdue.amount)} count={stats.overdue.count} tone="red" href="/app/factures?statut=retard" />
      </div>
      {stats.otherCurrencies.length > 0 && <p className="text-xs text-slate-500">Hors factures en {stats.otherCurrencies.join(", ")}.</p>}

      <RevenueChart months={stats.months} currency={profile.currency} />

      <section className="rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between px-5 pt-5">
          <h2 className="font-bold">Dernières factures</h2>
          {rows.length > 0 && <Link href="/app/factures" className="text-sm font-semibold text-[#0F766E]">Voir toutes les factures</Link>}
        </div>
        {recent.length === 0 ? (
          <div className="p-6 text-center">
            <FileText className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
            <p className="mt-2 font-bold">Créez votre première facture en 2 minutes</p>
            <Link href="/app/factures/nouvelle" className={buttonClass("brand", "md", "mt-4")}>Nouvelle facture</Link>
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {recent.map((r) => (
              <li key={r.id}>
                <Link href={`/app/factures/${r.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 truncate font-semibold">{r.number ?? "Brouillon"} <StatusBadge status={displayStatus(r, today)} /></p>
                    <p className="truncate text-sm text-slate-500">{r.client_name ?? "Sans client"}</p>
                  </div>
                  <span className="flex shrink-0 items-center gap-2 font-bold">{formatMoney(r.total, r.currency)}<ChevronRight className="h-5 w-5 text-slate-400" aria-hidden="true" /></span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {completion < 100 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Profil complété</h2>
            <span className="font-bold text-[#007A33]">{completion} %</span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-slate-100" role="progressbar" aria-label="Profil complété" aria-valuenow={completion} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-2 rounded-full bg-[#00C853]" style={{ width: `${completion}%` }} />
          </div>
          <p className="mt-3 text-sm text-slate-500">Ces informations apparaîtront sur vos factures.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Link href="/app/clients/nouveau" className={card}><UserPlus className="h-5 w-5 text-[#007A33]" aria-hidden="true" /> Ajouter un client</Link>
            <Link href="/app/parametres" className={card}><Building2 className="h-5 w-5 text-[#007A33]" aria-hidden="true" /> Compléter mon profil</Link>
          </div>
        </section>
      )}
    </div>
  );
}
