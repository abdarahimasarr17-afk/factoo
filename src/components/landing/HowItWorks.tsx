import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

const STEPS = [
  {
    title: "Créez la facture",
    text: "Choisissez le client, ajoutez vos prestations : la facture est prête en 2 minutes.",
  },
  {
    title: "Envoyez-la sur WhatsApp",
    text: "Un clic ouvre WhatsApp avec le lien de paiement et le résumé de la facture.",
  },
  {
    title: "Encaissez",
    text: "Votre client paie en 3 taps. La facture passe en « Payée » et vous êtes notifié.",
  },
];

export function HowItWorks() {
  return (
    <section id="comment" className="py-20">
      <Container>
        <SectionHeading title="De la facture au paiement en 3 étapes" />
        <ol className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
          {STEPS.map(({ title, text }, index) => (
            <li key={title} className="relative text-center">
              {/* Fine ligne qui relie les numéros, de gauche à droite (ordinateur). */}
              {index < STEPS.length - 1 && (
                <span
                  aria-hidden="true"
                  className="absolute left-[calc(50%+3.5rem)] right-[calc(-50%+1.5rem)] top-8 hidden h-px bg-[#00C853]/40 md:block"
                />
              )}
              <span className="block text-6xl font-extrabold leading-none tracking-tight text-[#00C853]">
                <span className="sr-only">Étape </span>
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-5 text-lg font-bold text-foreground">{title}</h3>
              <p className="mx-auto mt-2 max-w-xs text-muted">{text}</p>
            </li>
          ))}
        </ol>
        <p className="mt-10 text-center font-semibold text-foreground">Factoo ne détient jamais vos fonds.</p>
      </Container>
    </section>
  );
}
