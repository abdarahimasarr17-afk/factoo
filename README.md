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
