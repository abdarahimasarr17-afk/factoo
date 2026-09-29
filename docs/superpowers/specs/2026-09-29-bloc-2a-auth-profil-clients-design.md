# Factoo — Bloc 2a : Authentification, onboarding, profil entreprise, clients — Design

**Date** : 2026-09-29
**Statut** : validé en brainstorming, en attente de relecture
**Périmètre PRD** : F1, F2, F3, F4, F13, F14 (sans les totaux), F15 (préparé pour 2b), F29.
**Suite** : le bloc 2b (factures, PDF, envoi WhatsApp, marquage « Payée », tableau de bord) s'appuie sur ce bloc.

## 1. Objectif

Permettre à un freelance ou une PME de créer un compte Factoo (Google ou email + code à 6 chiffres), de renseigner son entreprise une fois pour toutes, et de gérer son répertoire de clients — le socle nécessaire pour facturer au bloc 2b.

## 2. Hors périmètre

- Factures, PDF, tableau de bord réel, totaux par client (bloc 2b).
- Paiement en ligne, abonnement Pro, relances (blocs 3 à 5).
- Suppression définitive du compte, changement d'adresse email.
- Domaine personnalisé : pendant le développement, Resend n'envoie qu'à l'adresse du propriétaire du compte Resend (mode test). Le domaine est branché avant l'ouverture aux inscrits.
- Landing page : **inchangée** pendant le bloc 2a (CTA → liste d'attente). `/inscription` est accessible par lien direct pour les testeurs. Bascule des CTA vers l'inscription à la fin du bloc 2b.

## 3. Décisions

| Sujet | Décision |
|---|---|
| Architecture | Supabase Auth côté serveur via `@supabase/ssr` (sessions en cookies), Server Actions, middleware Next.js, RLS par utilisateur |
| Emails d'auth | Serveur SMTP Resend branché dans Supabase |
| Google | Activé dès ce bloc (Google Cloud OAuth → provider Supabase) |
| Confirmation email | Code à 6 chiffres (OTP), pas de lien magique |
| Mot de passe oublié | Même mécanique : email → code à 6 chiffres → nouveau mot de passe |
| TVA | Taux toujours présent, prérempli selon le pays, modifiable ; aide « Pas assujetti à la TVA ? Mettez 0 % ». Au bloc 2b, 0 % ⇒ mention « TVA non applicable » (à faire valider par un comptable de la zone) |
| Suppression client | Archivage (`archived_at`), jamais d'effacement physique |
| Logo | Supabase Storage, redimensionné serveur à 512 px max en WebP |
| Langue / ton | Français, vouvoiement, apostrophe typographique `’` dans le JSX |

## 4. Parcours et écrans

### 4.1 Pages publiques

| Route | Contenu |
|---|---|
| `/inscription` | Bouton « Continuer avec Google » ; séparateur « ou » ; email, mot de passe (≥ 8 caractères, bouton afficher/masquer), case « J’accepte les CGU et la politique de confidentialité » (liens vers `/cgu`, `/confidentialite`). Lien « Déjà un compte ? Se connecter ». |
| `/inscription/code?email=…` | Champ code 6 chiffres (`inputMode="numeric"`, `autoComplete="one-time-code"`), bouton « Valider », lien « Renvoyer le code » désactivé 60 s après chaque envoi (compte à rebours affiché). |
| `/connexion` | Google ; email + mot de passe ; lien « Mot de passe oublié ? » ; lien « Pas encore de compte ? Créer un compte ». Paramètre `?next=` conservé pour revenir à la page demandée. |
| `/mot-de-passe-oublie` | Étape 1 : email → envoi du code. Étape 2 : code + nouveau mot de passe → connexion et redirection vers `/app`. |
| `/auth/callback` | Route de retour OAuth Google : échange du code contre une session, puis redirection (`/app/bienvenue` si onboarding non fait, sinon `next` ou `/app`). |

Les pages publiques d’auth reprennent l’identité de la landing : fond `#04201D`, carte blanche centrée, bouton principal vert `#00C853` texte noir. Métadonnée `robots: noindex` sur toutes les pages d’auth et `/app`.

### 4.2 Application (`/app`, protégée)

**Coque** : barre latérale sur ordinateur (≥ `lg`), barre d’onglets fixe en bas sur mobile, 4 entrées : Tableau de bord (`/app`), Factures (grisé, badge « Bientôt », non cliquable), Clients (`/app/clients`), Paramètres (`/app/parametres`). En-tête : logo + nom de l’entreprise (ou « Mon entreprise »), menu avec « Se déconnecter ». Fond de travail clair (`#F8FAFC`), en-tête/barre latérale `#04201D`.

| Route | Contenu |
|---|---|
| `/app/bienvenue` | Onboarding 3 étapes avec indicateur de progression et « Passer » à chaque étape : ① nom de l’entreprise ; ② pays (préremplit devise et TVA, cf. §5.3) ; ③ logo (facultatif). « Terminer » ou « Passer » renseigne `onboarded_at` puis redirige vers `/app`. |
| `/app` | Accueil provisoire : « Bonjour {prénom ou nom d’entreprise} », jauge « Profil complété à X % » (7 champs : nom d’entreprise, pays, adresse, téléphone, RCCM, NIF, logo), raccourcis « Ajouter un client » et « Compléter mon profil », carte « Vos factures arrivent bientôt ». |
| `/app/clients` | Recherche (`?q=`, sur nom et téléphone), liste triée par nom (non archivés) : nom, téléphone, email. État vide : « Aucun client pour l’instant » + bouton « Ajouter un client ». Bouton flottant « + » sur mobile. |
| `/app/clients/nouveau` | Formulaire client (cf. §5.2). Après enregistrement → retour à la liste avec message « Client ajouté ✓ ». |
| `/app/clients/[id]` | Même formulaire prérempli ; bouton « Archiver ce client » avec confirmation (« Ses futures factures resteront consultables »). Client introuvable ou d’un autre utilisateur → 404. |
| `/app/parametres` | 3 blocs enregistrables séparément : **Entreprise** (nom, adresse, ville, pays, téléphone, email professionnel, RCCM, NIF, logo avec aperçu / remplacer / retirer) ; **Facturation** (devise par défaut XOF/XAF/EUR, taux de TVA % avec l’aide « Pas assujetti à la TVA ? Mettez 0 % ») ; **Compte** (email en lecture seule, changement de mot de passe — absent pour un compte Google sans mot de passe —, déconnexion). |

### 4.3 Règles de navigation (middleware + layout)

1. Non connecté sur `/app/*` → `/connexion?next={chemin}`.
2. Connecté sur `/connexion`, `/inscription`, `/mot-de-passe-oublie` → `/app`.
3. Connecté, `onboarded_at` vide, sur une page `/app/*` autre que `/app/bienvenue` → `/app/bienvenue`.
4. Après inscription (code validé ou Google) → `/app/bienvenue`.
5. Le middleware rafraîchit la session Supabase à chaque requête (pattern officiel `@supabase/ssr`).

## 5. Données

### 5.1 Migration `supabase/migrations/002_profiles_clients.sql`

```sql
create table public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  full_name      text,
  company_name   text,
  address        text,
  city           text,
  country        text check (country in ('SN','CI','ML','BF','BJ','TG','NE','CM','OTHER')),
  phone          text,
  business_email text,
  rccm           text,
  nif            text,
  logo_path      text,
  currency       text not null default 'XOF' check (currency in ('XOF','XAF','EUR')),
  vat_rate       numeric(5,2) not null default 18 check (vat_rate >= 0 and vat_rate <= 100),
  onboarded_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table public.clients (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null check (length(trim(name)) > 0),
  phone       text,
  email       text,
  address     text,
  city        text,
  country     text check (country in ('SN','CI','ML','BF','BJ','TG','NE','CM','OTHER')),
  tax_id      text,
  archived_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index clients_user_active_idx on public.clients (user_id, name) where archived_at is null;

-- updated_at automatique
create function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger clients_touch  before update on public.clients  for each row execute function public.touch_updated_at();

-- Profil créé à l'inscription (nom repris de Google si disponible)
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.clients  enable row level security;
create policy "profil : lecture" on public.profiles for select using (id = auth.uid());
create policy "profil : mise à jour" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "clients : lecture" on public.clients for select using (user_id = auth.uid());
create policy "clients : création" on public.clients for insert with check (user_id = auth.uid());
create policy "clients : mise à jour" on public.clients for update using (user_id = auth.uid()) with check (user_id = auth.uid());
-- Pas de policy delete : l'archivage passe par update.

-- Stockage des logos : bucket public en lecture, écriture limitée au dossier de l'utilisateur
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos', 'logos', true, 5242880, array['image/png','image/jpeg','image/webp']);
create policy "logos : écriture perso" on storage.objects for insert to authenticated
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "logos : remplacement perso" on storage.objects for update to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "logos : suppression perso" on storage.objects for delete to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);
```

### 5.2 Validation (zod, `src/lib/validation.ts` étendu)

- **Téléphone** : logique extraite de la liste d’attente dans une fonction partagée `normalizePhone(countryCode, phone)` → E.164 ; 8 à 10 chiffres locaux. La liste d’attente l’utilise aussi (ses tests existants doivent rester verts).
- **Client** : `name` obligatoire (1–120 caractères, espaces rognés) ; `phone` facultatif mais recommandé (champ mis en avant, validé s’il est rempli) ; `email` facultatif (format valide, minuscules) ; `address`, `city` ≤ 200 ; `country` ∈ liste ; `tax_id` ≤ 50.
- **Profil entreprise** : `company_name` ≤ 120 ; `address`, `city` ≤ 200 ; `country` ∈ liste ; `phone` (même règle) ; `business_email` ; `rccm`, `nif` ≤ 50.
- **Facturation** : `currency` ∈ XOF/XAF/EUR ; `vat_rate` nombre 0–100, virgule française acceptée (« 19,25 »), 2 décimales max.
- **Auth** : email valide ; mot de passe ≥ 8 caractères ; code = exactement 6 chiffres (espaces ignorés) ; case CGU cochée.

### 5.3 Valeurs par pays (`src/lib/site.ts`)

| Pays | Devise | TVA préremplie |
|---|---|---|
| SN, CI, ML, BF, BJ, TG | XOF | 18 % |
| NE | XOF | 19 % |
| CM | XAF | 19,25 % |
| OTHER | XOF | 0 % |

Le préremplissage s’applique à l’onboarding et quand l’utilisateur change de pays dans les paramètres **si** il n’a pas modifié la TVA à la main dans le même formulaire. Taux à faire valider par un comptable avant lancement.

## 6. Architecture du code

```
src/
  middleware.ts                       rafraîchit la session, applique §4.3 (règles 1 et 2)
  lib/supabase/
    server.ts                         createServerClient (cookies Next) — pages et Server Actions
    browser.ts                        createBrowserClient — bouton Google uniquement
    middleware.ts                     updateSession(request)
    admin.ts                          (ex-lib/supabase.ts) client service_role, liste d’attente
  lib/auth-errors.ts                  traduction des erreurs Supabase Auth en français
  lib/phone.ts                        normalizePhone partagé
  lib/profile.ts                      profileCompletion(profile) → 0..100 ; defaultsForCountry(code)
  lib/validation.ts                   schémas zod (waitlist, client, profil, facturation, auth)
  app/(auth)/                         layout public fond #04201D
    inscription/page.tsx, inscription/code/page.tsx, connexion/page.tsx, mot-de-passe-oublie/page.tsx
    actions.ts                        signUp, verifySignupCode, resendSignupCode, signIn, requestPasswordReset, resetPassword, signOut
  app/auth/callback/route.ts          échange du code OAuth
  app/app/
    layout.tsx                        coque (sidebar / onglets), garde onboarding (règle 3)
    page.tsx                          accueil provisoire
    bienvenue/page.tsx + actions.ts   onboarding
    clients/page.tsx, clients/nouveau/page.tsx, clients/[id]/page.tsx, clients/actions.ts
    parametres/page.tsx + actions.ts  profil, facturation, logo, mot de passe
  components/app/                     AppShell, NavLinks, ClientForm, ProfileForm, BillingForm, LogoUpload, OtpInput, GoogleButton, SubmitButton, FlashMessage
```

- Chaque Server Action : `"use server"` → lecture de l’utilisateur via `supabase.auth.getUser()` → validation zod → appel Supabase → résultat typé `{ ok: true } | { ok: false, fieldErrors?, error? }` ; même motif testable que `submitWaitlist` (logique pure dans `src/lib/*` avec client injecté).
- **Mécanique Supabase** : inscription `auth.signUp` (email template « Confirm signup » affichant `{{ .Token }}`) → `auth.verifyOtp({ type: "email" })` ; renvoi `auth.resend({ type: "signup" })` ; oubli `auth.resetPasswordForEmail` (template « Reset password » avec `{{ .Token }}`) → `auth.verifyOtp({ type: "recovery" })` → `auth.updateUser({ password })` ; Google `auth.signInWithOAuth({ provider: "google", options: { redirectTo: {origin}/auth/callback?next=… } })`.
- **Logo** : Server Action reçoit le fichier (≤ 5 Mo, PNG/JPG/WebP), `sharp` → 512 px max côté long, WebP qualité 85 → upload `logos/{uid}/logo-{timestamp}.webp` (nom horodaté pour éviter le cache), suppression de l’ancien fichier, mise à jour `logo_path`.
- Formulaires : composants client avec `useActionState`, champs contrôlés (conservation de la saisie en cas d’erreur), bouton en état de chargement.

## 7. Configuration externe (guidée pas à pas, faite par l’utilisateur)

1. **Supabase → SQL Editor** : exécuter `002_profiles_clients.sql`.
2. **Supabase → Authentication → Emails** : modèles « Confirm signup » et « Reset password » en français avec `{{ .Token }}` (textes fournis) ; longueur OTP 6.
3. **Resend** : compte, clé API → **Supabase → Authentication → SMTP** (hôte `smtp.resend.com`, port 465, utilisateur `resend`, mot de passe = clé API, expéditeur `onboarding@resend.dev` en mode test).
4. **Google Cloud Console** : projet, écran de consentement (externe), identifiant OAuth « Application Web » avec URI de redirection `https://{projet}.supabase.co/auth/v1/callback` → **Supabase → Authentication → Providers → Google** (Client ID + secret).
5. **Supabase → Authentication → URL Configuration** : Site URL `https://factoo-wine.vercel.app` ; Redirect URLs `http://localhost:3000/**`, `https://factoo-wine.vercel.app/**`.
6. **Variables d’environnement** (local + Vercel) : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (clé *publishable*/anon). `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` restent pour la liste d’attente.

## 8. Erreurs et messages

| Cas | Message affiché |
|---|---|
| Identifiants invalides | « Email ou mot de passe incorrect. » |
| Email non confirmé à la connexion | « Confirmez d’abord votre email » + renvoi du code et redirection vers `/inscription/code` |
| Email déjà inscrit | « Cet email a déjà un compte. Connectez-vous. » (lien) |
| Code invalide / expiré | « Code incorrect ou expiré. Demandez-en un nouveau. » |
| Limite d’envoi / trop de tentatives | « Trop de tentatives. Réessayez dans une minute. » |
| Mot de passe trop court | « 8 caractères minimum. » |
| Erreur Google (annulation, refus) | Retour sur `/connexion` avec « Connexion Google annulée ou impossible. » |
| Logo trop lourd / mauvais format | « Image trop lourde (5 Mo max) » / « Format accepté : PNG, JPG ou WebP » |
| Erreur inattendue | « Un souci technique, réessayez. » + log serveur `[auth]`, `[clients]`, `[profil]` |

Aucune erreur brute de Supabase n’est affichée ; toutes passent par `lib/auth-errors.ts` ou un message générique.

## 9. Tests

- **Unitaires (Vitest)** : schémas zod (client, profil, facturation, auth, virgule décimale) ; `normalizePhone` (tests existants de la liste d’attente conservés) ; `profileCompletion` ; `defaultsForCountry` ; traduction des erreurs Auth ; logique de chaque action avec client Supabase simulé (succès, validation, erreur, utilisateur absent).
- **Sécurité (script `scripts/check-rls.ts`, exécuté à la main)** : crée 2 comptes confirmés via l’API admin, vérifie que A ne peut ni lire, ni modifier, ni archiver un client de B, ni écrire dans le dossier logo de B ; supprime les comptes à la fin.
- **Navigateur (Playwright, hors projet)** : connexion d’un compte de test confirmé → onboarding → création / modification / archivage d’un client → paramètres (profil, TVA « 19,25 », logo) → déconnexion ; à 360 px et 1440 px ; aucun débordement horizontal.
- **Manuel (utilisateur)** : vrai parcours d’inscription avec réception du code par email, mot de passe oublié, connexion Google.

## 10. Livrables

- Migration `002`, code du bloc, tests verts, `npm run build` sans erreur.
- README complété (configuration Supabase Auth, Resend, Google, nouvelles variables).
- Déploiement Vercel avec les nouvelles variables ; landing inchangée.
