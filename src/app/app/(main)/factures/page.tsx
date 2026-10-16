// src/app/app/(main)/factures/page.tsx
import { ChevronRight, FileText, Plus, Search } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/app/StatusBadge";
import { inputClass } from "@/components/forms/Field";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { filterInvoices, LIST_FILTERS, parseListFilter } from "@/lib/invoice-list";
import { displayStatus, formatDateFr, todayInDakar } from "@/lib/invoice-status";
import { INVOICE_FLASH } from "@/lib/invoices";
import { formatMoney } from "@/lib/money";
import { listInvoiceRows } from "@/lib/repos";
import { getSession } from "@/lib/session";

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ q?: string; statut?: string; ok?: string }> }) {
  const { q = "", statut, ok } = await searchParams;
  const filter = parseListFilter(statut);
  const { supabase } = await getSession();
  const today = todayInDakar();
  const all = await listInvoiceRows(supabase);
  const rows = filterInvoices(all, filter, q, today);
  const flash = ok ? INVOICE_FLASH[ok] : undefined;
  const href = (f: string) => `/app/factures?${new URLSearchParams({ ...(f !== "toutes" && { statut: f }), ...(q && { q }) })}`;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold sm:text-3xl">Factures</h1>
        <Link href="/app/factures/nouvelle" className={buttonClass("brand", "sm", "hidden sm:inline-flex")}>
          <Plus className="h-4 w-4" aria-hidden="true" /> Nouvelle facture
        </Link>
      </div>
      {flash && <p role="status" className="rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-800">{flash}</p>}

      <nav aria-label="Filtrer les factures" className="-mx-4 overflow-x-auto px-4">
        <ul className="flex gap-2">
          {LIST_FILTERS.map((f) => (
            <li key={f.value}>
              <Link href={href(f.value)} aria-current={filter === f.value ? "page" : undefined}
                className={cn("block whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold", filter === f.value ? "bg-[#04201D] text-white" : "bg-white text-slate-600 ring-1 ring-slate-200")}>
                {f.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <form role="search" className="relative">
        {filter !== "toutes" && <input type="hidden" name="statut" value={filter} />}
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input name="q" defaultValue={q} placeholder="Rechercher par numéro ou client" aria-label="Rechercher une facture" className={cn(inputClass, "pl-12")} />
      </form>

      {all.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <FileText className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
          <h2 className="mt-2 font-bold">Aucune facture pour l’instant</h2>
          <Link href="/app/factures/nouvelle" className={buttonClass("brand", "md", "mt-4")}>Créer ma première facture</Link>
        </div>
      ) : rows.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-500">Aucune facture ne correspond.</p>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {rows.map((r) => (
            <li key={r.id}>
              <Link href={`/app/factures/${r.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50">
                <div className="min-w-0">
                  <p className="flex min-w-0 items-center gap-2 font-semibold">
                    <span className="whitespace-nowrap">{r.number ?? "Brouillon"}</span>
                    <span className="hidden shrink-0 sm:inline-flex">
                      <StatusBadge status={displayStatus(r, today)} />
                    </span>
                  </p>
                  <p className="mt-1 flex min-w-0 items-center gap-2 text-sm text-slate-500">
                    <span className="shrink-0 sm:hidden">
                      <StatusBadge status={displayStatus(r, today)} />
                    </span>
                    <span className="truncate">{[r.client_name ?? "Sans client", r.due_date && r.status !== "draft" ? `échéance ${formatDateFr(r.due_date)}` : null].filter(Boolean).join(" · ")}</span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-bold">{formatMoney(r.total, r.currency)}</span>
                  <ChevronRight className="h-5 w-5 text-slate-400" aria-hidden="true" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Link href="/app/factures/nouvelle" aria-label="Nouvelle facture" className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#00C853] text-black shadow-lg sm:hidden">
        <Plus className="h-6 w-6" aria-hidden="true" />
      </Link>
    </div>
  );
}
