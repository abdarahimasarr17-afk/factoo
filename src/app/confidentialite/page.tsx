import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Politique de confidentialité — Factoo" };

export default function ConfidentialitePage() {
  return (
    <LegalPage title="Politique de confidentialité" updatedAt="24 septembre 2026">
      <p>
        <strong>Modèle à faire relire avant la mise en ligne publique.</strong>
      </p>
      <h2>Données collectées</h2>
      <p>Lors de l’inscription à la liste d’attente, nous collectons :</p>
      <ul>
        <li>votre numéro WhatsApp ;</li>
        <li>votre pays ;</li>
        <li>votre profil (freelance, PME, e-commerce) ;</li>
        <li>votre adresse email, si vous la renseignez.</li>
      </ul>
      <h2>Finalités</h2>
      <p>
        Ces données servent uniquement à vous prévenir du lancement de Factoo et à échanger avec vous sur le produit.
        Elles ne sont ni vendues ni cédées à des tiers.
      </p>
      <h2>Hébergement</h2>
      <p>
        Les données sont stockées chez notre hébergeur de base de données (Supabase) et ne sont accessibles qu’à
        l’équipe Factoo.
      </p>
      <h2>Durée de conservation</h2>
      <p>Les données sont conservées jusqu’au lancement du service, puis au plus 12 mois sans échange de votre part.</p>
      <h2>Vos droits</h2>
      <p>
        Vous pouvez demander l’accès, la rectification ou la suppression de vos données à tout moment, par message
        WhatsApp ou par email. Nous traitons votre demande sous 30 jours.
      </p>
    </LegalPage>
  );
}
