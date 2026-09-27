import { BatteryFull, BellRing, CheckCircle2, CreditCard, Lock, Signal, Wifi } from "lucide-react";
import Image from "next/image";

const PAYMENT_OPTIONS = [
  { name: "Wave", logo: "/logos/wave.png", selected: true },
  { name: "Orange Money", logo: "/logos/orange-money.png", selected: false },
  { name: "Carte bancaire", logo: null, selected: false },
];

// Maquette décorative : téléphone dessiné en HTML/CSS affichant la page de paiement vue par le client.
export function HeroVisual() {
  return (
    <div className="relative mx-auto flex w-full max-w-md justify-center px-4 pb-24 pt-16 sm:py-10" aria-hidden="true">
      <div className="pointer-events-none absolute inset-0 m-auto h-72 w-72 rounded-full bg-[#00C853]/25 blur-3xl" />

      <div className="relative w-[260px] rounded-[2.75rem] bg-[#0b0b0b] p-2.5 shadow-2xl ring-1 ring-white/10 sm:w-[290px]">
        <span className="absolute -left-[3px] top-24 h-10 w-[3px] rounded-l bg-[#1f1f1f]" />
        <span className="absolute -left-[3px] top-36 h-14 w-[3px] rounded-l bg-[#1f1f1f]" />
        <span className="absolute -right-[3px] top-32 h-16 w-[3px] rounded-r bg-[#1f1f1f]" />

        <div className="relative h-[610px] overflow-hidden rounded-[2.25rem] bg-[#F5F7F6] text-slate-900 sm:h-[590px]">
          <span className="absolute left-1/2 top-2.5 h-6 w-24 -translate-x-1/2 rounded-full bg-black" />
          <div className="flex items-center justify-between px-6 pt-3 text-[11px] font-semibold">
            <span>9:41</span>
            <span className="flex items-center gap-1">
              <Signal className="h-3 w-3" />
              <Wifi className="h-3 w-3" />
              <BatteryFull className="h-3.5 w-3.5" />
            </span>
          </div>

          <div className="px-4 pt-6">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#00C853] text-xs font-extrabold text-black">
                AD
              </span>
              <div>
                <p className="text-[10px] text-slate-500">Facture de</p>
                <p className="text-sm font-bold">Studio Awa Design</p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span className="font-semibold">FAC-2026-0042</span>
                <span>Échéance : 30 oct.</span>
              </div>
              <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Montant à payer</p>
              <p className="text-2xl font-extrabold">150 000 FCFA</p>
              <ul className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-[11px]">
                <li className="flex justify-between gap-3">
                  <span>Identité visuelle × 1</span>
                  <span className="whitespace-nowrap font-semibold">120 000</span>
                </li>
                <li className="flex justify-between gap-3">
                  <span>Visuels réseaux sociaux × 2</span>
                  <span className="whitespace-nowrap font-semibold">30 000</span>
                </li>
              </ul>
            </div>

            <p className="mt-4 text-[11px] font-bold">Payer avec</p>
            <ul className="mt-2 space-y-2">
              {PAYMENT_OPTIONS.map((option) => (
                <li
                  key={option.name}
                  className={`flex items-center justify-between rounded-xl border bg-white px-3 py-2.5 text-xs font-semibold ${
                    option.selected ? "border-[#00C853] ring-1 ring-[#00C853]" : "border-slate-200"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    {option.logo ? (
                      <Image src={option.logo} alt="" width={24} height={24} className="h-6 w-6 rounded-md" />
                    ) : (
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#1A1F71]">
                        <CreditCard className="h-3.5 w-3.5 text-white" />
                      </span>
                    )}
                    {option.name}
                  </span>
                  <span
                    className={`h-4 w-4 rounded-full border-2 ${
                      option.selected ? "border-[#00C853] bg-[#00C853] shadow-[inset_0_0_0_2px_white]" : "border-slate-300"
                    }`}
                  />
                </li>
              ))}
            </ul>

            <div className="mt-4 rounded-xl bg-[#00C853] py-3 text-center text-sm font-bold text-black">
              Payer 150 000 FCFA
            </div>
            <p className="mt-3 flex items-center justify-center gap-1 text-[10px] text-slate-500">
              <Lock className="h-3 w-3" /> Paiement sécurisé · Facture créée avec Factoo
            </p>
          </div>
        </div>
      </div>

      <div className="animate-float absolute right-0 top-0 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-slate-900 shadow-xl sm:-right-4 sm:top-16">
        <CheckCircle2 className="h-8 w-8 text-[#00C853]" />
        <div>
          <p className="text-sm font-bold">Payée via Wave</p>
          <p className="text-xs text-slate-500">150 000 FCFA · à l’instant</p>
        </div>
      </div>

      <div className="animate-float absolute bottom-0 left-0 max-w-[230px] sm:bottom-2 rounded-2xl bg-white px-4 py-3 text-black shadow-xl [animation-delay:1.5s] sm:-left-4">
        <p className="flex items-center gap-2 text-xs font-bold">
          <BellRing className="h-4 w-4 text-[#00C853]" /> Relance J+3 envoyée
        </p>
        <p className="mt-1 text-xs">Bonjour, petit rappel pour la facture FAC-2026-0042…</p>
      </div>
    </div>
  );
}
