# Factoo — Bloc 2b : Factures, PDF, envoi WhatsApp, marquage « Payée », tableau de bord — Design

**Date** : 2026-10-15
**Prérequis** : bloc 2a (authentification, profil entreprise, clients) en production.
**Suite** : bloc 3 (paiement en ligne Moneroo sur la page publique de la facture), bloc 4 (abonnement Pro), bloc 5 (relances).

## 1. Objectif

Permettre à un utilisateur Factoo de créer une facture conforme en moins de 2 minutes, de l’émettre avec un numéro légal, de l’envoyer à son client sur WhatsApp (lien vers une page publique avec PDF), de la marquer « Payée » et de suivre ce qu’il a encaissé et ce qu’on lui doit sur un tableau de bord.

## 2. Hors périmètre

- Devis, avoirs, factures d’acompte, paiements partiels.
- TVA par ligne, catalogue de produits / services.
- Paiement en ligne (bloc 3), abonnement et limites du plan gratuit (bloc 4), relances automatiques (bloc 5).
- Envoi automatique via l’API WhatsApp Business, envoi par email.
- Choix du modèle de PDF, personnalisation des couleurs.

## 3. Décisions

| Sujet | Décision |
|---|---|
| Documents | Factures uniquement |
| Numérotation | `FAC-AAAA-NNNN`, séquence par utilisateur remise à zéro chaque année, attribuée à l’émission (jamais en brouillon), sans trou ni doublon (fonction Postgres avec verrou) |
| Date d’émission | Toujours le jour de l’émission (affichée, non modifiable) : garantit que l’ordre des numéros suit l’ordre des dates |
| Lignes | Lignes libres (désignation, quantité, prix unitaire HT) ; un taux de TVA par facture, prérempli depuis les Paramètres, modifiable ; remise globale facultative en % ou en montant |
| TVA 0 % | Mention « TVA non applicable » à la place de la ligne TVA |
| Envoi WhatsApp | Lien `wa.me` avec message prérempli contenant le lien secret de la page publique `/f/[jeton]` |
| Statuts | Brouillon → Émise → Payée ; Annulée (numéro conservé) ; « En retard » calculé (émise, non payée, échéance dépassée), jamais stocké |
| Paiement | En une fois : date + moyen (Wave, Orange Money, espèces, virement, autre) ; annulable |
| Échéance | Choix rapide par facture : à réception, 15 jours, 30 jours, date précise ; défaut réglable dans les Paramètres (30 jours) |
| Coordonnées de paiement | Saisies une fois dans les Paramètres (Wave, Orange Money, IBAN, texte libre), affichées sur le PDF et la page publique |
| Tableau de bord | Encaissé ce mois-ci, en attente, en retard (montant + nombre), graphique de l’encaissé sur 6 mois, 5 dernières factures, bouton « Nouvelle facture » |
| PDF | `@react-pdf/renderer` côté serveur, généré à la demande depuis l’instantané figé, jamais stocké |
| Instantané | À l’émission, copie figée des coordonnées vendeur (profil + coordonnées de paiement + logo copié) et client dans la facture |
| Montants | Entiers en unité mineure (`bigint`) : 1 = 1 FCFA pour XOF/XAF, 1 = 1 centime pour EUR ; calculs en TypeScript (fonction pure testée) |
| Landing | À la fin du bloc, les CTA passent de la liste d’attente à `/inscription` |

## 4. Parcours et écrans

### 4.1 Application (`/app`, protégée)

**Navigation** : « Factures » devient actif (fin du badge « Bientôt »), route `/app/factures`.

