import { ArrowRight, Check, MessageCircle } from "lucide-react";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { Container } from "@/components/ui/Container";
import { siteWhatsappLink } from "@/lib/whatsapp";

const PERKS = [
  "Gratuit pour commencer, sans carte bancaire",
  "Tarif de lancement garanti pour les premiers inscrits",
  "Votre première facture envoyée en 2 minutes",
];

export function FinalCta() {
  const whatsapp = siteWhatsappLink();

  return (
    <section id="commencer" className="py-20">
      <Container>
        <div className="relative grid gap-10 overflow-hidden rounded-3xl bg-hero p-6 text-white sm:p-10 lg:grid-cols-2 lg:items-center lg:p-14">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(20,184,166,0.3),transparent_60%)]"
          />
          <div className="relative">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Envoyez votre première facture aujourd’hui
            </h2>
            <p className="mt-4 text-lg text-white/75">
              Créez votre compte, ajoutez un client, et partagez la facture sur WhatsApp en quelques minutes.
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
          <div className="relative grid gap-4">
            <Link href="/inscription" className={buttonClass("brand", "md", "w-full")}>
              Créer mon compte gratuit <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <p className="text-center text-sm text-white/75">
              Déjà un compte ?{" "}
              <Link href="/connexion" className="font-bold text-white underline underline-offset-4">
                Se connecter
              </Link>
            </p>
            {whatsapp && (
              <p className="mt-2 text-center text-sm text-white/75">
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
