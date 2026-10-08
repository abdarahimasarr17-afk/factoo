# Factoo — Landing page

Landing page pré-lancement de Factoo : présentation du produit et liste d’attente (Supabase) avec contact WhatsApp.

## Démarrer

```bash
npm install
cp .env.example .env.local   # puis remplir les valeurs
npm run dev                  # http://localhost:3000
```

## Supabase

1. Créer un projet sur https://supabase.com.
2. SQL Editor → coller et exécuter `supabase/migrations/001_waitlist.sql`.
3. Project Settings → API : copier l’URL et la clé `service_role` dans `.env.local`.
4. Les inscrits sont visibles dans Table Editor → `waitlist`.

## Scripts

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm test` | Tests unitaires (Vitest) |
| `npm run lint` | ESLint |
| `npm run build` | Build de production |

## Déploiement (Vercel)

1. Pousser le dépôt sur GitHub, puis « Import Project » sur Vercel.
2. Renseigner les 4 variables de `.env.example` dans Settings → Environment Variables.
3. Déployer. Tester l’aperçu du lien en le collant dans WhatsApp.

## Documentation

- Spec : `docs/superpowers/specs/2026-09-24-landing-page-design.md`
- Plan : `docs/superpowers/plans/2026-09-24-landing-page.md`

## Application (bloc 2a : comptes, profil, clients)

### Base de données

Dans Supabase → SQL Editor, exécuter dans l’ordre :
`001_waitlist.sql`, `002_profiles_clients.sql`, `003_grants.sql`, `004_logos_select.sql`.

Vérifier ensuite l’isolation entre comptes : `npm run check:rls` (10 lignes `PASS` attendues).

### Variables d’environnement

| Variable | Où la trouver | Type sur Vercel |
|---|---|---|
| `SUPABASE_URL` | Project Settings → API | Secrète |
| `SUPABASE_SERVICE_ROLE_KEY` | API Keys → Secret key (`sb_secret_…`) | Secrète |
| `NEXT_PUBLIC_SUPABASE_URL` | même valeur que `SUPABASE_URL` | Configuration |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | API Keys → Publishable key (`sb_publishable_…`) | Configuration |

### Emails de connexion (code à 6 chiffres)

Supabase → Authentication → Emails (longueur du code OTP : 6).

- **Confirm signup** — Objet : `Votre code Factoo : {{ .Token }}` — Corps :
  ```html
  <h2>Bienvenue sur Factoo</h2>
  <p>Votre code de confirmation :</p>
  <p style="font-size:32px;font-weight:800;letter-spacing:6px">{{ .Token }}</p>
  <p>Ce code expire dans 1 heure. Si vous n’avez pas créé de compte, ignorez cet email.</p>
  ```
- **Reset password** — Objet : `Votre code de réinitialisation Factoo : {{ .Token }}` — Corps :
  ```html
  <h2>Mot de passe oublié</h2>
  <p>Pour choisir un nouveau mot de passe, saisissez ce code :</p>
  <p style="font-size:32px;font-weight:800;letter-spacing:6px">{{ .Token }}</p>
  <p>Ce code expire dans 1 heure. Si vous n’êtes pas à l’origine de cette demande, ignorez cet email.</p>
  ```

**Envoi via Resend** — Supabase → Authentication → SMTP : hôte `smtp.resend.com`, port `465`, utilisateur `resend`, mot de passe = clé API Resend, expéditeur `onboarding@resend.dev` tant qu’aucun domaine n’est vérifié (en mode test, Resend n’envoie qu’à l’adresse du compte Resend).

### Connexion Google

1. Google Cloud Console → APIs & Services → identifiant OAuth « Application Web », URI de redirection autorisée : `https://<projet>.supabase.co/auth/v1/callback`.
2. Supabase → Authentication → Providers → Google : coller le Client ID et le Client secret.

### Adresses autorisées

Supabase → Authentication → URL Configuration : Site URL `https://factoo-wine.vercel.app` ; Redirect URLs `http://localhost:3000/**` et `https://factoo-wine.vercel.app/**`.
