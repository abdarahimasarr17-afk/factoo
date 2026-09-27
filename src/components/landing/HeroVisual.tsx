import { BellRing, CheckCircle2 } from "lucide-react";

export function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-sm px-4 py-8 sm:px-8 lg:max-w-md" aria-hidden="true">
      <div className="rounded-3xl bg-white p-6 text-slate-900 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Facture</p>
            <p className="text-lg font-extrabold">FAC-2026-0042</p>
          </div>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">En attente</span>
        </div>
        <p className="mt-4 text-sm text-slate-500">
          Client : <span className="font-semibold text-slate-800">Agence Teranga</span>
        </p>
        <ul className="mt-4 space-y-2 border-y border-slate-100 py-4 text-sm">
          <li className="flex justify-between gap-4">
            <span>Identité visuelle × 1</span>
            <span className="font-semibold">120 000</span>
          </li>
          <li className="flex justify-between gap-4">
            <span>Visuels réseaux sociaux × 2</span>
            <span className="font-semibold">30 000</span>
          </li>
        </ul>
        <div className="mt-4 flex items-baseline justify-between">
          <span className="text-sm font-semibold text-slate-500">Total TTC</span>
          <span className="text-2xl font-extrabold text-[#0F766E]">150 000 FCFA</span>
        </div>
        <div className="mt-5 rounded-full bg-[#0F766E] py-3 text-center font-bold text-white">Payer maintenant</div>
        <p className="mt-3 text-center text-xs text-slate-500">Wave · Orange Money · Carte</p>
      </div>

      <div className="animate-float absolute -top-1 right-0 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-slate-900 shadow-xl">
        <CheckCircle2 className="h-8 w-8 text-[#0F766E]" />
        <div>
          <p className="text-sm font-bold">Payée via Wave</p>
          <p className="text-xs text-slate-500">150 000 FCFA · à l’instant</p>
        </div>
      </div>

      <div className="animate-float absolute -bottom-2 left-0 max-w-[240px] rounded-2xl bg-white px-4 py-3 text-black shadow-xl [animation-delay:1.5s]">
        <p className="flex items-center gap-2 text-xs font-bold">
          <BellRing className="h-4 w-4 text-[#00C853]" /> Relance J+3 envoyée
        </p>
        <p className="mt-1 text-xs">Bonjour, petit rappel pour la facture FAC-2026-0042…</p>
      </div>
    </div>
  );
}
