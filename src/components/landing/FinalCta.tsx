import { Check, MessageCircle } from "lucide-react";
import { WaitlistForm } from "@/components/landing/WaitlistForm";
import { Container } from "@/components/ui/Container";
import { siteWhatsappLink } from "@/lib/whatsapp";

const PERKS = [
  "Prévenu en premier sur WhatsApp au lancement",
  "Tarif de lancement garanti",
  "Aucun engagement, désinscription sur simple message",
];

export function FinalCta() {
  const whatsapp = siteWhatsappLink();

  return (
    <section id="waitlist" className="py-20">
      <Container>
        <div className="relative grid gap-10 overflow-hidden rounded-3xl bg-hero p-6 text-white sm:p-10 lg:grid-cols-2 lg:p-14">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(20,184,166,0.3),transparent_60%)]"
          />
          <div className="relative">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Soyez parmi les premiers à facturer avec Factoo
            </h2>
            <p className="mt-4 text-lg text-white/75">
              Laissez votre numéro WhatsApp : on vous prévient dès l’ouverture, et on aimerait avoir votre avis avant.
            </p>
            <ul className="mt-6 space-y-3">
              {PERKS.map((perk) => (
                <li key={perk} className="flex gap-3">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary-light" aria-hidden="true" />
                  {perk}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative">
            <WaitlistForm />
            {whatsapp && (
              <p className="mt-6 text-center text-sm text-white/75">
                Une question ?{" "}
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-white underline underline-offset-4"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden="true" /> Discutons sur WhatsApp
                </a>
              </p>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}
