import Image from "next/image";
import { Container } from "@/components/ui/Container";

// Trois chiffres de tailles différentes, décalés en cascade (de haut en bas, de gauche à droite).
export function Stats() {
  return (
    <section aria-label="Factoo en chiffres" className="py-16">
      <Container>
        <dl className="grid gap-10 sm:grid-cols-12 sm:items-start sm:gap-6">
          <div className="border-l-4 border-[#00C853] pl-5 sm:col-span-5">
            <dt className="sr-only">Temps pour créer une facture</dt>
            <dd className="text-[72px] font-extrabold leading-none tracking-tight text-foreground">2 min</dd>
            <dd className="mt-3 text-lg text-muted">pour créer une facture</dd>
          </div>

          <div className="ml-8 border-l-4 border-[#00C853] pl-5 sm:col-span-4 sm:ml-0 sm:mt-16">
            <dt className="sr-only">Nombre de gestes pour payer</dt>
            <dd className="text-5xl font-extrabold leading-none tracking-tight text-foreground">3 taps</dd>
            <dd className="mt-3 text-muted">pour que votre client paie</dd>
          </div>

          <div className="ml-16 border-l-4 border-[#00C853] pl-5 sm:col-span-3 sm:ml-0 sm:mt-32">
            <dt className="sr-only">Coût pour votre client</dt>
            <dd className="flex items-center gap-3">
              <Image src="/logos/wave.png" alt="" width={36} height={36} className="h-9 w-9 rounded-lg" />
              <span className="text-3xl font-extrabold leading-none tracking-tight text-foreground">0 FCFA</span>
            </dd>
            <dd className="mt-3 text-sm text-muted">sans compte client</dd>
          </div>
        </dl>
      </Container>
    </section>
  );
}
