# Factoo — Landing page (liste d'attente) — Design

**Date** : 2026-09-24
**Statut** : validé en brainstorming, en attente de relecture
**Périmètre PRD** : F36 à F40 (landing page), adaptées à une phase pré-lancement (liste d'attente au lieu de l'inscription).

## 1. Objectif

Publier une landing page Factoo qui :
1. explique la proposition de valeur en moins de 10 secondes (facture + paiement depuis WhatsApp) ;
2. collecte des prospects qualifiés dans une liste d'attente (numéro WhatsApp, pays, profil) ;
3. ouvre une conversation WhatsApp directe avec le fondateur (validation terrain, Risque 1 du PRD).

Le projet Next.js créé ici est le socle de toute l'application Factoo : les blocs suivants (auth, factures, paiement, abonnement, relances) s'y ajouteront.

## 2. Hors périmètre

- Inscription / connexion / dashboard (bloc suivant).
- Version anglaise (V1 = français uniquement ; pas de sélecteur de langue).
- Témoignages fictifs : remplacés par un encart « premiers utilisateurs » (pas de faux avis présentés comme réels).
- Compteur d'utilisateurs chiffré (aucune donnée réelle à afficher avant le lancement).
- Analytics : non inclus dans ce bloc.

## 3. Stack technique

| Élément | Choix |
|---|---|
| Framework | Next.js 15 (App Router), TypeScript |
| Styles | Tailwind CSS v4 |
| Police | Plus Jakarta Sans via `next/font/google` |
| Icônes | lucide-react |
| Thème clair/sombre | next-themes (défaut : système) |
| Base de données | Supabase (`@supabase/supabase-js`), accès serveur uniquement |
| Validation | zod |
| Tests | Vitest (unitaires) + vérification visuelle navigateur |
| Hébergement | Vercel |

### Variables d'environnement

| Variable | Usage | Exposée au client |
|---|---|---|
| `SUPABASE_URL` | URL du projet Supabase | Non |
| `SUPABASE_SERVICE_ROLE_KEY` | Écriture dans `waitlist` depuis la Server Action | Non |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Numéro du bouton « Discuter sur WhatsApp » (format international sans `+`, ex. `221770000000`) | Oui |

Un fichier `.env.example` documente ces trois variables. Si `NEXT_PUBLIC_WHATSAPP_NUMBER` est vide, les boutons WhatsApp sont masqués (pas de lien cassé).

## 4. Structure des fichiers

```
src/
  app/
    layout.tsx               police, ThemeProvider, métadonnées SEO + Open Graph
    page.tsx                 assemble les sections de la landing
    opengraph-image.tsx      image OG générée (aperçu du lien sur WhatsApp/Facebook)
    actions/waitlist.ts      Server Action joinWaitlist
    cgu/page.tsx             CGU (modèle à relire)
    confidentialite/page.tsx politique de confidentialité (modèle à relire)
  components/
    landing/                 Navbar, Hero, HeroVisual, Stats, ProblemSolution,
                             Features, HowItWorks, Pricing, Trust, Faq,
                             FinalCta, WaitlistForm, Footer
    ui/                      Button, Card, Badge, Container, ThemeToggle, Logo
  lib/
    supabase.ts              client Supabase serveur
    validation.ts            schéma zod waitlist + normalisation téléphone
    whatsapp.ts              construction des liens wa.me
    site.ts                  contenus/constantes (textes FAQ, plans, pays)
supabase/
  migrations/001_waitlist.sql
```

Chaque section est un composant autonome sans état partagé ; seul `WaitlistForm` est un composant client.

## 5. Données — table `waitlist`

```sql
create table public.waitlist (
  id          uuid primary key default gen_random_uuid(),
  phone       text not null unique,        -- format E.164, ex. +221770000000
  email       text,
  country     text not null check (country in ('SN','CI','ML','BF','BJ','TG','NE','CM','OTHER')),
  profile     text not null check (profile in ('freelance','pme','ecommerce')),
  created_at  timestamptz not null default now()
);
alter table public.waitlist enable row level security;
-- Aucune policy : seul le service_role (Server Action) peut lire/écrire.
```

## 6. Server Action `joinWaitlist`

Entrée (FormData) : `phone`, `countryCode` (indicatif), `country`, `profile`, `email?`, `website` (honeypot).

