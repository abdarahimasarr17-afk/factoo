import { Building2, FileText, UserPlus } from "lucide-react";
import Link from "next/link";
import { displayName, profileCompletion } from "@/lib/profile";
import { getSession } from "@/lib/session";

const card =
  "flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 font-semibold transition hover:border-[#00C853]";

export default async function DashboardPage() {
  const { user, profile } = await getSession();
  const completion = profileCompletion(profile);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold sm:text-3xl">Bonjour {displayName(profile, user.email)} 👋</h1>
        <p className="mt-1 text-slate-500">Bienvenue sur votre espace Factoo.</p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">Profil complété</h2>
          <span className="font-bold text-[#007A33]">{completion} %</span>
        </div>
        <div
          className="mt-3 h-2 rounded-full bg-slate-100"
          role="progressbar"
          aria-label="Profil complété"
          aria-valuenow={completion}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="h-2 rounded-full bg-[#00C853]" style={{ width: `${completion}%` }} />
        </div>
        {completion < 100 && <p className="mt-3 text-sm text-slate-500">Ces informations apparaîtront sur vos factures.</p>}
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/app/clients/nouveau" className={card}>
          <UserPlus className="h-5 w-5 text-[#007A33]" aria-hidden="true" /> Ajouter un client
        </Link>
        <Link href="/app/parametres" className={card}>
          <Building2 className="h-5 w-5 text-[#007A33]" aria-hidden="true" /> Compléter mon profil
        </Link>
      </div>

      <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
        <FileText className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
        <h2 className="mt-2 font-bold">Vos factures arrivent bientôt</h2>
        <p className="mt-1 text-sm text-slate-500">La création de factures sera disponible dans la prochaine mise à jour.</p>
      </section>
    </div>
  );
}
