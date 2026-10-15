import { ArrowDown, ArrowRight, FilePlus2, Send, Wallet } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

const STEPS = [
  {
    icon: FilePlus2,
    title: "Créez la facture",
    text: "Choisissez le client, ajoutez vos prestations : la facture est prête en 2 minutes.",
  },
  {
    icon: Send,
    title: "Envoyez-la sur WhatsApp",
    text: "Un clic ouvre WhatsApp avec le lien de paiement et le résumé de la facture.",
  },
  {
    icon: Wallet,
    title: "Encaissez",
    text: "Votre client paie en 3 taps. La facture passe en « Payée » et vous êtes notifié.",
  },
];

export function HowItWorks() {
  return (
    <section id="comment" className="py-20">
      <Container>
        <SectionHeading title="De la facture au paiement en 3 étapes" />
        <ol className="mt-12 grid gap-8 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, text }, index) => (
            <li key={title} className="relative text-center">
              {index > 0 && (
                <>
                  <ArrowRight
                    className="absolute -left-4 top-7 hidden h-6 w-6 -translate-x-1/2 -translate-y-1/2 text-[#00C853] md:block"
                    aria-hidden="true"
                  />
                  <ArrowDown className="mx-auto -mt-2 mb-4 h-6 w-6 text-[#00C853] md:hidden" aria-hidden="true" />
                </>
              )}
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <p className="mt-4 text-sm font-bold text-primary">Étape {index + 1}</p>
              <h3 className="mt-1 text-lg font-bold text-foreground">{title}</h3>
              <p className="mx-auto mt-2 max-w-xs text-muted">{text}</p>
            </li>
          ))}
        </ol>
        <p className="mt-10 text-center font-semibold text-foreground">Factoo ne détient jamais vos fonds.</p>
      </Container>
    </section>
  );
}
