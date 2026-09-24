import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

const ITEMS = [
  {
    pain: "« Mon client met 3 semaines à me payer »",
    fix: "Votre facture contient un lien de paiement. Votre client paie en 3 taps depuis WhatsApp.",
  },
  {
    pain: "« Je perds du temps à relancer mes clients »",
    fix: "Factoo relance automatiquement par WhatsApp à J+3, J+7 et J+14. Vous n’êtes plus recouvreur.",
  },
  {
    pain: "« Je fais mes factures sur Word, ce n’est pas conforme »",
    fix: "Des PDF conformes SYSCOHADA : numérotation séquentielle, TVA et mentions légales obligatoires.",
  },
];

export function ProblemSolution() {
  return (
    <section className="py-20">
      <Container>
        <SectionHeading eyebrow="Le problème" title="Se faire payer ne devrait pas être un second métier" />
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {ITEMS.map((item) => (
            <div key={item.pain} className="rounded-2xl border border-border bg-card p-6">
              <p className="font-bold text-foreground">{item.pain}</p>
              <div className="my-4 h-px bg-border" />
              <p className="flex gap-2 text-muted">
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                {item.fix}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
