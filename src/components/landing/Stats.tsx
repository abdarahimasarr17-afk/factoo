import { Container } from "@/components/ui/Container";

// Trois chiffres de même taille, alignés sur une même ligne de base.
export function Stats() {
  return (
    <section aria-label="Factoo en chiffres" className="border-y border-[rgba(0,200,83,0.1)] bg-[#061F1A] py-20 text-white">
      <Container>
        <dl className="grid gap-8 sm:grid-cols-3 sm:gap-6">
          <div className="border-l-4 border-[#00C853] pl-5">
            <dt className="sr-only">Temps pour créer une facture</dt>
            <dd className="text-5xl font-extrabold leading-none tracking-tight sm:text-6xl">2 min</dd>
            <dd className="mt-2 text-white/60">pour créer une facture</dd>
          </div>

          <div className="border-l-4 border-[#00C853] pl-5">
            <dt className="sr-only">Nombre de gestes pour payer</dt>
            <dd className="text-5xl font-extrabold leading-none tracking-tight sm:text-6xl">3 taps</dd>
            <dd className="mt-2 text-white/60">pour que votre client paie</dd>
          </div>

          <div className="border-l-4 border-[#00C853] pl-5">
            <dt className="sr-only">Coût pour votre client</dt>
            <dd className="text-5xl font-extrabold leading-none tracking-tight sm:text-6xl">0 FCFA</dd>
            <dd className="mt-2 text-white/60">sans compte client</dd>
          </div>
        </dl>
      </Container>
    </section>
  );
}
