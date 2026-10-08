import { ChevronRight, Plus, Search, Users } from "lucide-react";
import Link from "next/link";
import { inputClass } from "@/components/forms/Field";
import { buttonClass } from "@/components/ui/button";
import { CLIENT_FLASH } from "@/lib/clients";
import { cn } from "@/lib/cn";
import { formatPhone } from "@/lib/phone";
import { listClients } from "@/lib/repos";
import { getSession } from "@/lib/session";

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string; ok?: string }> }) {
  const { q = "", ok } = await searchParams;
  const { supabase } = await getSession();
  const clients = await listClients(supabase, q);
  const flash = ok ? CLIENT_FLASH[ok] : undefined;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold sm:text-3xl">Clients</h1>
        <div className="hidden sm:block">
          <Link href="/app/clients/nouveau" className={buttonClass("brand", "sm")}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Ajouter un client
          </Link>
        </div>
      </div>

      {flash && (
        <p role="status" className="rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
          {flash}
        </p>
      )}

      <form role="search" className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          name="q"
          defaultValue={q}
          placeholder="Rechercher par nom ou téléphone"
          aria-label="Rechercher un client"
          className={cn(inputClass, "pl-12")}
        />
      </form>

      {clients.length === 0 ? (
        q ? (
          <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-500">
            Aucun client ne correspond à « {q} ».
          </p>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <Users className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
            <h2 className="mt-2 font-bold">Aucun client pour l’instant</h2>
            <p className="mt-1 text-sm text-slate-500">Ajoutez vos clients une fois, retrouvez-les à chaque facture.</p>
            <Link href="/app/clients/nouveau" className={buttonClass("brand", "md", "mt-4")}>
              Ajouter un client
            </Link>
          </div>
        )
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {clients.map((client) => (
            <li key={client.id}>
              <Link href={`/app/clients/${client.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{client.name}</p>
                  <p className="truncate text-sm text-slate-500">
                    {[formatPhone(client.phone), client.email].filter(Boolean).join(" · ") || "Aucun contact"}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="sm:hidden">
        <Link
          href="/app/clients/nouveau"
          aria-label="Ajouter un client"
          className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#00C853] text-black shadow-lg"
        >
          <Plus className="h-6 w-6" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
