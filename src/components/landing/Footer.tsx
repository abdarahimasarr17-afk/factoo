import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Logo } from "@/components/ui/Logo";
import { PaymentBadges } from "@/components/ui/PaymentBadges";
import { siteWhatsappLink } from "@/lib/whatsapp";

const linkClass = "text-muted transition hover:text-foreground";
const headingClass = "text-xs font-bold uppercase tracking-widest text-muted";

export function Footer() {
  const whatsapp = siteWhatsappLink();

  return (
    <footer className="border-t border-border py-14">
      <Container>
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className={headingClass}>Produit</p>
            <ul className="mt-4 space-y-3">
              <li>
                <Link href="/#fonctionnalites" className={linkClass}>
                  Fonctionnalités
                </Link>
              </li>
              <li>
                <Link href="/#tarifs" className={linkClass}>
                  Tarifs
                </Link>
              </li>
              <li>
                <Link href="/#faq" className={linkClass}>
                  Questions fréquentes
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className={headingClass}>Entreprise</p>
            <ul className="mt-4 space-y-3">
              <li>
                <Link href="/#top" className={linkClass}>
                  À propos
                </Link>
              </li>
              {whatsapp && (
                <li>
                  <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={linkClass}>
                    Contact WhatsApp
                  </a>
                </li>
              )}
            </ul>
          </div>
          <div>
            <p className={headingClass}>Légal</p>
            <ul className="mt-4 space-y-3">
              <li>
                <Link href="/cgu" className={linkClass}>
                  Conditions d’utilisation
                </Link>
              </li>
              <li>
                <Link href="/confidentialite" className={linkClass}>
                  Confidentialité
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className={headingClass}>Moyens de paiement</p>
            <PaymentBadges className="mt-4" />
          </div>
        </div>
        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-border pt-6 sm:flex-row sm:items-center">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <Logo className="text-base" />
            <p className="text-sm text-muted">© 2026 Factoo — Facturez et faites-vous payer depuis WhatsApp.</p>
          </div>
          <Link href="/#top" className="text-sm font-semibold text-foreground">
            Retour en haut ↑
          </Link>
        </div>
      </Container>
    </footer>
  );
}
