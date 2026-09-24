import { BarChart3, BellRing, Coins, MessageCircle, ShieldCheck, Users } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

const SMALL = [
  {
    icon: BellRing,
    title: "Relances automatiques",
    text: "WhatsApp et SMS à J+3, J+7 et J+14. Elles s’arrêtent dès que la facture est payée.",
  },
  {
    icon: ShieldCheck,
    title: "Conforme SYSCOHADA",
    text: "Numérotation séquentielle, TVA, mentions légales. Prêt pour l’e-reporting FNE (CI, Bénin).",
  },
  {
    icon: BarChart3,
    title: "Tableau de bord trésorerie",
    text: "Encaissé ce mois, en attente, en retard : vous savez toujours combien on vous doit.",
  },
  {
    icon: Coins,
    title: "Multi-devises",
    text: "FCFA XOF, FCFA XAF ou euros, facture par facture.",
  },
  {
    icon: Users,
    title: "Répertoire clients",
    text: "Total facturé, payé et restant dû pour chaque client.",
  },
];

export function Features() {
  return (
    <section id="fonctionnalites" className="py-20">
      <Container>
        <SectionHeading
          eyebrow="Fonctionnalités"
          title="Tout ce qu’il faut pour être payé, rien de plus"
          subtitle="Pensé pour les freelances et PME d’Afrique de l’Ouest, sur mobile d’abord."
        />
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          <div className="flex flex-col justify-between rounded-3xl bg-hero p-8 text-white md:col-span-2 md:row-span-2">
            <div>
              <MessageCircle className="h-10 w-10 text-primary-light" aria-hidden="true" />
              <h3 className="mt-6 text-2xl font-extrabold sm:text-3xl">Le lien de paiement dans WhatsApp</h3>
              <p className="mt-4 max-w-md text-white/75">
                Un bouton « Envoyer via WhatsApp » ouvre la conversation avec un message prêt : résumé de la facture et
                lien de paiement. Votre client paie par Wave, Orange Money ou carte, sans créer de compte.
              </p>
            </div>
            <p className="mt-8 rounded-2xl bg-white/10 p-4 text-sm text-white/80">
              Factoo ne détient jamais vos fonds : le paiement arrive directement sur votre compte.
            </p>
          </div>
          {SMALL.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-3xl border border-border bg-card p-6">
              <Icon className="h-7 w-7 text-primary" aria-hidden="true" />
              <h3 className="mt-4 text-lg font-bold text-foreground">{title}</h3>
              <p className="mt-2 text-sm text-muted">{text}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