Étapes :
1. Si `website` est rempli → retourner un succès factice sans insertion (bot).
2. Valider avec zod :
   - téléphone : chiffres uniquement après nettoyage des espaces/tirets, 8 à 10 chiffres locaux ; recomposé en E.164 avec l'indicatif ;
   - `country` et `profile` dans les listes autorisées ;
   - `email` optionnel, format email valide s'il est fourni.
3. Insérer dans `waitlist`.
4. Retourner un résultat typé :
   - `{ ok: true }` → message « ✓ C'est noté ! On vous écrit sur WhatsApp au lancement. »
   - doublon (code Postgres `23505`) → `{ ok: true, already: true }` → « Vous êtes déjà inscrit — on vous prévient au lancement. »
   - erreur de validation → `{ ok: false, fieldErrors }` affichées sous chaque champ.
   - erreur Supabase/réseau → `{ ok: false, error: 'server' }` → « Un souci technique, réessayez ou écrivez-nous sur WhatsApp. » (+ lien WhatsApp si configuré). L'erreur est loguée côté serveur, jamais affichée brute.

Indicatifs proposés : +221 SN (défaut), +225 CI, +223 ML, +226 BF, +229 BJ, +228 TG, +227 NE, +237 CM, autre (saisie libre de l'indicatif). Le choix du pays présélectionne l'indicatif.

## 7. Identité visuelle

Inspirée de la refonte FlashSMS (même famille visuelle, teinte distincte).

- **Primaire** : émeraude tirant vers le bleu-vert (teal), ex. `#0F766E` / clair `#14B8A6` ; fond hero sombre `#04201D` → dégradé radial teal.
- **Accent** : ambre `#F59E0B` pour montants et statut « Payée ».
- **Neutres** : fond clair `#F8FAFC`, texte `#0B1220` ; en sombre fond `#06110F`, texte `#E6F2F0`.
- Couleurs définies en tokens CSS (`:root` + `.dark`), jamais en dur dans les composants.
- Titres très gras (800), fin du titre hero en couleur primaire claire.
- Cartes blanches arrondies (`rounded-2xl`), bordure fine, ombre douce.
- Navbar flottante en pilule, fond translucide + flou au scroll.
- Logo : texte « Factoo » + pictogramme (document avec coche) en SVG inline.

## 8. Contenu (vouvoiement)

1. **Navbar** : logo · Fonctionnalités · Comment ça marche · Tarifs · FAQ · toggle thème · bouton noir « Rejoindre la liste d'attente » (ancre `#waitlist`). Burger sur mobile.
2. **Hero** (fond sombre)
   - Badge : « ⚡ Bientôt disponible · Sénégal, Côte d'Ivoire, Mali… »
   - H1 : « Facturez en 2 minutes. *Faites-vous payer depuis WhatsApp.* »
   - Sous-titre : « Créez une facture conforme, envoyez un lien de paiement par WhatsApp, et votre client paie en 3 taps — Wave, Orange Money ou carte. Sans compte. »
   - CTA : « Rejoindre la liste d'attente → » (primaire) + « Discuter sur WhatsApp » (secondaire).
   - Visuel (HTML/CSS, pas d'image) : carte facture « FAC-2026-0042 · 150 000 FCFA » avec bouton « Payer » ; notification « ✓ Payée via Wave » ; bulle WhatsApp « Relance J+3 envoyée ». Légère animation de flottement (désactivée si `prefers-reduced-motion`).
3. **Stats** (4 cartes) : « 2 min » pour créer une facture · « 3 taps » pour payer · « 0 FCFA » pour commencer · « J+3 / J+7 / J+14 » relances automatiques.
4. **Problème → solution** (3 lignes) :
   - « Mon client met 3 semaines à me payer » → lien de paiement cliquable dans WhatsApp.
   - « Je perds du temps à relancer » → relances automatiques WhatsApp/SMS.
   - « Mes factures Word ne sont pas conformes » → PDF conforme SYSCOHADA.
5. **Fonctionnalités** (bento) : grande carte « Lien de paiement WhatsApp » ; cartes Relances automatiques · Conforme SYSCOHADA (numérotation séquentielle, TVA, mentions légales, prêt pour le FNE) · Tableau de bord trésorerie · Multi-devises XOF/XAF/EUR · Répertoire clients.
6. **Comment ça marche** : ① Créez la facture · ② Envoyez-la sur WhatsApp · ③ Encaissez directement sur votre compte. Mention : « Factoo ne détient jamais vos fonds. »
7. **Tarifs** : Gratuit (0 FCFA — 3 factures/mois, PDF conforme, multi-devises, clients illimités) vs Pro (~~10 000~~ **5 000 FCFA/mois** ou ~~100 000~~ **50 000 FCFA/an** — factures illimitées, lien de paiement, partage WhatsApp avec lien, relances auto + manuelles, tableau de bord complet, export FNE, support WhatsApp 24h). Carte Pro mise en avant. Encart : « Tarif de lancement garanti aux inscrits de la liste d'attente. » CTA de chaque plan → `#waitlist`.
8. **Confiance** : badges Wave, Orange Money, Visa, Mastercard (SVG/texte stylé) + encart « Rejoignez les premiers freelances et PME qui testent Factoo ».
9. **FAQ** (accordéon `<details>`, accessible sans JS) :
   - Mon client doit-il créer un compte ? — Non.
   - Est-ce que Factoo touche à mon argent ? — Non, le paiement va directement sur votre compte.
   - Mes factures sont-elles conformes ? — Numérotation séquentielle, TVA, mentions SYSCOHADA.
   - Dans quels pays ? — Afrique de l'Ouest francophone (XOF), Cameroun (XAF), EUR.
   - Que comprend le plan gratuit ? — 3 factures/mois avec PDF conforme.
   - Quand Factoo sera-t-il disponible ? — Bientôt ; les inscrits sont prévenus en premier sur WhatsApp.
10. **CTA final + formulaire** (`id="waitlist"`, bloc vert foncé) : titre « Soyez parmi les premiers à facturer avec Factoo », formulaire (indicatif + numéro WhatsApp, pays, profil, email optionnel, honeypot), bouton « Je m'inscris », état de chargement, messages de §6. Sous le formulaire : « Une question ? Discutons sur WhatsApp ».
11. **Footer** 4 colonnes : Produit (Fonctionnalités, Tarifs, FAQ) · Entreprise (À propos → ancre hero, Contact WhatsApp) · Légal (CGU, Confidentialité) · Moyens de paiement (badges). Ligne basse : « © 2026 Factoo » + « Retour en haut ↑ ».

Lien WhatsApp : `https://wa.me/<NUMERO>?text=<message encodé>`, message pré-rempli : « Bonjour, je suis intéressé(e) par Factoo. »

## 9. Pages légales

`/cgu` et `/confidentialite` : modèles simples en français, clairement marqués à relire. La politique de confidentialité mentionne les données collectées (téléphone, email, pays, profil), la finalité (prévenir du lancement, échanger sur le produit) et la possibilité de demander la suppression via WhatsApp/email.

## 10. SEO & partage

- `title` : « Factoo — Facturez et faites-vous payer depuis WhatsApp »
- `description` : pitch en une phrase du PRD.
- `lang="fr"`, Open Graph + Twitter card, image OG générée (fond teal, titre, logo) — critique car le canal principal est le partage WhatsApp.

## 11. Performance & accessibilité

- Page statique (aucune donnée dynamique au rendu) ; seul le formulaire hydrate.
- Aucune image raster dans le hero ; police auto-hébergée par `next/font`.
- Cible Lighthouse mobile ≥ 90 (performance, accessibilité, SEO).
- Contrastes AA en clair et sombre, focus visibles, labels sur tous les champs, `inputmode="tel"` sur le numéro.
- Responsive : cible prioritaire 360–414 px ; pas de scroll horizontal.

## 12. Tests

- **Unitaires (Vitest)** : `validation.ts` (numéros valides/invalides par pays, email optionnel, valeurs hors liste) ; `joinWaitlist` avec client Supabase mocké (succès, doublon 23505, erreur serveur, honeypot) ; `whatsapp.ts` (encodage, numéro absent).
- **Manuel** : rendu 375 px et 1440 px, clair et sombre ; soumission réelle vers Supabase ; `npm run build` sans erreur ni warning TypeScript.

## 13. Livrables

- Projet Next.js fonctionnel en local (`npm run dev`).
- Migration SQL à exécuter dans Supabase.
- `.env.example` + README court (installation, variables, déploiement Vercel).
