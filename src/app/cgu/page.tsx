import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Conditions d’utilisation — Factoo" };

export default function CguPage() {
  return (
    <LegalPage title="Conditions d’utilisation" updatedAt="24 septembre 2026">
      <p>
        <strong>Modèle à faire relire avant la mise en ligne publique.</strong>
      </p>
      <h2>1. Objet</h2>
      <p>
        Ce site présente le service Factoo, en cours de développement, et permet de s’inscrire à une liste d’attente
        pour être informé de son lancement.
      </p>
      <h2>2. Inscription à la liste d’attente</h2>
      <p>
        L’inscription est gratuite et sans engagement. Elle ne crée aucun compte et ne donne pas accès au service. Vous
        pouvez demander votre retrait à tout moment par message WhatsApp ou email.
      </p>
      <h2>3. Tarifs annoncés</h2>
      <p>
        Les tarifs affichés sont ceux prévus au lancement. Le « tarif de lancement garanti » s’applique aux personnes
        inscrites sur la liste d’attente au moment de l’ouverture du service.
      </p>
      <h2>4. Responsabilité</h2>
      <p>Les informations du site sont fournies à titre indicatif et peuvent évoluer avant le lancement du service.</p>
      <h2>5. Contact</h2>
      <p>Pour toute question, contactez-nous via le lien WhatsApp présent sur le site.</p>
    </LegalPage>
  );
}
