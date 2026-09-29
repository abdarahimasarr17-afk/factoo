import { Container } from "@/components/ui/Container";

// Trois chiffres de tailles différentes, décalés en cascade (de haut en bas, de gauche à droite).
export function Stats() {
  return (
    <section aria-label="Factoo en chiffres" className="border-y border-[rgba(0,200,83,0.1)] bg-[#061F1A] py-20 text-white">
      <Container>
        <dl className="grid gap-5 sm:grid-cols-12 sm:items-start sm:gap-6">
          <div className="border-l-4 border-[#00C853] pl-5 sm:col-span-5">
            <dt className="sr-only">Temps pour créer une facture</dt>
            <dd className="text-[72px] font-extrabold leading-none tracking-tight">2 min</dd>
            <dd className="mt-2 text-lg text-white/60">pour créer une facture</dd>
          </div>

          <div className="ml-8 border-l-4 border-[#00C853] pl-5 sm:col-span-4 sm:ml-0 sm:mt-6">
            <dt className="sr-only">Nombre de gestes pour payer</dt>
            <dd className="text-5xl font-extrabold leading-none tracking-tight">3 taps</dd>
            <dd className="mt-2 text-white/60">pour que votre client paie</dd>
          </div>

          <div className="ml-16 border-l-4 border-[#00C853] pl-5 sm:col-span-3 sm:ml-0 sm:mt-12">
            <dt className="sr-only">Coût pour votre client</dt>
            <dd className="text-3xl font-extrabold leading-none tracking-tight">0 FCFA</dd>
            <dd className="mt-2 text-sm text-white/60">sans compte client</dd>
          </div>
        </dl>
      </Container>
    </section>
  );
}