| Route | Contenu |
|---|---|
| `/app` | Tableau de bord (§7). La carte « Profil complété » reste visible tant que la jauge est sous 100 %. La carte « Vos factures arrivent bientôt » disparaît. |
| `/app/factures` | Onglets-filtres `?statut=` : Toutes, Brouillons, En attente (émises non échues), En retard, Payées, Annulées. Recherche `?q=` sur numéro et nom du client (instantané ou client lié). Ligne : numéro (ou « Brouillon »), client, montant TTC, échéance, badge de statut. Tri : brouillons d’abord par date de modification, puis émises par numéro décroissant. État vide : « Aucune facture pour l’instant » + bouton « Créer ma première facture ». Bouton flottant « + » sur mobile. |
| `/app/factures/nouvelle` (`?client=` facultatif) | Formulaire de facture (§4.2). « Enregistrer le brouillon » → `/app/factures/[id]` avec « Brouillon enregistré ✓ ». « Émettre la facture » → confirmation → enregistrement + émission → `/app/factures/[id]` avec « Facture FAC-2026-0001 émise ✓ ». |
| `/app/factures/[id]` — brouillon | Même formulaire prérempli, plus « Aperçu PDF » (filigrane BROUILLON) et « Supprimer le brouillon » (confirmation). |
| `/app/factures/[id]` — émise / payée / annulée | Aperçu HTML de la facture (même contenu que le PDF) et barre d’actions : **Envoyer par WhatsApp**, **Télécharger le PDF**, **Copier le lien** ; **Marquer comme payée** (fenêtre : date, défaut aujourd’hui ; moyen de paiement) ; **Annuler la facture** (confirmation : « Le numéro FAC-… restera utilisé. Cette action est définitive. ») ; sur une facture payée : « Payée le … par … » + **Annuler le paiement**. Une facture annulée n’a plus que « Télécharger le PDF ». Facture introuvable ou d’un autre utilisateur → 404. |
| `/app/clients/[id]` | Ajout d’un bouton « Facturer ce client » → `/app/factures/nouvelle?client={id}`. |
| `/app/parametres` | Bloc **Facturation** : ajout de « Échéance par défaut » (à réception, 15 jours, 30 jours). Nouveau bloc **Paiement** : numéro Wave, numéro Orange Money, IBAN, « Autres instructions » (texte libre ≤ 300 caractères, ex. « Paiement à 30 jours par virement »). |

### 4.2 Formulaire de facture

- **Client** : liste déroulante avec recherche sur les clients non archivés. Option « + Nouveau client » : fenêtre avec nom (obligatoire) et téléphone, qui crée le client et le sélectionne sans quitter le formulaire. Un brouillon peut être enregistré sans client ; l’émission exige un client.
- **Date d’émission** : affichée « Aujourd’hui » (fixée à l’émission).
- **Échéance** : À réception / 15 jours / 30 jours / Date précise (sélecteur de date, ≥ aujourd’hui). Défaut : celle des Paramètres.
- **Lignes** : désignation (obligatoire, ≤ 300 caractères), quantité (> 0, 3 décimales max, virgule acceptée, défaut 1), prix unitaire HT (≥ 0, entier pour XOF/XAF, 2 décimales pour EUR). Ajouter / supprimer une ligne ; 1 ligne vide au départ ; 1 à 50 lignes. Sur mobile : cartes empilées ; sur ordinateur : tableau.
- **Remise** (facultative, repliée par défaut) : type % (0–100, 2 décimales) ou montant (≤ total HT).
- **Devise** : celle des Paramètres, modifiable (XOF / XAF / EUR).
- **TVA** : taux des Paramètres, modifiable (0–100, virgule acceptée), aide « 0 % = TVA non applicable ».
- **Note** facultative (≤ 500 caractères) affichée sur la facture (ex. « Merci pour votre confiance »).
- **Totaux en direct** : Total HT, Remise, Total HT après remise, TVA (x %), **Total TTC**.
- Saisie conservée en cas d’erreur ; erreurs affichées sous chaque champ (indexées par ligne : `lines.2.quantity`).

### 4.3 Page publique `/f/[jeton]`

- Sans connexion, `robots: noindex, nofollow`, en-tête `X-Robots-Tag: noindex`.
- Seules les factures émises, payées ou annulées sont visibles ; brouillon ou jeton inconnu → 404 (même page, aucune distinction).
- Contenu : identité du vendeur (logo, nom, coordonnées), numéro, dates, client, lignes, totaux, montant en lettres, note, coordonnées de paiement, bandeau de statut (« À régler avant le … », « En retard depuis le … », « Payée le … », « Facture annulée »), bouton « Télécharger le PDF » (`/f/[jeton]/pdf`). Pied : « Facture créée avec Factoo » (lien vers la landing).
- Mobile d’abord, même identité visuelle que l’application (carte blanche, accent teal `#0F766E`).

### 4.4 Message WhatsApp

Lien `https://wa.me/{numéro client E.164 sans +}?text=…` ; sans numéro client : `https://wa.me/?text=…` (l’utilisateur choisit le contact).

