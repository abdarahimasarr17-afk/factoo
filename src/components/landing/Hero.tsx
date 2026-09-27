import { ArrowRight, MessageCircle } from "lucide-react";
import { HeroVisual } from "@/components/landing/HeroVisual";
import { buttonClass } from "@/components/ui/button";
import { Container } from "@/components/ui/Container";
import { siteWhatsappLink } from "@/lib/whatsapp";

export function Hero() {
  const whatsapp = siteWhatsappLink();

  return (
    <section id="top" className="relative overflow-hidden bg-hero pb-20 pt-32 text-white sm:pt-40">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(20,184,166,0.35),transparent_60%)]"
      />
      <Container className="relative grid items-center gap-12 lg:grid-cols-2">
        <div>
          <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
            Facturez en 2 min. Faites-vous payer depuis <span className="text-[#00C853]">WhatsApp</span>.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-white/60">
            Envoyez un lien : votre client paie par Wave ou Orange Money.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href="#waitlist" className={buttonClass("brand")}>
              Commencer gratuitement <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
            {whatsapp && (
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={buttonClass("ghost")}>
                <MessageCircle className="h-4 w-4" aria-hidden="true" /> Discuter sur WhatsApp
              </a>
            )}
          </div>
        </div>
        <HeroVisual />
      </Container>
    </section>
  );
}
