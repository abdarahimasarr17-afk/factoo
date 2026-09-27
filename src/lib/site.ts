export const COUNTRY_CODES = ["SN", "CI", "ML", "BF", "BJ", "TG", "NE", "CM", "OTHER"] as const;
export type CountryCode = (typeof COUNTRY_CODES)[number];

export const COUNTRIES: { code: CountryCode; name: string; dial: string }[] = [
  { code: "SN", name: "Sénégal", dial: "221" },
  { code: "CI", name: "Côte d’Ivoire", dial: "225" },
  { code: "ML", name: "Mali", dial: "223" },
  { code: "BF", name: "Burkina Faso", dial: "226" },
  { code: "BJ", name: "Bénin", dial: "229" },
  { code: "TG", name: "Togo", dial: "228" },
  { code: "NE", name: "Niger", dial: "227" },
  { code: "CM", name: "Cameroun", dial: "237" },
  { code: "OTHER", name: "Autre pays", dial: "" },
];

export const PROFILE_VALUES = ["freelance", "pme", "ecommerce"] as const;
export type ProfileValue = (typeof PROFILE_VALUES)[number];

export const PROFILES: { value: ProfileValue; label: string }[] = [
  { value: "freelance", label: "Freelance" },
  { value: "pme", label: "PME / entreprise" },
  { value: "ecommerce", label: "E-commerce / vente en ligne" },
];

export type Plan = {
  id: "free" | "pro";
  name: string;
  price: string;
  oldPrice: string | null;
  period: string;
  yearly: { price: string; oldPrice: string } | null;
  highlight: boolean;
  cta: string;
  features: string[];
};

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Gratuit",
    price: "0 FCFA",
    oldPrice: null,
    period: "pour toujours",
    yearly: null,
    highlight: false,
    cta: "Commencer gratuitement",
    features: [
      "3 factures par mois",
      "PDF conforme SYSCOHADA",
      "Numérotation séquentielle",
      "Multi-devises XOF · XAF · EUR",
      "Clients illimités",
      "Support email (48 h)",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "5 000 FCFA",
    oldPrice: "10 000 FCFA",
    period: "par mois",
    yearly: { price: "50 000 FCFA", oldPrice: "100 000 FCFA" },
    highlight: true,
    cta: "Passer au Pro",
    features: [
      "Factures illimitées",
      "Lien de paiement Wave · Orange Money · carte",
      "Partage WhatsApp avec lien de paiement",
      "Relances automatiques J+3 · J+7 · J+14",
      "Relances manuelles",
      "Tableau de bord complet (CA, impayés, graphique)",
      "Export e-reporting FNE (Côte d’Ivoire · Bénin)",
      "Support WhatsApp prioritaire (24 h)",
    ],
  },
];

export const FAQ: { question: string; answer: string }[] = [
  {
    question: "Mon client doit-il créer un compte pour payer ?",
    answer:
      "Non. Votre client ouvre le lien reçu sur WhatsApp, voit la facture et paie avec Wave, Orange Money ou sa carte. Aucun compte, aucune application à installer.",
  },
  {
    question: "Est-ce que Factoo touche à mon argent ?",
    answer:
      "Non. Factoo ne détient jamais vos fonds : le paiement de votre client arrive directement sur votre compte de paiement.",
  },
  {
    question: "Mes factures sont-elles conformes ?",
    answer:
      "Oui. Chaque facture a une numérotation séquentielle, la TVA et les mentions légales obligatoires SYSCOHADA. Factoo prépare aussi l’e-reporting exigé en Côte d’Ivoire (FNE) et au Bénin.",
  },
  {
    question: "Dans quels pays puis-je utiliser Factoo ?",
    answer:
      "Factoo est pensé pour l’Afrique de l’Ouest francophone (FCFA XOF) et fonctionne aussi en FCFA XAF (Cameroun) et en euros.",
  },
  {
    question: "Que comprend le plan gratuit ?",
    answer:
      "3 factures par mois avec PDF conforme, numérotation automatique et gestion de vos clients. Le lien de paiement et les relances automatiques sont inclus dans le plan Pro.",
  },
  {
    question: "Quand Factoo sera-t-il disponible ?",
    answer:
      "Très bientôt. Les inscrits de la liste d’attente sont prévenus en premier sur WhatsApp et profitent du tarif de lancement.",
  },
];

export const PAYMENT_METHODS: { name: string; color: string; logo?: string }[] = [
  { name: "Wave", color: "#1DC3F0", logo: "/logos/wave.png" },
  { name: "Orange Money", color: "#FF7900", logo: "/logos/orange-money.png" },
  { name: "Visa", color: "#1A1F71" },
  { name: "Mastercard", color: "#EB001B" },
];