> Bonjour {nom du client}, voici votre facture {FAC-2026-0001} de {150 000 FCFA}, à régler {avant le 14/11/2026 | à réception}. Consultez-la et téléchargez-la ici : {https://factoo-wine.vercel.app/f/jeton}. Merci, {nom de l’entreprise}

L’URL de base vient de `NEXT_PUBLIC_SITE_URL`.

## 5. Données

### 5.1 Migration `supabase/migrations/005_invoices.sql`

```sql
-- Coordonnées de paiement et échéance par défaut
alter table public.profiles
  add column wave_number        text,
  add column orange_money_number text,
  add column iban               text,
  add column payment_note       text check (length(payment_note) <= 300),
  add column default_due_days   int not null default 30 check (default_due_days in (0, 15, 30));

create table public.invoices (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  client_id       uuid references public.clients (id),
  status          text not null default 'draft' check (status in ('draft','issued','paid','cancelled')),
  number          text,
  year            int,
  seq             int,
  issue_date      date,
  due_kind        text not null default '30' check (due_kind in ('0','15','30','date')),
  due_date        date,
  currency        text not null check (currency in ('XOF','XAF','EUR')),
  vat_rate        numeric(5,2) not null check (vat_rate >= 0 and vat_rate <= 100),
  discount_type   text check (discount_type in ('percent','amount')),
  discount_value  numeric(14,2) check (discount_value >= 0),
  note            text check (length(note) <= 500),
  subtotal        bigint not null default 0,   -- total HT des lignes (unité mineure)
  discount_amount bigint not null default 0,
  vat_amount      bigint not null default 0,
  total           bigint not null default 0,   -- TTC
  seller          jsonb,                        -- instantané à l'émission
  buyer           jsonb,                        -- instantané à l'émission
  public_token    text not null unique default replace(replace(encode(extensions.gen_random_bytes(18), 'base64'), '+', '-'), '/', '_'),
  issued_at       timestamptz,
  paid_at         date,
  payment_method  text check (payment_method in ('wave','orange_money','cash','transfer','other')),
  cancelled_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, number),
  check ((status = 'draft') = (number is null)),
  check ((status = 'paid') = (paid_at is not null))
);
create index invoices_user_status_idx on public.invoices (user_id, status, due_date);
create trigger invoices_touch before update on public.invoices for each row execute function public.touch_updated_at();

create table public.invoice_lines (
  id          uuid primary key default gen_random_uuid(),
  invoice_id  uuid not null references public.invoices (id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  position    int not null,
  description text not null check (length(trim(description)) between 1 and 300),
  quantity    numeric(12,3) not null check (quantity > 0),
  unit_price  bigint not null check (unit_price >= 0),
  line_total  bigint not null,
  unique (invoice_id, position)
);

create table public.invoice_counters (
  user_id  uuid not null references auth.users (id) on delete cascade,
  year     int not null,
  last_seq int not null default 0,
  primary key (user_id, year)
);

-- RLS : l'utilisateur ne lit que ses factures ; il n'écrit directement que dans ses brouillons.
alter table public.invoices         enable row level security;
alter table public.invoice_lines    enable row level security;
alter table public.invoice_counters enable row level security;  -- aucune policy : accès uniquement via les fonctions

create policy "factures : lecture" on public.invoices for select using (user_id = auth.uid());
create policy "factures : création brouillon" on public.invoices for insert
  with check (user_id = auth.uid() and status = 'draft' and number is null and seller is null and buyer is null);
create policy "factures : modification brouillon" on public.invoices for update
  using (user_id = auth.uid() and status = 'draft')
  with check (user_id = auth.uid() and status = 'draft' and number is null and seller is null and buyer is null);
create policy "factures : suppression brouillon" on public.invoices for delete
  using (user_id = auth.uid() and status = 'draft');

create policy "lignes : lecture" on public.invoice_lines for select using (user_id = auth.uid());
create policy "lignes : écriture brouillon" on public.invoice_lines for all
  using (user_id = auth.uid() and exists (select 1 from public.invoices i where i.id = invoice_id and i.user_id = auth.uid() and i.status = 'draft'))
  with check (user_id = auth.uid() and exists (select 1 from public.invoices i where i.id = invoice_id and i.user_id = auth.uid() and i.status = 'draft'));

-- Droits (cf. 003_grants.sql : rien n'est accordé automatiquement)
grant select, insert, update, delete on public.invoices, public.invoice_lines to authenticated;
grant all on public.invoices, public.invoice_lines, public.invoice_counters to service_role;
revoke all on public.invoices, public.invoice_lines, public.invoice_counters from anon;
-- profiles : les nouvelles colonnes sont couvertes par « grant select, update on public.profiles » (003_grants.sql).
```

**Fonctions de transition** (`security definer`, `set search_path = ''`, vérifient `user_id = auth.uid()`, `grant execute … to authenticated`, `revoke … from public, anon`) :

| Fonction | Effet | Refus (exception `P0001` avec code lisible) |
|---|---|---|
| `issue_invoice(p_id uuid, p_logo_path text) returns text` | Verrouille la facture (`for update`) ; vérifie brouillon, client présent et non archivé, 1 à 50 lignes, `subtotal = sum(line_total)` et `total = subtotal − discount_amount + vat_amount` ; année = année courante (fuseau `Africa/Dakar`) ; `insert … on conflict do nothing` puis `update invoice_counters set last_seq = last_seq + 1 … returning` (verrou de ligne) ; `number = format('FAC-%s-%s', year, lpad(seq::text, 4, '0'))` ; `issue_date` = aujourd’hui ; `due_date` calculée depuis `due_kind` (sauf `date`) ; instantanés `seller` (champs du profil + coordonnées de paiement + `logo_path = p_logo_path`) et `buyer` (champs du client) ; `status = 'issued'`, `issued_at = now()`. Retourne le numéro. | `not_found`, `not_draft`, `no_client`, `no_lines`, `totals_mismatch`, `due_date_past` |
| `mark_invoice_paid(p_id uuid, p_paid_at date, p_method text)` | `issued` → `paid` | `not_found`, `not_issued`, `paid_at_invalid` (avant émission ou dans le futur) |
| `unmark_invoice_paid(p_id uuid)` | `paid` → `issued`, efface date et moyen | `not_found`, `not_paid` |
| `cancel_invoice(p_id uuid)` | `issued` → `cancelled`, `cancelled_at = now()` | `not_found`, `not_issued` (une facture payée doit d’abord voir son paiement annulé) |

**Logo figé** : avant d’appeler `issue_invoice`, la Server Action copie le logo courant (s’il existe) vers `logos/{uid}/factures/{invoice_id}.webp` (`storage.copy`, couvert par les policies du dossier de l’utilisateur) et passe ce chemin. Remplacer ou retirer le logo dans les Paramètres n’affecte donc jamais une facture émise. Si la copie échoue, l’émission se fait sans logo plutôt que d’échouer (log `[factures]`).

**Contenu des instantanés** :
- `seller` : `company_name`, `address`, `city`, `country`, `phone`, `business_email`, `rccm`, `nif`, `logo_path`, `wave_number`, `orange_money_number`, `iban`, `payment_note`.
- `buyer` : `name`, `phone`, `email`, `address`, `city`, `country`, `tax_id`.

Les brouillons affichent les données vivantes (profil et client actuels) ; les factures émises n’affichent que les instantanés.

### 5.2 Calculs (`src/lib/invoice-totals.ts`, fonction pure)

- Unité mineure : XOF/XAF ×1, EUR ×100. Saisie convertie avec `toMinor(currency, "1 250,50")`.
- `line_total = round(quantity × unit_price)` (arrondi à l’unité mineure, demi vers le haut).
- `subtotal = Σ line_total`.
- Remise : `percent` → `round(subtotal × value / 100)` ; `amount` → `toMinor(value)`, refus si > `subtotal`.
- `net = subtotal − discount_amount` ; `vat_amount = round(net × vat_rate / 100)` (un seul arrondi, sur le total) ; `total = net + vat_amount`.
- La Server Action recalcule toujours les totaux côté serveur à partir des lignes ; les totaux affichés en direct dans le formulaire utilisent la même fonction.

### 5.3 Validation (zod, `src/lib/validation.ts` étendu)

- **Facture** : `clientId` uuid facultatif (obligatoire à l’émission) ; `dueKind` ∈ `0|15|30|date` ; `dueDate` requise si `date`, ≥ aujourd’hui ; `currency` ; `vatRate` (règle existante, virgule acceptée) ; `discountType` facultatif ; `discountValue` selon le type ; `note` ≤ 500 ; `lines` 1–50.
- **Ligne** : `description` 1–300 (espaces rognés) ; `quantity` > 0, ≤ 1 000 000, 3 décimales max, virgule acceptée ; `unitPrice` ≥ 0, ≤ 10¹² en unité mineure, décimales selon la devise.
- **Paiement (marquer payée)** : `paidAt` date ≤ aujourd’hui ; `method` ∈ liste.
- **Paramètres de paiement** : `waveNumber` et `orangeMoneyNumber` via `normalizePhone` (facultatifs) ; `iban` ≤ 34 caractères alphanumériques, espaces retirés, majuscules ; `paymentNote` ≤ 300 ; `defaultDueDays` ∈ 0/15/30.
- Les lignes arrivent du formulaire sous forme de champs indexés (`lines[0][description]`…) et sont reconstruites en tableau avant validation.

### 5.4 Statut affiché (`src/lib/invoice-status.ts`)

`displayStatus(invoice, today)` → `draft` | `pending` (émise, échéance ≥ aujourd’hui) | `overdue` (émise, échéance < aujourd’hui) | `paid` | `cancelled`. « Aujourd’hui » = date du jour dans le fuseau `Africa/Dakar` (UTC+0, cohérent avec l’essentiel de la zone). Badges : Brouillon (gris), En attente (ambre), En retard (rouge), Payée (vert), Annulée (gris barré).

## 6. PDF (`src/pdf/InvoiceDocument.tsx`)

- A4 portrait, `@react-pdf/renderer`, police Helvetica intégrée (pas de téléchargement de police), accent `#0F766E`, multi-pages avec en-tête de tableau répété et numéro de page « Page 1/2 ».
- **En-tête** : logo (WebP converti en PNG par `sharp`, 120 px de haut max) + coordonnées vendeur (nom, adresse, ville et pays, téléphone, email, RCCM, NIF/NINEA). À droite : « FACTURE », numéro, date d’émission, échéance (« À réception » ou date).
- **Client** : « Facturé à » + nom, adresse, ville et pays, téléphone, email, identifiant fiscal (champs vides omis).
- **Tableau** : Désignation | Qté | Prix unitaire HT | Total HT.
- **Totaux** : Total HT ; Remise (x % ou montant) et Total HT après remise si remise ; TVA (x %) ou « TVA non applicable » si 0 % ; **Total TTC**.
- **Montant en lettres** : « Arrêtée la présente facture à la somme de {montant en lettres}. »
- **Note** de la facture, puis **Coordonnées de paiement** (Wave, Orange Money, IBAN, autres instructions ; section omise si tout est vide).
- **Tampon** diagonal « PAYÉE » (vert) ou « ANNULÉE » (rouge) ; filigrane « BROUILLON » sur l’aperçu d’un brouillon.
- **Pied** : « Facture créée avec Factoo · Page x/y ».
- Routes : `GET /app/factures/[id]/pdf` (connecté, brouillon ou émise) et `GET /f/[jeton]/pdf` (public, émise/payée/annulée) → `Content-Type: application/pdf`, `Content-Disposition: inline; filename="FAC-2026-0001.pdf"` (`brouillon.pdf` pour un brouillon), `Cache-Control: private, no-store`.
- Les mentions obligatoires par pays et le montant en lettres sont **à faire valider par un comptable de la zone** avant le lancement.

### 6.1 Formatage (`src/lib/money.ts`) et montant en lettres (`src/lib/amount-words.ts`)

- XOF / XAF : « 150 000 FCFA » (espace insécable fine comme séparateur des milliers, aucune décimale). EUR : « 1 250,50 € ».
- Montant en lettres, règles françaises de 1990 non appliquées (forme traditionnelle sans traits d’union systématiques) : « cent cinquante mille francs CFA », « quatre-vingts », « quatre-vingt-un », « soixante et onze », « deux cents », « deux cent un », « mille », « deux millions », « un million », « zéro franc CFA ». EUR : « mille deux cent cinquante euros et cinquante centimes ». Jusqu’à 999 999 999 999.

## 7. Tableau de bord (`/app`, `src/lib/dashboard.ts`)

Montants dans la devise par défaut du profil ; les factures dans une autre devise sont exclues des chiffres, avec la mention « Hors factures en {EUR} » si elles existent.

| Indicateur | Définition |
|---|---|
| Encaissé ce mois-ci | Σ `total` des factures `paid` dont `paid_at` est dans le mois courant ; nombre de factures |
| En attente | Σ `total` des factures `issued` dont l’échéance n’est pas dépassée ; nombre |
| En retard | Σ `total` des factures `issued` dont l’échéance est dépassée ; nombre (carte rouge, clic → `/app/factures?statut=retard`) |
| Encaissé sur 6 mois | Σ `total` des factures `paid` par mois de `paid_at`, 6 derniers mois (mois courant inclus), en barres |
| Dernières factures | 5 factures les plus récemment modifiées, tous statuts, avec badge ; lien « Voir toutes les factures » |

- Les agrégats sont calculés en TypeScript à partir d’une seule requête légère (`status, total, currency, due_date, paid_at` des 12 derniers mois + toutes les émises non payées).
- **Graphique** : composant `RevenueChart` en SVG maison (aucune librairie), barres teal, étiquettes de mois abrégées (« mai », « juin »…), valeur au survol et au toucher, montant compact (« 1,2 M »), lisible à 360 px. Suivre la skill `dataviz` à l’implémentation.
- **Bouton « Nouvelle facture »** en tête de page. État vide (aucune facture) : chiffres à 0 et carte « Créez votre première facture en 2 minutes ».

## 8. Architecture du code

```
supabase/migrations/005_invoices.sql
src/lib/
  money.ts               toMinor, fromMinor, formatMoney, formatCompact
  amount-words.ts        amountInWords(minor, currency)
  invoice-totals.ts      computeTotals(lines, discount, vatRate, currency)
  invoice-status.ts      displayStatus, dueDateFor(kind, from), todayInDakar
  invoices.ts            saveDraft, issueInvoice, markPaid, unmarkPaid, cancelInvoice, deleteDraft (repo injecté)
  dashboard.ts           dashboardStats(rows, currency, today)
  whatsapp.ts            + invoiceWhatsappMessage, invoiceWhatsappLink
  validation.ts          + schémas facture, ligne, paiement, paramètres de paiement
  repos.ts               + invoicesRepo, listInvoices, getInvoice, getPublicInvoice (service_role, filtre jeton + statut)
src/pdf/
  InvoiceDocument.tsx    document @react-pdf
  render.ts              renderInvoicePdf(view) → Buffer (logo WebP → PNG via sharp)
src/app/app/(main)/factures/
  page.tsx, nouvelle/page.tsx, [id]/page.tsx, [id]/pdf/route.ts, actions.ts
src/app/f/[token]/
  page.tsx, pdf/route.ts
src/components/app/
  InvoiceForm, InvoiceLines, ClientPicker, NewClientDialog, InvoiceTotals, InvoiceView (aperçu HTML partagé avec la page publique),
  InvoiceActions, MarkPaidDialog, ConfirmDialog, StatusBadge, RevenueChart, StatCard
```

- **Server Actions** (`factures/actions.ts`) : `saveDraftAction`, `issueAction` (enregistre puis émet en une fois depuis le formulaire), `markPaidAction`, `unmarkPaidAction`, `cancelAction`, `deleteDraftAction` ; même motif que le bloc 2a : `requireUser()` → validation zod → logique pure de `lib/invoices.ts` avec repo injecté → `{ ok: true, redirectTo? } | { ok: false, fieldErrors?, error? }`.
- **Enregistrement d’un brouillon** : upsert de la facture puis remplacement complet des lignes (suppression puis insertion) ; totaux recalculés côté serveur.
- **Page publique** : lecture via le client `service_role` existant (`lib/supabase/admin.ts`), requête strictement filtrée `public_token = $1 and status <> 'draft'`, colonnes explicites (jamais `user_id`, `client_id` ni ids internes exposés).
- **Paramètres** : nouveau composant `PaymentForm` + action `savePaymentAction` ; `BillingForm` reçoit `defaultDueDays`.
- **Navigation** : `NavLinks` active « Factures » ; middleware : `/f/*` reste hors du matcher (aucun appel Supabase Auth).
- **Dépendance ajoutée** : `@react-pdf/renderer` (ajout à `serverExternalPackages` si nécessaire). `outputFileTracingIncludes` (binaires `sharp`) étendu à `/f/**/*`.
- **Landing** : les CTA « Rejoindre la liste d’attente » deviennent « Créer mon compte gratuit » → `/inscription` ; lien « Se connecter » ajouté dans la barre de navigation ; le reste de la landing est inchangé.

## 9. Erreurs et messages

| Cas | Message |
|---|---|
| Émission sans client | « Choisissez un client avant d’émettre la facture. » |
| Émission sans ligne / ligne incomplète | Erreur sous le champ concerné ; « Ajoutez au moins une ligne. » |
| Remise supérieure au total | « La remise ne peut pas dépasser le total HT. » |
| Échéance passée | « L’échéance ne peut pas être dans le passé. » |
| Client archivé entre-temps | « Ce client a été archivé. Choisissez-en un autre. » |
| Facture déjà émise (double clic, autre onglet) | Redirection vers la facture avec « Cette facture a déjà été émise. » |
| Action sur une facture dans un état incompatible | « Cette action n’est plus possible sur cette facture. » + rechargement |
| Date de paiement invalide | « La date de paiement doit être entre la date d’émission et aujourd’hui. » |
| PDF impossible à générer | Page d’erreur « Le PDF n’a pas pu être généré, réessayez. » + log `[pdf]` |
| Erreur inattendue | « Un souci technique, réessayez. » + log serveur `[factures]` |

Les codes d’exception des fonctions SQL (`not_draft`, `no_client`…) sont traduits dans `lib/invoices.ts` ; aucune erreur brute n’est affichée.

## 10. Tests

- **Unitaires (Vitest)** :
  - `money` : `toMinor` / `formatMoney` XOF, XAF, EUR, virgule française, valeurs limites.
  - `amount-words` : 0, 1, 16, 17, 21, 71, 80, 81, 91, 100, 101, 200, 201, 1 000, 1 001, 80 000, 200 000, 1 000 000, 2 000 000, 150 000 FCFA, 1 250,50 €.
  - `invoice-totals` : sans remise, remise % et montant, remise = total, TVA 0 / 18 / 19,25 %, quantités décimales, arrondis.
  - `invoice-status` : chaque statut, échéance aujourd’hui (pas en retard), hier (en retard), `dueDateFor` pour 0 / 15 / 30 jours.
  - `dashboard` : mois courant, bascule de mois, devise exclue, 6 mois avec mois vides.
  - `invoices` : chaque action avec repo simulé (succès, validation, codes SQL traduits, utilisateur absent).
  - `whatsapp` : message avec et sans échéance, lien avec et sans numéro.
  - `validation` : lignes indexées, bornes, virgule.
- **Sécurité (`npm run check:rls` étendu)** : B ne lit pas, ne modifie pas, ne supprime pas, n’émet pas, ne marque pas payée une facture de A ; A ne peut pas modifier une facture émise ni ses lignes par l’API ; A ne peut pas insérer une facture avec un statut autre que brouillon ; 10 émissions simultanées de A donnent `FAC-AAAA-0001` à `0010` sans doublon ni trou ; un visiteur anonyme n’a aucun accès aux tables ; la page publique répond 404 pour un brouillon et un faux jeton.
- **Navigateur (Playwright, hors projet, sur la production après déploiement)** : compte de test → paramètres de paiement → nouvelle facture (nouveau client depuis le formulaire, 3 lignes, remise, TVA) → brouillon → émission → PDF (réponse `application/pdf` non vide) → page publique → marquer payée → tableau de bord à jour ; à 360 px et 1440 px, aucun débordement horizontal.
- **Manuel (utilisateur)** : envoi WhatsApp réel sur téléphone, ouverture du lien par un tiers, lecture du PDF sur mobile.

## 11. Configuration externe (faite par l’utilisateur, guidée)

1. **Supabase → SQL Editor** : exécuter `005_invoices.sql`.
2. Aucune nouvelle variable d’environnement (`NEXT_PUBLIC_SITE_URL` existe déjà ; vérifier qu’elle vaut `https://factoo-wine.vercel.app` sur Vercel).

## 12. Livrables

- Migration `005`, code du bloc, tests verts, `npm run build` sans erreur, `npm run check:rls` vert.
- Landing basculée vers l’inscription.
- Déploiement Vercel vérifié par le parcours Playwright.
- À valider par un comptable avant lancement commercial : mentions obligatoires par pays, montant en lettres, « TVA non applicable », taux de TVA par pays.
