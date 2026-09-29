# Bloc 2a — Authentification, onboarding, profil, clients — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre de créer un compte Factoo (Google ou email + code à 6 chiffres), de renseigner son entreprise et de gérer ses clients, dans une application `/app` protégée.

**Architecture:** Supabase Auth côté serveur via `@supabase/ssr` (sessions en cookies, middleware Next.js limité aux routes d’auth et `/app`). Toute la logique métier vit dans des fonctions pures de `src/lib/*` qui reçoivent leurs dépendances (API d’auth, dépôts de données) en paramètre — même motif testable que `submitWaitlist`. Les Server Actions ne font que brancher ces fonctions sur Supabase et rediriger. RLS par `auth.uid()` sur toutes les tables et le stockage des logos.

**Tech Stack:** Next.js 15 (App Router, Server Actions), React 19 (`useActionState`), TypeScript, Tailwind v4, `@supabase/ssr` 0.12, `@supabase/supabase-js` 2, zod 3, sharp, Vitest, playwright-core (hors projet).

**Spec:** `docs/superpowers/specs/2026-09-29-bloc-2a-auth-profil-clients-design.md`

## Global Constraints

- Français uniquement, **vouvoiement** ; apostrophe typographique `’` dans le texte JSX (règle ESLint `react/no-unescaped-entities`).
- Vert d’action `#00C853` (texte noir dessus) ; liens texte sur fond blanc en `#007A33` (contraste AA) ; fond auth / barre latérale `#04201D` ; fond de travail de l’app `#F8FAFC`, textes `slate-*`.
- **Ne jamais combiner** une classe `hidden` avec une classe `flex`/`inline-flex`/`block` sur le même élément (conflit d’ordre CSS Tailwind déjà rencontré) : masquer via un conteneur.
- Aucune erreur brute Supabase affichée : passer par `authErrorMessage` ou `GENERIC_ERROR` (« Un souci technique, réessayez. »), et journaliser côté serveur avec un préfixe `[auth]`, `[clients]`, `[profil]`.
- Formulaires : champs **contrôlés** (React 19 réinitialise les champs non contrôlés après une action), `noValidate`, état initial `{}`.
- Mobile d’abord (360 px), aucun débordement horizontal ; `robots: noindex` sur les pages d’auth et `/app`.
- Valeurs par pays : SN, CI, ML, BF, BJ, TG → XOF 18 % ; NE → XOF 19 % ; CM → XAF 19,25 % ; OTHER → XOF 0 %.
- Chaque tâche se termine par `npm run lint`, `npm test`, `npm run build` verts avant commit.

## Écarts assumés par rapport à la spec

- **Logo** : bloc « Logo » distinct dans les paramètres (au lieu d’un champ dans le formulaire Entreprise) — un fichier ne se mélange pas bien avec un formulaire texte contrôlé.
- **Changement de pays dans les paramètres** : pays et TVA étant dans deux formulaires séparés, la règle « ne pas écraser une TVA saisie à la main » est appliquée ainsi : la devise et la TVA sont réalignées sur le nouveau pays **seulement si** la TVA actuelle est égale au taux par défaut de l’ancien pays (18 si aucun pays).
- **Libellé mobile** : l’onglet « Tableau de bord » s’affiche « Accueil » dans la barre du bas (place limitée).
- **Taille des envois** : `serverActions.bodySizeLimit` passé à `6mb` pour accepter les logos de 5 Mo.

## File Map

| Fichier | Responsabilité |
|---|---|
| `src/middleware.ts` | Branche `updateSession` sur les routes d’auth et `/app` |
| `src/lib/supabase/{server,browser,middleware,admin}.ts` | Clients Supabase (serveur à cookies, navigateur, middleware, service_role) + `authApi`, `requireUser` |
| `src/lib/routes.ts` | `routeDecision`, `safeNext` (règles de redirection pures) |
| `src/lib/form-state.ts` | Type `FormState`, `GENERIC_ERROR` |
| `src/lib/validation.ts` | Schémas zod : liste d’attente (inchangée), client, entreprise, facturation, onboarding, auth |
| `src/lib/phone.ts` | `splitPhone`, `formatPhone` |
| `src/lib/profile.ts` | Type `Profile`, `profileCompletion`, `displayName`, `logoUrl` |
| `src/lib/auth-errors.ts` | Traduction des erreurs Supabase Auth |
| `src/lib/auth.ts` | Logique d’inscription / connexion / code / mot de passe |
| `src/lib/logo.ts` | `prepareLogo` (contrôle + redimensionnement sharp) |
| `src/lib/clients.ts` | Types `Client`, `ClientsRepo` ; `saveClient`, `archiveClient`, `clientToFormValues` |
| `src/lib/settings.ts` | `ProfileRepo` ; `saveCompany`, `saveBilling`, `finishOnboarding`, `saveLogo`, `deleteLogo` |
| `src/lib/db.ts` | Type `DbResult` |
| `src/lib/repos.ts` | Implémentations Supabase des dépôts + lectures (`getProfile`, `listClients`, `getClient`) |
| `src/lib/session.ts` | `getSession()` mis en cache par requête |
| `src/lib/use-form-values.ts` | Hook de champs contrôlés |
| `src/app/(auth)/…` | Layout + pages inscription, code, connexion, mot de passe oublié + `actions.ts` |
| `src/app/auth/callback/route.ts` | Retour OAuth Google |
| `src/app/app/layout.tsx`, `src/app/app/(main)/layout.tsx` | Métadonnées ; coque + garde d’onboarding |
| `src/app/app/(main)/page.tsx` | Accueil provisoire |
| `src/app/app/bienvenue/{page,actions}.tsx` | Onboarding |
| `src/app/app/(main)/clients/…` | Liste, création, édition, archivage |
| `src/app/app/(main)/parametres/…` | Entreprise, logo, facturation, compte |
| `src/components/forms/*` | `Field`, `inputClass`, `FormMessage`, `SubmitButton`, `PasswordInput`, `PhoneFields`, `CountrySelect` |
| `src/components/auth/*` | `GoogleButton`, `Divider`, formulaires d’auth |
| `src/components/app/*` | `AppShell`, `NavLinks`, `OnboardingWizard`, `ClientForm`, `ArchiveClientButton`, `CompanyForm`, `BillingForm`, `LogoForm`, `PasswordForm` |
| `supabase/migrations/002_profiles_clients.sql` | Tables, triggers, RLS, bucket |
| `scripts/check-rls.mjs` | Vérification d’isolation entre deux comptes |

---

### Task 1: Clients Supabase SSR, middleware et règles de redirection

**Files:**
- Move: `src/lib/supabase.ts` → `src/lib/supabase/admin.ts`
- Modify: `src/app/actions/waitlist.ts` (import), `next.config.ts`, `.env.example`, `package.json`
- Create: `src/lib/routes.ts`, `src/lib/routes.test.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/browser.ts`, `src/lib/supabase/middleware.ts`, `src/middleware.ts`

**Interfaces:**
- Produces: `routeDecision(pathname: string, search: string, isAuthed: boolean): string | null` ; `safeNext(next: string | null | undefined): string` ; `createClient()` (serveur, async) ; `createBrowserSupabase()` ; `updateSession(request)` ; `getSupabaseAdmin()` (inchangé, nouveau chemin `@/lib/supabase/admin`).

- [ ] **Step 1: Installer les dépendances**

```bash
npm i @supabase/ssr@0.12 sharp
```

- [ ] **Step 2: Déplacer le client service_role**

```bash
mkdir -p src/lib/supabase && git mv src/lib/supabase.ts src/lib/supabase/admin.ts
```
Dans `src/app/actions/waitlist.ts`, remplacer `import { getSupabaseAdmin } from "@/lib/supabase";` par `import { getSupabaseAdmin } from "@/lib/supabase/admin";`.

- [ ] **Step 3: Écrire le test qui échoue `src/lib/routes.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { routeDecision, safeNext } from "@/lib/routes";

describe("routeDecision", () => {
  it("renvoie un visiteur de /app vers la connexion en gardant la page demandée", () => {
    expect(routeDecision("/app/clients", "?q=awa", false)).toBe("/connexion?next=%2Fapp%2Fclients%3Fq%3Dawa");
    expect(routeDecision("/app", "", false)).toBe("/connexion?next=%2Fapp");
  });

  it("laisse passer un utilisateur connecté sur /app", () => {
    expect(routeDecision("/app/parametres", "", true)).toBeNull();
  });

  it("renvoie un utilisateur connecté des pages d’auth vers /app", () => {
    expect(routeDecision("/connexion", "", true)).toBe("/app");
    expect(routeDecision("/inscription/code", "?email=a%40b.sn", true)).toBe("/app");
    expect(routeDecision("/mot-de-passe-oublie", "", true)).toBe("/app");
  });

  it("laisse un visiteur sur les pages d’auth et ignore le reste du site", () => {
    expect(routeDecision("/connexion", "", false)).toBeNull();
    expect(routeDecision("/", "", false)).toBeNull();
    expect(routeDecision("/application", "", false)).toBeNull();
  });
});

describe("safeNext", () => {
  it("accepte uniquement une destination interne à /app", () => {
    expect(safeNext("/app/clients?q=a")).toBe("/app/clients?q=a");
    expect(safeNext("/app")).toBe("/app");
    expect(safeNext("https://evil.example")).toBe("/app");
    expect(safeNext("//evil.example/app")).toBe("/app");
    expect(safeNext("/connexion")).toBe("/app");
    expect(safeNext(null)).toBe("/app");
  });
});
```

- [ ] **Step 4: Lancer le test pour vérifier l’échec**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "@/lib/routes"`.

- [ ] **Step 5: Implémenter `src/lib/routes.ts`**

```ts
const AUTH_PAGES = ["/connexion", "/inscription", "/mot-de-passe-oublie"];

const isAppPath = (path: string) => path === "/app" || path.startsWith("/app/") || path.startsWith("/app?");

export function routeDecision(pathname: string, search: string, isAuthed: boolean): string | null {
  if (isAppPath(pathname)) {
    return isAuthed ? null : `/connexion?next=${encodeURIComponent(pathname + search)}`;
  }
  const onAuthPage = AUTH_PAGES.some((page) => pathname === page || pathname.startsWith(`${page}/`));
  return isAuthed && onAuthPage ? "/app" : null;
}

export function safeNext(next: string | null | undefined): string {
  return next && isAppPath(next) ? next : "/app";
}
```

- [ ] **Step 6: Relancer les tests**

Run: `npm test`
Expected: PASS (25 tests).

- [ ] **Step 7: Créer `src/lib/supabase/server.ts`**

```ts
import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Appelé depuis un Server Component : le middleware se charge de rafraîchir la session.
        }
      },
    },
  });
}

export type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");
  return { supabase, user };
}
```

(L’adaptateur `authApi` est ajouté à ce fichier à la Task 4, Step 5, une fois l’interface `AuthApi` créée.)

- [ ] **Step 8: Créer `src/lib/supabase/browser.ts`**

```ts
import { createBrowserClient } from "@supabase/ssr";

export function createBrowserSupabase() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}
```

- [ ] **Step 9: Créer `src/lib/supabase/middleware.ts`**

```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { routeDecision } from "@/lib/routes";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const target = routeDecision(request.nextUrl.pathname, request.nextUrl.search, Boolean(user));
  if (!target) return response;

  const url = request.nextUrl.clone();
  const [pathname, query] = target.split("?");
  url.pathname = pathname;
  url.search = query ? `?${query}` : "";
  const redirect = NextResponse.redirect(url);
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}
```

- [ ] **Step 10: Créer `src/middleware.ts`**

```ts
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

// Limité à l’auth et à l’application : la landing reste statique et sans appel Supabase.
export const config = {
  matcher: ["/app", "/app/:path*", "/connexion", "/inscription", "/inscription/:path*", "/mot-de-passe-oublie"],
};
```

- [ ] **Step 11: Mettre à jour `next.config.ts`**

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" }],
  },
  experimental: {
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default nextConfig;
```

- [ ] **Step 12: Compléter `.env.example`** (ajouter à la fin)

```bash
# Supabase côté navigateur et session (Project Settings > API : URL + clé "publishable"/anon).
# Sur Vercel : type "Configuration" (pas "Secrète"), car ces valeurs sont publiques.
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

- [ ] **Step 13: Vérifier**

Run: `npm run lint && npm test && npm run build`
Expected: tout vert ; la sortie du build liste `ƒ Middleware`.

- [ ] **Step 14: Commit**

```bash
git add -A
git commit -m "feat(auth): clients Supabase SSR, middleware et règles de redirection"
```

---

### Task 2: Validation, valeurs par pays, téléphone, profil, erreurs d’auth

**Files:**
- Modify: `src/lib/site.ts`, `src/lib/validation.ts`, `src/lib/validation.test.ts`
- Create: `src/lib/form-state.ts`, `src/lib/phone.ts`, `src/lib/phone.test.ts`, `src/lib/profile.ts`, `src/lib/profile.test.ts`, `src/lib/auth-errors.ts`, `src/lib/auth-errors.test.ts`, `src/lib/db.ts`

**Interfaces:**
- Consumes: `COUNTRY_CODES`, `COUNTRIES`, `PROFILE_VALUES` (existants).
- Produces:
  - `CURRENCIES`, `Currency`, `CURRENCY_LABELS`, `COUNTRY_DEFAULTS: Record<CountryCode, { currency: Currency; vatRate: number }>`
  - `FormState<K>` = `{ ok?: boolean; message?: string; fieldErrors?: Partial<Record<K, string>>; redirectTo?: string }`, `GENERIC_ERROR`
  - `DbResult` = `{ error: { code?: string; message: string } | null }`
  - `parseClient`, `parseCompany`, `parseBilling`, `parseOnboarding`, `parseSignUp`, `parseSignIn`, `parseEmailOnly`, `parseOtp`, `parseReset`, `parseNewPassword` → `Parsed<T, K>` ; types `ClientInput`, `ClientField`, `CompanyInput`, `CompanyField`, `BillingInput`, `BillingField`, `OnboardingInput`, `OnboardingField`, `AuthField` ; `parseWaitlist` inchangé
  - `splitPhone(e164 | null, fallbackDial?)`, `formatPhone(e164 | null)`
  - `Profile`, `profileCompletion(profile)`, `displayName(profile, email)`, `logoUrl(path)`
  - `authErrorMessage(error)`

- [ ] **Step 1: Ajouter devises et valeurs par pays à `src/lib/site.ts`** (après `COUNTRIES`)

```ts
export const CURRENCIES = ["XOF", "XAF", "EUR"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const CURRENCY_LABELS: Record<Currency, string> = {
  XOF: "FCFA (XOF) — zone UEMOA",
  XAF: "FCFA (XAF) — zone CEMAC",
  EUR: "Euro (EUR)",
};

// Taux de TVA indicatifs, à faire valider par un comptable de la zone avant lancement.
export const COUNTRY_DEFAULTS: Record<CountryCode, { currency: Currency; vatRate: number }> = {
  SN: { currency: "XOF", vatRate: 18 },
  CI: { currency: "XOF", vatRate: 18 },
  ML: { currency: "XOF", vatRate: 18 },
  BF: { currency: "XOF", vatRate: 18 },
  BJ: { currency: "XOF", vatRate: 18 },
  TG: { currency: "XOF", vatRate: 18 },
  NE: { currency: "XOF", vatRate: 19 },
  CM: { currency: "XAF", vatRate: 19.25 },
  OTHER: { currency: "XOF", vatRate: 0 },
};
```

- [ ] **Step 2: Créer `src/lib/form-state.ts` et `src/lib/db.ts`**

`src/lib/form-state.ts` :
```ts
export type FormState<K extends string = string> = {
  ok?: boolean;
  message?: string;
  fieldErrors?: Partial<Record<K, string>>;
  redirectTo?: string;
};

export const GENERIC_ERROR = "Un souci technique, réessayez.";
```

`src/lib/db.ts` :
```ts
export type DbResult = { error: { code?: string; message: string } | null };
```

- [ ] **Step 3: Ajouter les tests qui échouent à `src/lib/validation.test.ts`**

Remplacer la ligne d’import existante `import { parseWaitlist } from "@/lib/validation";` par :
```ts
import {
  parseBilling,
  parseClient,
  parseCompany,
  parseOnboarding,
  parseOtp,
  parseReset,
  parseSignIn,
  parseSignUp,
  parseWaitlist,
} from "@/lib/validation";
```
puis ajouter à la fin du fichier :
```ts
describe("parseClient", () => {
  const base = { name: "  Agence Teranga ", countryCode: "221", phone: "", email: "", address: "", city: "", country: "", taxId: "" };

  it("accepte un client avec seulement un nom", () => {
    expect(parseClient(base)).toEqual({
      success: true,
      data: { name: "Agence Teranga", phone: null, email: null, address: null, city: null, country: null, tax_id: null },
    });
  });

  it("normalise le téléphone et garde les champs facultatifs remplis", () => {
    const r = parseClient({ ...base, phone: "77 123 45 67", email: "Contact@Teranga.SN", city: "Dakar", country: "SN", taxId: "SN2024" });
    expect(r.success && r.data).toEqual({
      name: "Agence Teranga",
      phone: "+221771234567",
      email: "contact@teranga.sn",
      address: null,
      city: "Dakar",
      country: "SN",
      tax_id: "SN2024",
    });
  });

  it("exige un nom", () => {
    expect(parseClient({ ...base, name: "   " })).toEqual({ success: false, fieldErrors: { name: "Le nom est obligatoire" } });
  });

  it("refuse un téléphone invalide et un indicatif vide", () => {
    const r = parseClient({ ...base, phone: "123", countryCode: "" });
    expect(!r.success && r.fieldErrors).toEqual({ phone: "Numéro invalide : 8 à 10 chiffres", countryCode: "Indicatif invalide" });
  });

  it("refuse un email invalide", () => {
    const r = parseClient({ ...base, email: "pas-un-email" });
    expect(!r.success && r.fieldErrors.email).toBe("Email invalide");
  });
});

describe("parseCompany", () => {
  it("normalise les champs de l’entreprise", () => {
    const r = parseCompany({ companyName: "Studio Awa", address: "", city: "Dakar", country: "SN", countryCode: "221", phone: "771234567", businessEmail: "", rccm: "SN-DKR-2024-A-1", nif: "" });
    expect(r.success && r.data).toEqual({
      company_name: "Studio Awa",
      address: null,
      city: "Dakar",
      country: "SN",
      phone: "+221771234567",
      business_email: null,
      rccm: "SN-DKR-2024-A-1",
      nif: null,
    });
  });
});

describe("parseBilling", () => {
  it("accepte la virgule française", () => {
    expect(parseBilling({ currency: "XAF", vatRate: "19,25" })).toEqual({ success: true, data: { currency: "XAF", vat_rate: 19.25 } });
    expect(parseBilling({ currency: "XOF", vatRate: " 0 " })).toEqual({ success: true, data: { currency: "XOF", vat_rate: 0 } });
  });

  it("refuse un taux non numérique, trop précis ou supérieur à 100", () => {
    expect(!parseBilling({ currency: "XOF", vatRate: "abc" }).success).toBe(true);
    expect(!parseBilling({ currency: "XOF", vatRate: "18,125" }).success).toBe(true);
    const r = parseBilling({ currency: "XOF", vatRate: "150" });
    expect(!r.success && r.fieldErrors.vatRate).toBe("100 % maximum");
  });

  it("refuse une devise inconnue", () => {
    const r = parseBilling({ currency: "USD", vatRate: "18" });
    expect(!r.success && r.fieldErrors.currency).toBe("Choisissez une devise");
  });
});

describe("parseOnboarding", () => {
  it("accepte des étapes passées", () => {
    expect(parseOnboarding({ companyName: "", country: "" })).toEqual({ success: true, data: { company_name: null, country: null } });
    expect(parseOnboarding({ companyName: "Studio Awa", country: "CM" })).toEqual({ success: true, data: { company_name: "Studio Awa", country: "CM" } });
  });
});

describe("schémas d’authentification", () => {
  it("inscription : email, mot de passe de 8 caractères et CGU", () => {
    expect(parseSignUp({ email: "Awa@Exemple.SN", password: "motdepasse", terms: "on" })).toEqual({
      success: true,
      data: { email: "awa@exemple.sn", password: "motdepasse", terms: true },
    });
    const r = parseSignUp({ email: "awa@exemple.sn", password: "court" });
    expect(!r.success && r.fieldErrors).toEqual({ password: "8 caractères minimum", terms: "Acceptez les CGU pour continuer" });
  });

  it("connexion : mot de passe requis", () => {
    const r = parseSignIn({ email: "awa@exemple.sn", password: "" });
    expect(!r.success && r.fieldErrors.password).toBe("Mot de passe requis");
  });

  it("code : 6 chiffres, espaces ignorés", () => {
    expect(parseOtp({ email: "awa@exemple.sn", code: "482 913" })).toEqual({ success: true, data: { email: "awa@exemple.sn", code: "482913" } });
    const r = parseOtp({ email: "awa@exemple.sn", code: "48291" });
    expect(!r.success && r.fieldErrors.code).toBe("Le code contient 6 chiffres");
  });

  it("réinitialisation : code et nouveau mot de passe", () => {
    const r = parseReset({ email: "awa@exemple.sn", code: "123456", password: "abc" });
    expect(!r.success && r.fieldErrors.password).toBe("8 caractères minimum");
  });
});
```

- [ ] **Step 4: Lancer les tests pour vérifier l’échec**

Run: `npm test`
Expected: FAIL — `parseClient` (et autres) « is not a function » / non exportés.

- [ ] **Step 5: Remplacer `src/lib/validation.ts`**

```ts
import { z } from "zod";
import {
  COUNTRY_CODES,
  CURRENCIES,
  PROFILE_VALUES,
  type CountryCode,
  type Currency,
  type ProfileValue,
} from "@/lib/site";

export type FieldErrors<K extends string> = Partial<Record<K, string>>;
export type Parsed<T, K extends string> = { success: true; data: T } | { success: false; fieldErrors: FieldErrors<K> };

export const PHONE_ERROR = "Numéro invalide : 8 à 10 chiffres";
export const DIAL_ERROR = "Indicatif invalide";

const DIAL_RE = /^\d{1,4}$/;
const LOCAL_RE = /^\d{8,10}$/;

const digitsOnly = (v: unknown) => (typeof v === "string" ? v.replace(/[\s.\-+()]/g, "") : "");
const blankToUndefined = (v: unknown) =>
  v === null || (typeof v === "string" && v.trim() === "") ? undefined : v;
const asString = (v: unknown) => (typeof v === "string" ? v : "");

export function toE164(dial: string, local: string): string {
  return `+${dial}${local}`;
}

function parseWith<S extends z.ZodTypeAny, K extends string>(schema: S, raw: unknown): Parsed<z.output<S>, K> {
  const result = schema.safeParse(raw);
  if (result.success) return { success: true, data: result.data };
  const fieldErrors: FieldErrors<K> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as K | undefined;
    if (field && !fieldErrors[field]) fieldErrors[field] = issue.message;
  }
  return { success: false, fieldErrors };
}

const email = z.preprocess(asString, z.string().trim().toLowerCase().email("Email invalide"));
const optionalEmail = z.preprocess(blankToUndefined, z.string().trim().toLowerCase().email("Email invalide").optional());
const optionalText = (max: number) =>
  z.preprocess(blankToUndefined, z.string().trim().max(max, `${max} caractères maximum`).optional());
const countrySchema = z.enum(COUNTRY_CODES, { errorMap: () => ({ message: "Choisissez un pays" }) });
const optionalCountry = z.preprocess(blankToUndefined, countrySchema.optional());

// Téléphone facultatif : vide → null ; rempli → indicatif et numéro validés.
const phonePair = {
  countryCode: z.preprocess(digitsOnly, z.string()),
  phone: z.preprocess(digitsOnly, z.string()),
};
function checkPhonePair(v: { countryCode: string; phone: string }, ctx: z.RefinementCtx) {
  if (v.phone === "") return;
  if (!LOCAL_RE.test(v.phone)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["phone"], message: PHONE_ERROR });
  if (!DIAL_RE.test(v.countryCode)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["countryCode"], message: DIAL_ERROR });
}
const phoneOrNull = (v: { countryCode: string; phone: string }) => (v.phone ? toE164(v.countryCode, v.phone) : null);

/* ---------- Liste d’attente (comportement inchangé) ---------- */

export type WaitlistField = "countryCode" | "phone" | "country" | "profile" | "email";
export type WaitlistRow = { phone: string; email: string | null; country: CountryCode; profile: ProfileValue };
export type ParseResult = Parsed<WaitlistRow, WaitlistField>;

const waitlistSchema = z
  .object({
    countryCode: z.preprocess(digitsOnly, z.string().regex(DIAL_RE, DIAL_ERROR)),
    phone: z.preprocess(digitsOnly, z.string().regex(LOCAL_RE, PHONE_ERROR)),
    country: countrySchema,
    profile: z.enum(PROFILE_VALUES, { errorMap: () => ({ message: "Choisissez un profil" }) }),
    email: optionalEmail,
  })
  .transform(
    (v): WaitlistRow => ({ phone: toE164(v.countryCode, v.phone), email: v.email ?? null, country: v.country, profile: v.profile }),
  );

export function parseWaitlist(raw: Record<string, unknown>): ParseResult {
  return parseWith<typeof waitlistSchema, WaitlistField>(waitlistSchema, raw);
}

/* ---------- Clients ---------- */

export type ClientField = "name" | "countryCode" | "phone" | "email" | "address" | "city" | "country" | "taxId";
export type ClientInput = {
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  country: CountryCode | null;
  tax_id: string | null;
};

const clientSchema = z
  .object({
    name: z.preprocess(
      (v) => asString(v).trim(),
      z.string().min(1, "Le nom est obligatoire").max(120, "120 caractères maximum"),
    ),
    ...phonePair,
    email: optionalEmail,
    address: optionalText(200),
    city: optionalText(200),
    country: optionalCountry,
    taxId: optionalText(50),
  })
  .superRefine(checkPhonePair)
  .transform(
    (v): ClientInput => ({
      name: v.name,
      phone: phoneOrNull(v),
      email: v.email ?? null,
      address: v.address ?? null,
      city: v.city ?? null,
      country: v.country ?? null,
      tax_id: v.taxId ?? null,
    }),
  );

export function parseClient(raw: Record<string, unknown>): Parsed<ClientInput, ClientField> {
  return parseWith<typeof clientSchema, ClientField>(clientSchema, raw);
}

/* ---------- Profil entreprise ---------- */

export type CompanyField =
  | "companyName"
  | "address"
  | "city"
  | "country"
  | "countryCode"
  | "phone"
  | "businessEmail"
  | "rccm"
  | "nif";
export type CompanyInput = {
  company_name: string | null;
  address: string | null;
  city: string | null;
  country: CountryCode | null;
  phone: string | null;
  business_email: string | null;
  rccm: string | null;
  nif: string | null;
};

const companySchema = z
  .object({
    companyName: optionalText(120),
    address: optionalText(200),
    city: optionalText(200),
    country: optionalCountry,
    ...phonePair,
    businessEmail: optionalEmail,
    rccm: optionalText(50),
    nif: optionalText(50),
  })
  .superRefine(checkPhonePair)
  .transform(
    (v): CompanyInput => ({
      company_name: v.companyName ?? null,
      address: v.address ?? null,
      city: v.city ?? null,
      country: v.country ?? null,
      phone: phoneOrNull(v),
      business_email: v.businessEmail ?? null,
      rccm: v.rccm ?? null,
      nif: v.nif ?? null,
    }),
  );

export function parseCompany(raw: Record<string, unknown>): Parsed<CompanyInput, CompanyField> {
  return parseWith<typeof companySchema, CompanyField>(companySchema, raw);
}

/* ---------- Facturation ---------- */

export type BillingField = "currency" | "vatRate";
export type BillingInput = { currency: Currency; vat_rate: number };

const billingSchema = z
  .object({
    currency: z.enum(CURRENCIES, { errorMap: () => ({ message: "Choisissez une devise" }) }),
    vatRate: z.preprocess(
      (v) => (typeof v === "number" ? String(v) : asString(v).trim()),
      z
        .string()
        .regex(/^\d{1,3}([.,]\d{1,2})?$/, "Taux invalide (ex. 18 ou 19,25)")
        .transform((s) => Number(s.replace(",", ".")))
        .refine((n) => n <= 100, "100 % maximum"),
    ),
  })
  .transform((v): BillingInput => ({ currency: v.currency, vat_rate: v.vatRate }));

export function parseBilling(raw: Record<string, unknown>): Parsed<BillingInput, BillingField> {
  return parseWith<typeof billingSchema, BillingField>(billingSchema, raw);
}

/* ---------- Onboarding ---------- */

export type OnboardingField = "companyName" | "country" | "logo";
export type OnboardingInput = { company_name: string | null; country: CountryCode | null };

const onboardingSchema = z
  .object({ companyName: optionalText(120), country: optionalCountry })
  .transform((v): OnboardingInput => ({ company_name: v.companyName ?? null, country: v.country ?? null }));

export function parseOnboarding(raw: Record<string, unknown>): Parsed<OnboardingInput, OnboardingField> {
  return parseWith<typeof onboardingSchema, OnboardingField>(onboardingSchema, raw);
}

/* ---------- Authentification ---------- */

export type AuthField = "email" | "password" | "code" | "terms";

const password = z.preprocess(asString, z.string().min(8, "8 caractères minimum").max(72, "72 caractères maximum"));
const otpCode = z.preprocess(
  (v) => asString(v).replace(/\s/g, ""),
  z.string().regex(/^\d{6}$/, "Le code contient 6 chiffres"),
);

const signUpSchema = z.object({
  email,
  password,
  terms: z.preprocess(
    (v) => v === "on" || v === true || v === "true",
    z.literal(true, { errorMap: () => ({ message: "Acceptez les CGU pour continuer" }) }),
  ),
});
const signInSchema = z.object({ email, password: z.preprocess(asString, z.string().min(1, "Mot de passe requis")) });
const emailOnlySchema = z.object({ email });
const otpSchema = z.object({ email, code: otpCode });
const resetSchema = z.object({ email, code: otpCode, password });
const newPasswordSchema = z.object({ password });

export const parseSignUp = (raw: Record<string, unknown>) => parseWith<typeof signUpSchema, AuthField>(signUpSchema, raw);
export const parseSignIn = (raw: Record<string, unknown>) => parseWith<typeof signInSchema, AuthField>(signInSchema, raw);
export const parseEmailOnly = (raw: Record<string, unknown>) =>
  parseWith<typeof emailOnlySchema, AuthField>(emailOnlySchema, raw);
export const parseOtp = (raw: Record<string, unknown>) => parseWith<typeof otpSchema, AuthField>(otpSchema, raw);
export const parseReset = (raw: Record<string, unknown>) => parseWith<typeof resetSchema, AuthField>(resetSchema, raw);
export const parseNewPassword = (raw: Record<string, unknown>) =>
  parseWith<typeof newPasswordSchema, AuthField>(newPasswordSchema, raw);
```

- [ ] **Step 6: Relancer les tests**

Run: `npm test`
Expected: PASS — les 10 tests existants de `parseWaitlist` et les 6 de `submitWaitlist` restent verts, plus les nouveaux.

- [ ] **Step 7: Écrire les tests qui échouent `src/lib/phone.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { formatPhone, splitPhone } from "@/lib/phone";

describe("splitPhone", () => {
  it("sépare l’indicatif connu du numéro local", () => {
    expect(splitPhone("+221771234567")).toEqual({ countryCode: "221", phone: "771234567" });
    expect(splitPhone("+2250701020304")).toEqual({ countryCode: "225", phone: "0701020304" });
    expect(splitPhone("+237699112233")).toEqual({ countryCode: "237", phone: "699112233" });
  });

  it("renvoie l’indicatif par défaut quand il n’y a pas de numéro", () => {
    expect(splitPhone(null)).toEqual({ countryCode: "221", phone: "" });
    expect(splitPhone(null, "225")).toEqual({ countryCode: "225", phone: "" });
  });
});

describe("formatPhone", () => {
  it("formate les numéros pour l’affichage", () => {
    expect(formatPhone("+221771234567")).toBe("+221 77 123 45 67");
    expect(formatPhone("+2250701020304")).toBe("+225 07 01 02 03 04");
    expect(formatPhone("+22670112233")).toBe("+226 70 11 22 33");
    expect(formatPhone(null)).toBe("");
  });
});
```

- [ ] **Step 8: Lancer le test pour vérifier l’échec**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "@/lib/phone"`.

- [ ] **Step 9: Implémenter `src/lib/phone.ts`**

```ts
import { COUNTRIES } from "@/lib/site";

const DIALS = COUNTRIES.map((c) => c.dial)
  .filter(Boolean)
  .sort((a, b) => b.length - a.length);

export function splitPhone(e164: string | null, fallbackDial = "221"): { countryCode: string; phone: string } {
  if (!e164) return { countryCode: fallbackDial, phone: "" };
  const digits = e164.replace(/^\+/, "");
  const dial = DIALS.find((d) => digits.startsWith(d)) ?? digits.slice(0, 3);
  return { countryCode: dial, phone: digits.slice(dial.length) };
}

export function formatPhone(e164: string | null): string {
  if (!e164) return "";
  const { countryCode, phone } = splitPhone(e164);
  const groups =
    phone.length === 9
      ? [phone.slice(0, 2), phone.slice(2, 5), phone.slice(5, 7), phone.slice(7)]
      : (phone.match(/.{1,2}/g) ?? [phone]);
  return `+${countryCode} ${groups.join(" ")}`;
}
```

- [ ] **Step 10: Écrire les tests qui échouent `src/lib/profile.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { displayName, logoUrl, profileCompletion, type Profile } from "@/lib/profile";

const empty: Profile = {
  id: "u1",
  full_name: null,
  company_name: null,
  address: null,
  city: null,
  country: null,
  phone: null,
  business_email: null,
  rccm: null,
  nif: null,
  logo_path: null,
  currency: "XOF",
  vat_rate: 18,
  onboarded_at: null,
};

describe("profileCompletion", () => {
  it("compte les 7 éléments affichés sur les factures", () => {
    expect(profileCompletion(empty)).toBe(0);
    expect(profileCompletion({ ...empty, company_name: "Studio Awa", country: "SN", phone: "+221771234567" })).toBe(43);
    expect(
      profileCompletion({
        ...empty,
        company_name: "Studio Awa",
        country: "SN",
        address: "Mermoz",
        phone: "+221771234567",
        rccm: "R",
        nif: "N",
        logo_path: "u1/logo.webp",
      }),
    ).toBe(100);
  });

  it("ignore les champs remplis d’espaces", () => {
    expect(profileCompletion({ ...empty, company_name: "   " })).toBe(0);
  });
});

describe("displayName", () => {
  it("préfère le prénom, puis l’entreprise, puis l’email", () => {
    expect(displayName({ ...empty, full_name: "Awa Diop" }, "awa@exemple.sn")).toBe("Awa");
    expect(displayName({ ...empty, company_name: "Studio Awa" }, "awa@exemple.sn")).toBe("Studio Awa");
    expect(displayName(empty, "awa@exemple.sn")).toBe("awa");
  });
});

describe("logoUrl", () => {
  it("construit l’URL publique du logo", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co";
    expect(logoUrl("u1/logo-1.webp")).toBe("https://abc.supabase.co/storage/v1/object/public/logos/u1/logo-1.webp");
    expect(logoUrl(null)).toBeNull();
  });
});
```

- [ ] **Step 11: Implémenter `src/lib/profile.ts`**

```ts
import type { CountryCode, Currency } from "@/lib/site";

export type Profile = {
  id: string;
  full_name: string | null;
  company_name: string | null;
  address: string | null;
  city: string | null;
  country: CountryCode | null;
  phone: string | null;
  business_email: string | null;
  rccm: string | null;
  nif: string | null;
  logo_path: string | null;
  currency: Currency;
  vat_rate: number;
  onboarded_at: string | null;
};

const COMPLETION_FIELDS = ["company_name", "country", "address", "phone", "rccm", "nif", "logo_path"] as const;

export function profileCompletion(profile: Pick<Profile, (typeof COMPLETION_FIELDS)[number]>): number {
  const filled = COMPLETION_FIELDS.filter((field) => (profile[field] ?? "").trim() !== "").length;
  return Math.round((filled / COMPLETION_FIELDS.length) * 100);
}

export function displayName(profile: Pick<Profile, "full_name" | "company_name">, email: string | undefined): string {
  const firstName = profile.full_name?.trim().split(/\s+/)[0];
  return firstName || profile.company_name?.trim() || email?.split("@")[0] || "";
}

export function logoUrl(path: string | null): string | null {
  return path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/logos/${path}` : null;
}
```

- [ ] **Step 12: Écrire les tests qui échouent `src/lib/auth-errors.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { authErrorMessage } from "@/lib/auth-errors";
import { GENERIC_ERROR } from "@/lib/form-state";

describe("authErrorMessage", () => {
  it("traduit les erreurs connues de Supabase Auth", () => {
    expect(authErrorMessage({ code: "invalid_credentials" })).toBe("Email ou mot de passe incorrect.");
    expect(authErrorMessage({ code: "email_not_confirmed" })).toBe("Confirmez d’abord votre email.");
    expect(authErrorMessage({ code: "user_already_exists" })).toBe("Cet email a déjà un compte. Connectez-vous.");
    expect(authErrorMessage({ code: "otp_expired" })).toBe("Code incorrect ou expiré. Demandez-en un nouveau.");
    expect(authErrorMessage({ code: "over_email_send_rate_limit" })).toBe("Trop de tentatives. Réessayez dans une minute.");
    expect(authErrorMessage({ code: "weak_password" })).toBe("Mot de passe trop faible : 8 caractères minimum.");
  });

  it("reconnaît une limite de débit par son statut HTTP", () => {
    expect(authErrorMessage({ status: 429, message: "Too many" })).toBe("Trop de tentatives. Réessayez dans une minute.");
  });

  it("renvoie le message générique pour le reste", () => {
    expect(authErrorMessage({ code: "unexpected_failure", message: "boom" })).toBe(GENERIC_ERROR);
    expect(authErrorMessage(null)).toBe(GENERIC_ERROR);
  });
});
```

- [ ] **Step 13: Implémenter `src/lib/auth-errors.ts`**

```ts
import { GENERIC_ERROR } from "@/lib/form-state";

export type AuthErrorLike = { code?: string; status?: number; message?: string } | null | undefined;

const RATE_LIMIT = "Trop de tentatives. Réessayez dans une minute.";

const MESSAGES: Record<string, string> = {
  invalid_credentials: "Email ou mot de passe incorrect.",
  email_not_confirmed: "Confirmez d’abord votre email.",
  user_already_exists: "Cet email a déjà un compte. Connectez-vous.",
  email_exists: "Cet email a déjà un compte. Connectez-vous.",
  otp_expired: "Code incorrect ou expiré. Demandez-en un nouveau.",
  over_email_send_rate_limit: RATE_LIMIT,
  over_request_rate_limit: RATE_LIMIT,
  weak_password: "Mot de passe trop faible : 8 caractères minimum.",
  same_password: "Choisissez un mot de passe différent de l’ancien.",
};

export function authErrorMessage(error: AuthErrorLike): string {
  if (error?.code && MESSAGES[error.code]) return MESSAGES[error.code];
  if (error?.status === 429) return RATE_LIMIT;
  return GENERIC_ERROR;
}
```

- [ ] **Step 14: Vérifier**

Run: `npm run lint && npm test && npm run build`
Expected: tout vert.

- [ ] **Step 15: Commit**

```bash
git add -A
git commit -m "feat: validation client/profil/facturation/auth, valeurs par pays, téléphone et erreurs d’auth"
```

---

### Task 3: Base de données, RLS et script de vérification

**Files:**
- Create: `supabase/migrations/002_profiles_clients.sql`, `scripts/check-rls.mjs`
- Modify: `package.json` (script `check:rls`)

**Interfaces:**
- Produces: tables `profiles`, `clients` ; bucket `logos` ; script `npm run check:rls`.

- [ ] **Step 1: Créer `supabase/migrations/002_profiles_clients.sql`**

Copier exactement le bloc SQL de la spec, §5.1 (tables, index, triggers `touch_updated_at` et `handle_new_user`, policies RLS profils / clients, bucket `logos` et ses 3 policies).

- [ ] **Step 2: Créer `scripts/check-rls.mjs`**

```js
// Vérifie l’isolation entre deux comptes (RLS tables + stockage). Usage : npm run check:rls
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !service || !anon) {
  console.error("Variables manquantes : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

const admin = createClient(url, service, { auth: { persistSession: false } });
const stamp = Date.now();
const password = `Rls-${stamp}-ok!`;
const results = [];
const check = (name, ok, extra = "") => results.push(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? ` — ${extra}` : ""}`);
const created = [];

async function makeUser(tag) {
  const email = `rls-${tag}-${stamp}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  created.push(data.user.id);
  const client = createClient(url, anon, { auth: { persistSession: false } });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  return { id: data.user.id, client };
}

try {
  const a = await makeUser("a");
  const b = await makeUser("b");

  const { data: ownProfile } = await a.client.from("profiles").select("id").eq("id", a.id);
  check("le profil est créé automatiquement à l’inscription", ownProfile?.length === 1);

  const { data: inserted, error: insertError } = await a.client
    .from("clients")
    .insert({ user_id: a.id, name: "Client de A" })
    .select("id")
    .single();
  check("A crée un client", !insertError && Boolean(inserted), insertError?.message);

  const clientId = inserted?.id;
  const { data: seen } = await b.client.from("clients").select("id").eq("id", clientId);
  check("B ne voit pas le client de A", seen?.length === 0);

  const { data: updated } = await b.client.from("clients").update({ name: "piraté" }).eq("id", clientId).select("id");
  check("B ne peut pas modifier ni archiver le client de A", (updated?.length ?? 0) === 0);

  const { error: forged } = await b.client.from("clients").insert({ user_id: a.id, name: "faux" });
  check("B ne peut pas créer un client au nom de A", Boolean(forged));

  const { data: otherProfile } = await b.client.from("profiles").select("id").eq("id", a.id);
  check("B ne voit pas le profil de A", otherProfile?.length === 0);

  const bytes = new Uint8Array([1, 2, 3]);
  const { error: foreignUpload } = await b.client.storage
    .from("logos")
    .upload(`${a.id}/pirate.webp`, bytes, { contentType: "image/webp" });
  check("B ne peut pas écrire dans le dossier logo de A", Boolean(foreignUpload));

  const { error: ownUpload } = await a.client.storage
    .from("logos")
    .upload(`${a.id}/test-${stamp}.webp`, bytes, { contentType: "image/webp" });
  check("A peut écrire dans son propre dossier logo", !ownUpload, ownUpload?.message);
  if (!ownUpload) await a.client.storage.from("logos").remove([`${a.id}/test-${stamp}.webp`]);
} catch (error) {
  check("exécution du script", false, String(error?.message ?? error));
} finally {
  for (const id of created) await admin.auth.admin.deleteUser(id);
}

console.log(results.join("\n"));
process.exit(results.some((line) => line.startsWith("FAIL")) ? 1 : 0);
```

- [ ] **Step 3: Ajouter le script npm**

Dans `"scripts"` de `package.json` :
```json
"check:rls": "node --env-file=.env.local scripts/check-rls.mjs"
```

- [ ] **Step 4: Point d’arrêt — configuration par l’utilisateur**

Demander à l’utilisateur, en le guidant :
1. Supabase → **SQL Editor** → coller et exécuter `supabase/migrations/002_profiles_clients.sql` (attendu : « Success. No rows returned »).
2. Supabase → **Project Settings → API** : copier la clé **publishable** (ou « anon ») dans `.env.local` sous `NEXT_PUBLIC_SUPABASE_ANON_KEY=`, et recopier la valeur de `SUPABASE_URL` dans `NEXT_PUBLIC_SUPABASE_URL=`. Enregistrer (Ctrl + S).

Vérifier ensuite sans afficher de secret :
```bash
node -e 'const s=require("fs").readFileSync(".env.local","utf8");for(const k of ["NEXT_PUBLIC_SUPABASE_URL","NEXT_PUBLIC_SUPABASE_ANON_KEY"]){const v=(s.match(new RegExp("^"+k+"=(.*)$","m"))||[])[1]||"";console.log(k, v.trim()?"rempli ("+v.trim().length+" car.)":"VIDE")}'
```
Expected: les deux « rempli ».

- [ ] **Step 5: Exécuter la vérification RLS**

Run: `npm run check:rls`
Expected: 8 lignes `PASS`, code de sortie 0. Toute ligne `FAIL` bloque la suite : corriger la migration avant de continuer.

- [ ] **Step 6: Vérifier et commit**

Run: `npm run lint && npm test && npm run build`

```bash
git add -A
git commit -m "feat(db): tables profiles et clients, RLS, bucket logos et script de vérification RLS"
```

---

### Task 4: Logique d’authentification, actions serveur et retour Google

**Files:**
- Create: `src/lib/auth.ts`, `src/lib/auth.test.ts`, `src/app/(auth)/actions.ts`, `src/app/auth/callback/route.ts`

**Interfaces:**
- Consumes: `parse*` (Task 2), `authErrorMessage`, `GENERIC_ERROR`, `FormState`, `safeNext` (Task 1), `createClient`, `authApi` (Task 1).
- Produces:
  - `interface AuthApi` (signUp, verifyOtp, resend, signInWithPassword, resetPasswordForEmail, updateUser)
  - `signUpWithPassword`, `verifySignupCode`, `resendSignupCode`, `signIn`, `requestPasswordReset`, `resetPassword`, `changePassword` : `(api: AuthApi, raw: Record<string, unknown>) => Promise<FormState<AuthField>>`
  - Server Actions : `signUpAction`, `verifySignupCodeAction`, `resendSignupCodeAction`, `signInAction`, `requestPasswordResetAction`, `resetPasswordAction` (signature `(prev: FormState, fd: FormData) => Promise<FormState>`), `signOutAction()`.

- [ ] **Step 1: Écrire le test qui échoue `src/lib/auth.test.ts`**

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  changePassword,
  requestPasswordReset,
  resendSignupCode,
  resetPassword,
  signIn,
  signUpWithPassword,
  verifySignupCode,
  type AuthApi,
} from "@/lib/auth";
import { GENERIC_ERROR } from "@/lib/form-state";

const ok = async () => ({ error: null });

function fakeAuth(overrides: Partial<AuthApi> = {}): AuthApi {
  return {
    signUp: vi.fn(async () => ({ data: { user: { identities: [{}] } }, error: null })),
    verifyOtp: vi.fn(ok),
    resend: vi.fn(ok),
    signInWithPassword: vi.fn(ok),
    resetPasswordForEmail: vi.fn(ok),
    updateUser: vi.fn(ok),
    ...overrides,
  };
}

afterEach(() => vi.restoreAllMocks());

describe("signUpWithPassword", () => {
  const form = { email: "Awa@Exemple.sn", password: "motdepasse", terms: "on" };

  it("crée le compte et redirige vers la saisie du code", async () => {
    const api = fakeAuth();
    expect(await signUpWithPassword(api, form)).toEqual({ ok: true, redirectTo: "/inscription/code?email=awa%40exemple.sn" });
    expect(api.signUp).toHaveBeenCalledWith({ email: "awa@exemple.sn", password: "motdepasse" });
  });

  it("renvoie les erreurs de champ sans appeler Supabase", async () => {
    const api = fakeAuth();
    const state = await signUpWithPassword(api, { email: "x", password: "1" });
    expect(state.ok).toBe(false);
    expect(state.fieldErrors?.email).toBe("Email invalide");
    expect(api.signUp).not.toHaveBeenCalled();
  });

  it("signale un email déjà inscrit (réponse masquée de Supabase)", async () => {
    const api = fakeAuth({ signUp: vi.fn(async () => ({ data: { user: { identities: [] } }, error: null })) });
    expect(await signUpWithPassword(api, form)).toEqual({ ok: false, message: "Cet email a déjà un compte. Connectez-vous." });
  });

  it("traduit une limite d’envoi", async () => {
    const api = fakeAuth({
      signUp: vi.fn(async () => ({ data: { user: null }, error: { code: "over_email_send_rate_limit", status: 429 } })),
    });
    expect((await signUpWithPassword(api, form)).message).toBe("Trop de tentatives. Réessayez dans une minute.");
  });

  it("journalise une erreur inattendue", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const api = fakeAuth({ signUp: vi.fn(async () => ({ data: { user: null }, error: { code: "unexpected_failure", message: "boom" } })) });
    expect((await signUpWithPassword(api, form)).message).toBe(GENERIC_ERROR);
    expect(log).toHaveBeenCalled();
  });
});

describe("verifySignupCode / resendSignupCode", () => {
  it("valide le code et envoie vers l’onboarding", async () => {
    const api = fakeAuth();
    expect(await verifySignupCode(api, { email: "awa@exemple.sn", code: "123 456" })).toEqual({ ok: true, redirectTo: "/app/bienvenue" });
    expect(api.verifyOtp).toHaveBeenCalledWith({ email: "awa@exemple.sn", token: "123456", type: "email" });
  });

  it("signale un code expiré", async () => {
    const api = fakeAuth({ verifyOtp: vi.fn(async () => ({ error: { code: "otp_expired" } })) });
    expect((await verifySignupCode(api, { email: "awa@exemple.sn", code: "123456" })).message).toBe(
      "Code incorrect ou expiré. Demandez-en un nouveau.",
    );
  });

  it("renvoie un nouveau code", async () => {
    const api = fakeAuth();
    expect(await resendSignupCode(api, { email: "awa@exemple.sn" })).toEqual({ ok: true, message: "Nouveau code envoyé." });
    expect(api.resend).toHaveBeenCalledWith({ type: "signup", email: "awa@exemple.sn" });
  });
});

describe("signIn", () => {
  const form = { email: "awa@exemple.sn", password: "motdepasse" };

  it("redirige vers la page demandée si elle est interne", async () => {
    expect(await signIn(fakeAuth(), { ...form, next: "/app/clients" })).toEqual({ ok: true, redirectTo: "/app/clients" });
    expect(await signIn(fakeAuth(), { ...form, next: "https://evil.example" })).toEqual({ ok: true, redirectTo: "/app" });
  });

  it("renvoie vers la saisie du code si l’email n’est pas confirmé", async () => {
    const api = fakeAuth({ signInWithPassword: vi.fn(async () => ({ error: { code: "email_not_confirmed" } })) });
    expect(await signIn(api, form)).toEqual({ ok: true, redirectTo: "/inscription/code?email=awa%40exemple.sn" });
    expect(api.resend).toHaveBeenCalledWith({ type: "signup", email: "awa@exemple.sn" });
  });

  it("signale des identifiants invalides", async () => {
    const api = fakeAuth({ signInWithPassword: vi.fn(async () => ({ error: { code: "invalid_credentials" } })) });
    expect(await signIn(api, form)).toEqual({ ok: false, message: "Email ou mot de passe incorrect." });
  });
});

describe("mot de passe", () => {
  it("demande un code de réinitialisation", async () => {
    const api = fakeAuth();
    const state = await requestPasswordReset(api, { email: "awa@exemple.sn" });
    expect(state.ok).toBe(true);
    expect(state.message).toContain("awa@exemple.sn");
    expect(api.resetPasswordForEmail).toHaveBeenCalledWith("awa@exemple.sn");
  });

  it("vérifie le code puis change le mot de passe", async () => {
    const api = fakeAuth();
    expect(await resetPassword(api, { email: "awa@exemple.sn", code: "654321", password: "nouveaumdp" })).toEqual({
      ok: true,
      redirectTo: "/app",
    });
    expect(api.verifyOtp).toHaveBeenCalledWith({ email: "awa@exemple.sn", token: "654321", type: "recovery" });
    expect(api.updateUser).toHaveBeenCalledWith({ password: "nouveaumdp" });
  });

  it("ne change pas le mot de passe si le code est refusé", async () => {
    const api = fakeAuth({ verifyOtp: vi.fn(async () => ({ error: { code: "otp_expired" } })) });
    const state = await resetPassword(api, { email: "awa@exemple.sn", code: "654321", password: "nouveaumdp" });
    expect(state.ok).toBe(false);
    expect(api.updateUser).not.toHaveBeenCalled();
  });

  it("change le mot de passe depuis les paramètres", async () => {
    expect(await changePassword(fakeAuth(), { password: "nouveaumdp" })).toEqual({ ok: true, message: "Mot de passe modifié ✓" });
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier l’échec**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "@/lib/auth"`.

- [ ] **Step 3: Implémenter `src/lib/auth.ts`**

```ts
import { authErrorMessage, type AuthErrorLike } from "@/lib/auth-errors";
import { GENERIC_ERROR, type FormState } from "@/lib/form-state";
import { safeNext } from "@/lib/routes";
import {
  parseEmailOnly,
  parseNewPassword,
  parseOtp,
  parseReset,
  parseSignIn,
  parseSignUp,
  type AuthField,
} from "@/lib/validation";

type ErrorResult = Promise<{ error: AuthErrorLike }>;

export interface AuthApi {
  signUp(credentials: { email: string; password: string }): Promise<{
    data: { user: { identities?: unknown[] | null } | null };
    error: AuthErrorLike;
  }>;
  verifyOtp(params: { email: string; token: string; type: "email" | "recovery" }): ErrorResult;
  resend(params: { type: "signup"; email: string }): ErrorResult;
  signInWithPassword(credentials: { email: string; password: string }): ErrorResult;
  resetPasswordForEmail(email: string): ErrorResult;
  updateUser(attributes: { password: string }): ErrorResult;
}

type AuthState = FormState<AuthField>;
type Raw = Record<string, unknown>;

function fail(where: string, error: AuthErrorLike): AuthState {
  const message = authErrorMessage(error);
  if (message === GENERIC_ERROR) console.error(`[auth] ${where} :`, error?.message ?? error);
  return { ok: false, message };
}

const codePage = (email: string) => `/inscription/code?email=${encodeURIComponent(email)}`;

export async function signUpWithPassword(api: AuthApi, raw: Raw): Promise<AuthState> {
  const parsed = parseSignUp(raw);
  if (!parsed.success) return { ok: false, fieldErrors: parsed.fieldErrors };
  const { email, password } = parsed.data;
  const { data, error } = await api.signUp({ email, password });
  if (error) return fail("inscription", error);
  // Supabase masque les emails déjà confirmés : réponse sans erreur mais sans identité.
  if (data.user && data.user.identities?.length === 0) {
    return { ok: false, message: authErrorMessage({ code: "user_already_exists" }) };
  }
  return { ok: true, redirectTo: codePage(email) };
}

export async function verifySignupCode(api: AuthApi, raw: Raw): Promise<AuthState> {
  const parsed = parseOtp(raw);
  if (!parsed.success) return { ok: false, fieldErrors: parsed.fieldErrors };
  const { error } = await api.verifyOtp({ email: parsed.data.email, token: parsed.data.code, type: "email" });
  if (error) return fail("vérification du code", error);
  return { ok: true, redirectTo: "/app/bienvenue" };
}

export async function resendSignupCode(api: AuthApi, raw: Raw): Promise<AuthState> {
  const parsed = parseEmailOnly(raw);
  if (!parsed.success) return { ok: false, fieldErrors: parsed.fieldErrors };
  const { error } = await api.resend({ type: "signup", email: parsed.data.email });
  if (error) return fail("renvoi du code", error);
  return { ok: true, message: "Nouveau code envoyé." };
}

export async function signIn(api: AuthApi, raw: Raw): Promise<AuthState> {
  const parsed = parseSignIn(raw);
  if (!parsed.success) return { ok: false, fieldErrors: parsed.fieldErrors };
  const { email, password } = parsed.data;
  const { error } = await api.signInWithPassword({ email, password });
  if (error?.code === "email_not_confirmed") {
    await api.resend({ type: "signup", email });
    return { ok: true, redirectTo: codePage(email) };
  }
  if (error) return fail("connexion", error);
  return { ok: true, redirectTo: safeNext(typeof raw.next === "string" ? raw.next : null) };
}

export async function requestPasswordReset(api: AuthApi, raw: Raw): Promise<AuthState> {
  const parsed = parseEmailOnly(raw);
  if (!parsed.success) return { ok: false, fieldErrors: parsed.fieldErrors };
  const { error } = await api.resetPasswordForEmail(parsed.data.email);
  if (error) return fail("demande de réinitialisation", error);
  return { ok: true, message: `Si un compte existe pour ${parsed.data.email}, un code vient d’être envoyé.` };
}

export async function resetPassword(api: AuthApi, raw: Raw): Promise<AuthState> {
  const parsed = parseReset(raw);
  if (!parsed.success) return { ok: false, fieldErrors: parsed.fieldErrors };
  const { email, code, password } = parsed.data;
  const verified = await api.verifyOtp({ email, token: code, type: "recovery" });
  if (verified.error) return fail("code de réinitialisation", verified.error);
  const updated = await api.updateUser({ password });
  if (updated.error) return fail("nouveau mot de passe", updated.error);
  return { ok: true, redirectTo: "/app" };
}

export async function changePassword(api: AuthApi, raw: Raw): Promise<AuthState> {
  const parsed = parseNewPassword(raw);
  if (!parsed.success) return { ok: false, fieldErrors: parsed.fieldErrors };
  const { error } = await api.updateUser({ password: parsed.data.password });
  if (error) return fail("changement de mot de passe", error);
  return { ok: true, message: "Mot de passe modifié ✓" };
}
```

- [ ] **Step 4: Relancer les tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Ajouter l’adaptateur `authApi` à `src/lib/supabase/server.ts`**

Ajouter l’import `import type { AuthApi } from "@/lib/auth";` en tête du fichier, puis à la fin :
```ts
// Adaptateur typé entre le SDK et la logique pure de src/lib/auth.ts.
export function authApi(supabase: ServerSupabase): AuthApi {
  const auth = supabase.auth;
  return {
    signUp: (credentials) => auth.signUp(credentials),
    verifyOtp: (params) => auth.verifyOtp(params),
    resend: (params) => auth.resend(params),
    signInWithPassword: (credentials) => auth.signInWithPassword(credentials),
    resetPasswordForEmail: (email) => auth.resetPasswordForEmail(email),
    updateUser: (attributes) => auth.updateUser(attributes),
  };
}
```

- [ ] **Step 6: Créer `src/app/(auth)/actions.ts`**

```ts
"use server";

import { redirect } from "next/navigation";
import * as auth from "@/lib/auth";
import type { FormState } from "@/lib/form-state";
import { authApi, createClient } from "@/lib/supabase/server";

type Raw = Record<string, unknown>;
const entries = (formData: FormData): Raw => Object.fromEntries(formData);

async function run(fn: (api: auth.AuthApi) => Promise<FormState>): Promise<FormState> {
  const supabase = await createClient();
  const result = await fn(authApi(supabase));
  if (result.ok && result.redirectTo) redirect(result.redirectTo);
  return result;
}

export async function signUpAction(_prev: FormState, formData: FormData) {
  return run((api) => auth.signUpWithPassword(api, entries(formData)));
}

export async function verifySignupCodeAction(_prev: FormState, formData: FormData) {
  return run((api) => auth.verifySignupCode(api, entries(formData)));
}

export async function resendSignupCodeAction(_prev: FormState, formData: FormData) {
  return run((api) => auth.resendSignupCode(api, entries(formData)));
}

export async function signInAction(_prev: FormState, formData: FormData) {
  return run((api) => auth.signIn(api, entries(formData)));
}

export async function requestPasswordResetAction(_prev: FormState, formData: FormData) {
  return run((api) => auth.requestPasswordReset(api, entries(formData)));
}

export async function resetPasswordAction(_prev: FormState, formData: FormData) {
  return run((api) => auth.resetPassword(api, entries(formData)));
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/connexion");
}
```

- [ ] **Step 7: Créer `src/app/auth/callback/route.ts`**

```ts
import { NextResponse } from "next/server";
import { safeNext } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
    console.error("[auth] échange OAuth :", error.message);
  }
  return NextResponse.redirect(`${origin}/connexion?erreur=google`);
}
```

- [ ] **Step 8: Vérifier et commit**

Run: `npm run lint && npm test && npm run build`

```bash
git add -A
git commit -m "feat(auth): logique d’inscription, code, connexion et mot de passe + actions et retour Google"
```

---

### Task 5: Composants de formulaire et pages d’authentification

**Files:**
- Create: `src/lib/use-form-values.ts`, `src/components/forms/{Field,SubmitButton,PasswordInput,PhoneFields,CountrySelect}.tsx`, `src/components/auth/{GoogleButton,Divider,SignUpForm,VerifyCodeForm,SignInForm,ResetPasswordFlow}.tsx`, `src/app/(auth)/layout.tsx`, `src/app/(auth)/inscription/page.tsx`, `src/app/(auth)/inscription/code/page.tsx`, `src/app/(auth)/connexion/page.tsx`, `src/app/(auth)/mot-de-passe-oublie/page.tsx`

**Interfaces:**
- Consumes: actions de la Task 4, `createBrowserSupabase` (Task 1), `COUNTRIES` (existant), `buttonClass`, `Logo`, `cn` (existants).
- Produces: `useFormValues(initial)` → `{ values, setValues, bind(name) }` ; `inputClass` ; `Field` ; `FormMessage` ; `SubmitButton` ; `PasswordInput` ; `PhoneFields` ; `CountrySelect` ; `GoogleButton({ next? })`.

- [ ] **Step 1: Créer `src/lib/use-form-values.ts`**

```ts
import { useState, type ChangeEvent } from "react";

type Element = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

// Champs contrôlés : React 19 réinitialise les champs non contrôlés après une action de formulaire.
export function useFormValues<T extends Record<string, string>>(initial: T) {
  const [values, setValues] = useState<T>(initial);
  const bind = (name: keyof T & string) => ({
    name,
    value: values[name],
    onChange: (event: ChangeEvent<Element>) => setValues((current) => ({ ...current, [name]: event.target.value })),
  });
  return { values, setValues, bind };
}
```

- [ ] **Step 2: Créer `src/components/forms/Field.tsx`**

```tsx
import { cn } from "@/lib/cn";
import type { FormState } from "@/lib/form-state";

export const inputClass =
  "h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-slate-900 placeholder:text-slate-400 focus:border-[#00C853] focus:outline-none focus:ring-2 focus:ring-[#00C853]/30 aria-[invalid=true]:border-red-500";

type FieldProps = {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  children: React.ReactNode;
};

// Le champ enfant doit porter id={id} et aria-describedby={`${id}-msg`}.
export function Field({ id, label, error, hint, optional, children }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
        {optional && <span className="font-normal text-slate-400"> (facultatif)</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-msg`} className="mt-1.5 text-sm text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-msg`} className="mt-1.5 text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function FormMessage({ state }: { state: FormState }) {
  if (!state.message) return null;
  return (
    <p
      role={state.ok ? "status" : "alert"}
      className={cn(
        "rounded-xl px-4 py-3 text-sm font-medium",
        state.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700",
      )}
    >
      {state.message}
    </p>
  );
}
```

- [ ] **Step 3: Créer `src/components/forms/SubmitButton.tsx`**

```tsx
"use client";

import { useFormStatus } from "react-dom";
import { buttonClass } from "@/components/ui/button";

type Props = {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: "brand" | "outline";
  className?: string;
};

export function SubmitButton({ children, pendingLabel = "Enregistrement…", variant = "brand", className }: Props) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={buttonClass(variant, "md", className)}>
      {pending ? pendingLabel : children}
    </button>
  );
}
```

- [ ] **Step 4: Créer `src/components/forms/PasswordInput.tsx`**

```tsx
"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type InputHTMLAttributes } from "react";
import { inputClass } from "@/components/forms/Field";
import { cn } from "@/lib/cn";

export function PasswordInput({ id, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { id: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? "text" : "password"}
        aria-describedby={`${id}-msg`}
        className={cn(inputClass, "pr-12", className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
      >
        {visible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      </button>
    </div>
  );
}
```

- [ ] **Step 5: Créer `src/components/forms/PhoneFields.tsx` et `CountrySelect.tsx`**

`src/components/forms/PhoneFields.tsx` :
```tsx
import { Field, inputClass } from "@/components/forms/Field";
import { cn } from "@/lib/cn";

type Bound = { name: string; value: string; onChange: React.ChangeEventHandler<HTMLInputElement> };

type Props = {
  id: string;
  label?: string;
  code: Bound;
  phone: Bound;
  codeError?: string;
  phoneError?: string;
  optional?: boolean;
};

export function PhoneFields({ id, label = "Téléphone", code, phone, codeError, phoneError, optional }: Props) {
  return (
    <Field id={id} label={label} optional={optional} error={phoneError ?? codeError} hint="Numéro WhatsApp de préférence">
      <div className="flex gap-2">
        <div className="relative w-24 shrink-0">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">+</span>
          <input aria-label="Indicatif pays" inputMode="numeric" aria-invalid={Boolean(codeError)} className={cn(inputClass, "pl-6")} {...code} />
        </div>
        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="77 123 45 67"
          aria-invalid={Boolean(phoneError)}
          aria-describedby={`${id}-msg`}
          className={inputClass}
          {...phone}
        />
      </div>
    </Field>
  );
}
```

`src/components/forms/CountrySelect.tsx` :
```tsx
import type { SelectHTMLAttributes } from "react";
import { inputClass } from "@/components/forms/Field";
import { COUNTRIES } from "@/lib/site";

type Props = SelectHTMLAttributes<HTMLSelectElement> & { id: string; invalid?: boolean; placeholder?: string };

export function CountrySelect({ id, invalid, placeholder = "Choisissez un pays", ...props }: Props) {
  return (
    <select id={id} aria-invalid={invalid} aria-describedby={`${id}-msg`} className={inputClass} {...props}>
      <option value="">{placeholder}</option>
      {COUNTRIES.map((country) => (
        <option key={country.code} value={country.code}>
          {country.name}
        </option>
      ))}
    </select>
  );
}
```

- [ ] **Step 6: Créer `src/components/auth/GoogleButton.tsx` et `Divider.tsx`**

`src/components/auth/GoogleButton.tsx` :
```tsx
"use client";

import { useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/browser";

export function GoogleButton({ next = "/app" }: { next?: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setPending(true);
    setError(null);
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error: oauthError } = await createBrowserSupabase().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (oauthError) {
      setError("Connexion Google impossible. Réessayez.");
      setPending(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="flex h-12 w-full items-center justify-center gap-3 rounded-full border border-slate-300 bg-white font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-60"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
          <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7Z" />
          <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z" />
          <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z" />
          <path fill="#EA4335" d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9Z" />
        </svg>
        {pending ? "Redirection…" : "Continuer avec Google"}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
```

`src/components/auth/Divider.tsx` :
```tsx
export function Divider() {
  return (
    <div className="my-6 flex items-center gap-3 text-sm text-slate-400" role="separator">
      <span className="h-px flex-1 bg-slate-200" />
      ou
      <span className="h-px flex-1 bg-slate-200" />
    </div>
  );
}
```

- [ ] **Step 7: Créer les formulaires d’auth**

`src/components/auth/SignUpForm.tsx` :
```tsx
"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { signUpAction } from "@/app/(auth)/actions";
import { Field, FormMessage, inputClass } from "@/components/forms/Field";
import { PasswordInput } from "@/components/forms/PasswordInput";
import { SubmitButton } from "@/components/forms/SubmitButton";
import type { FormState } from "@/lib/form-state";
import { useFormValues } from "@/lib/use-form-values";

export function SignUpForm() {
  const [state, action] = useActionState(signUpAction, {} as FormState);
  const { bind } = useFormValues({ email: "", password: "" });
  const [terms, setTerms] = useState(false);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} noValidate className="grid gap-4">
      <FormMessage state={state} />
      <Field id="email" label="Email" error={errors.email}>
        <input id="email" type="email" inputMode="email" autoComplete="email" aria-invalid={Boolean(errors.email)} aria-describedby="email-msg" className={inputClass} {...bind("email")} />
      </Field>
      <Field id="password" label="Mot de passe" error={errors.password} hint="8 caractères minimum">
        <PasswordInput id="password" autoComplete="new-password" aria-invalid={Boolean(errors.password)} {...bind("password")} />
      </Field>
      <div>
        <label className="flex items-start gap-2 text-sm text-slate-600">
          <input type="checkbox" name="terms" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#00C853]" />
          <span>
            J’accepte les{" "}
            <Link href="/cgu" target="_blank" className="font-semibold text-[#007A33] underline">
              CGU
            </Link>{" "}
            et la{" "}
            <Link href="/confidentialite" target="_blank" className="font-semibold text-[#007A33] underline">
              politique de confidentialité
            </Link>
            .
          </span>
        </label>
        {errors.terms && <p className="mt-1.5 text-sm text-red-600">{errors.terms}</p>}
      </div>
      <SubmitButton pendingLabel="Création du compte…" className="w-full">
        Créer mon compte
      </SubmitButton>
    </form>
  );
}
```

`src/components/auth/VerifyCodeForm.tsx` :
```tsx
"use client";

import { useActionState, useEffect, useState } from "react";
import { resendSignupCodeAction, verifySignupCodeAction } from "@/app/(auth)/actions";
import { Field, FormMessage, inputClass } from "@/components/forms/Field";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { cn } from "@/lib/cn";
import type { FormState } from "@/lib/form-state";
import { useFormValues } from "@/lib/use-form-values";

const COOLDOWN = 60;

export function VerifyCodeForm({ email }: { email: string }) {
  const [state, action] = useActionState(verifySignupCodeAction, {} as FormState);
  const [resendState, resendAction, resending] = useActionState(resendSignupCodeAction, {} as FormState);
  const { bind } = useFormValues({ code: "" });
  const [seconds, setSeconds] = useState(COOLDOWN);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  useEffect(() => {
    if (resendState.ok) setSeconds(COOLDOWN);
  }, [resendState]);

  return (
    <>
      <form action={action} noValidate className="grid gap-4">
        <FormMessage state={state} />
        <input type="hidden" name="email" value={email} />
        <Field id="code" label="Code à 6 chiffres" error={state.fieldErrors?.code}>
          <input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={7}
            placeholder="123456"
            aria-invalid={Boolean(state.fieldErrors?.code)}
            aria-describedby="code-msg"
            className={cn(inputClass, "text-center text-2xl font-bold tracking-[0.4em]")}
            {...bind("code")}
          />
        </Field>
        <SubmitButton pendingLabel="Vérification…" className="w-full">
          Valider
        </SubmitButton>
      </form>
      <form action={resendAction} className="mt-5 text-center text-sm">
        <input type="hidden" name="email" value={email} />
        {resendState.message && (
          <p role="status" className={cn("mb-2", resendState.ok ? "text-green-700" : "text-red-600")}>
            {resendState.message}
          </p>
        )}
        <button
          type="submit"
          disabled={seconds > 0 || resending}
          className="font-semibold text-[#007A33] underline disabled:text-slate-400 disabled:no-underline"
        >
          {seconds > 0 ? `Renvoyer le code dans ${seconds} s` : "Renvoyer le code"}
        </button>
      </form>
    </>
  );
}
```

`src/components/auth/SignInForm.tsx` :
```tsx
"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signInAction } from "@/app/(auth)/actions";
import { Field, FormMessage, inputClass } from "@/components/forms/Field";
import { PasswordInput } from "@/components/forms/PasswordInput";
import { SubmitButton } from "@/components/forms/SubmitButton";
import type { FormState } from "@/lib/form-state";
import { useFormValues } from "@/lib/use-form-values";

export function SignInForm({ next }: { next?: string }) {
  const [state, action] = useActionState(signInAction, {} as FormState);
  const { bind } = useFormValues({ email: "", password: "" });
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} noValidate className="grid gap-4">
      <FormMessage state={state} />
      {next && <input type="hidden" name="next" value={next} />}
      <Field id="email" label="Email" error={errors.email}>
        <input id="email" type="email" inputMode="email" autoComplete="email" aria-invalid={Boolean(errors.email)} aria-describedby="email-msg" className={inputClass} {...bind("email")} />
      </Field>
      <Field id="password" label="Mot de passe" error={errors.password}>
        <PasswordInput id="password" autoComplete="current-password" aria-invalid={Boolean(errors.password)} {...bind("password")} />
      </Field>
      <Link href="/mot-de-passe-oublie" className="-mt-1 justify-self-end text-sm font-semibold text-[#007A33] underline">
        Mot de passe oublié ?
      </Link>
      <SubmitButton pendingLabel="Connexion…" className="w-full">
        Se connecter
      </SubmitButton>
    </form>
  );
}
```

`src/components/auth/ResetPasswordFlow.tsx` :
```tsx
"use client";

import { useActionState, useEffect, useState } from "react";
import { requestPasswordResetAction, resetPasswordAction } from "@/app/(auth)/actions";
import { Field, FormMessage, inputClass } from "@/components/forms/Field";
import { PasswordInput } from "@/components/forms/PasswordInput";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { cn } from "@/lib/cn";
import type { FormState } from "@/lib/form-state";
import { useFormValues } from "@/lib/use-form-values";

export function ResetPasswordFlow() {
  const [requestState, requestAction] = useActionState(requestPasswordResetAction, {} as FormState);
  const [resetState, resetAction] = useActionState(resetPasswordAction, {} as FormState);
  const { values, bind } = useFormValues({ email: "", code: "", password: "" });
  const [step, setStep] = useState<1 | 2>(1);

  useEffect(() => {
    if (requestState.ok) setStep(2);
  }, [requestState]);

  if (step === 1) {
    return (
      <form action={requestAction} noValidate className="grid gap-4">
        <FormMessage state={requestState} />
        <Field id="email" label="Email de votre compte" error={requestState.fieldErrors?.email}>
          <input id="email" type="email" inputMode="email" autoComplete="email" aria-invalid={Boolean(requestState.fieldErrors?.email)} aria-describedby="email-msg" className={inputClass} {...bind("email")} />
        </Field>
        <SubmitButton pendingLabel="Envoi…" className="w-full">
          Recevoir un code
        </SubmitButton>
      </form>
    );
  }

  const errors = resetState.fieldErrors ?? {};
  return (
    <form action={resetAction} noValidate className="grid gap-4">
      <FormMessage state={resetState.message ? resetState : requestState} />
      <input type="hidden" name="email" value={values.email} />
      <Field id="code" label="Code à 6 chiffres" error={errors.code}>
        <input id="code" inputMode="numeric" autoComplete="one-time-code" maxLength={7} placeholder="123456" aria-invalid={Boolean(errors.code)} aria-describedby="code-msg" className={cn(inputClass, "text-center text-2xl font-bold tracking-[0.4em]")} {...bind("code")} />
      </Field>
      <Field id="password" label="Nouveau mot de passe" error={errors.password} hint="8 caractères minimum">
        <PasswordInput id="password" autoComplete="new-password" aria-invalid={Boolean(errors.password)} {...bind("password")} />
      </Field>
      <SubmitButton pendingLabel="Enregistrement…" className="w-full">
        Changer mon mot de passe
      </SubmitButton>
      <button type="button" onClick={() => setStep(1)} className="text-sm font-semibold text-[#007A33] underline">
        Changer d’email ou renvoyer un code
      </button>
    </form>
  );
}
```

- [ ] **Step 8: Créer le layout et les pages d’auth**

`src/app/(auth)/layout.tsx` :
```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center bg-[#04201D] px-4 py-10">
      <Link href="/" aria-label="Factoo — accueil">
        <Logo light />
      </Link>
      <main className="mt-8 w-full max-w-md rounded-3xl bg-white p-6 text-slate-900 shadow-2xl sm:p-8">{children}</main>
    </div>
  );
}
```

`src/app/(auth)/inscription/page.tsx` :
```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { Divider } from "@/components/auth/Divider";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { SignUpForm } from "@/components/auth/SignUpForm";

export const metadata: Metadata = { title: "Créer un compte — Factoo" };

export default function SignUpPage() {
  return (
    <>
      <h1 className="text-2xl font-extrabold">Créer votre compte</h1>
      <p className="mt-1 text-sm text-slate-500">Gratuit, sans carte bancaire.</p>
      <div className="mt-6">
        <GoogleButton next="/app" />
      </div>
      <Divider />
      <SignUpForm />
      <p className="mt-6 text-center text-sm text-slate-600">
        Déjà un compte ?{" "}
        <Link href="/connexion" className="font-semibold text-[#007A33] underline">
          Se connecter
        </Link>
      </p>
    </>
  );
}
```

`src/app/(auth)/inscription/code/page.tsx` :
```tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { VerifyCodeForm } from "@/components/auth/VerifyCodeForm";

export const metadata: Metadata = { title: "Confirmez votre email — Factoo" };

export default async function VerifyCodePage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  if (!email) redirect("/inscription");
  return (
    <>
      <h1 className="text-2xl font-extrabold">Confirmez votre email</h1>
      <p className="mt-1 text-sm text-slate-500">
        Nous avons envoyé un code à 6 chiffres à <span className="font-semibold text-slate-800">{email}</span>. Pensez à
        regarder dans les spams.
      </p>
      <div className="mt-6">
        <VerifyCodeForm email={email} />
      </div>
    </>
  );
}
```

`src/app/(auth)/connexion/page.tsx` :
```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { Divider } from "@/components/auth/Divider";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { SignInForm } from "@/components/auth/SignInForm";
import { safeNext } from "@/lib/routes";

export const metadata: Metadata = { title: "Connexion — Factoo" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; erreur?: string }> }) {
  const { next, erreur } = await searchParams;
  const destination = safeNext(next);
  return (
    <>
      <h1 className="text-2xl font-extrabold">Se connecter</h1>
      {erreur === "google" && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          Connexion Google annulée ou impossible. Réessayez.
        </p>
      )}
      <div className="mt-6">
        <GoogleButton next={destination} />
      </div>
      <Divider />
      <SignInForm next={destination} />
      <p className="mt-6 text-center text-sm text-slate-600">
        Pas encore de compte ?{" "}
        <Link href="/inscription" className="font-semibold text-[#007A33] underline">
          Créer un compte
        </Link>
      </p>
    </>
  );
}
```

`src/app/(auth)/mot-de-passe-oublie/page.tsx` :
```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordFlow } from "@/components/auth/ResetPasswordFlow";

export const metadata: Metadata = { title: "Mot de passe oublié — Factoo" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-2xl font-extrabold">Mot de passe oublié</h1>
      <p className="mt-1 text-sm text-slate-500">Recevez un code par email pour choisir un nouveau mot de passe.</p>
      <div className="mt-6">
        <ResetPasswordFlow />
      </div>
      <p className="mt-6 text-center text-sm text-slate-600">
        <Link href="/connexion" className="font-semibold text-[#007A33] underline">
          Retour à la connexion
        </Link>
      </p>
    </>
  );
}
```

- [ ] **Step 9: Vérifier**

Run: `npm run lint && npm test && npm run build`
Expected: tout vert ; les routes `/inscription`, `/inscription/code`, `/connexion`, `/mot-de-passe-oublie`, `/auth/callback` apparaissent dans la sortie du build.

Puis `npm run build && npm run start -- -p 3100` et, avec playwright-core (dossier scratchpad `e2e`) à 360 px et 1440 px : les 4 pages s’affichent sans débordement horizontal ; `/inscription` vide + « Créer mon compte » affiche « Email invalide », « 8 caractères minimum » et « Acceptez les CGU pour continuer » ; `/inscription/code` sans `email` redirige vers `/inscription` ; `/app` sans session redirige vers `/connexion?next=%2Fapp`.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat(auth): pages inscription, code, connexion, mot de passe oublié et bouton Google"
```

---

### Task 6: Session, dépôts, logos, coque de l’application et onboarding

**Files:**
- Create: `src/lib/logo.ts`, `src/lib/logo.test.ts`, `src/lib/settings.ts`, `src/lib/settings.test.ts`, `src/lib/repos.ts`, `src/lib/session.ts`, `src/components/app/{AppShell,NavLinks,OnboardingWizard}.tsx`, `src/app/app/layout.tsx`, `src/app/app/(main)/layout.tsx`, `src/app/app/(main)/page.tsx`, `src/app/app/bienvenue/page.tsx`, `src/app/app/bienvenue/actions.ts`

**Interfaces:**
- Consumes: `Profile`, `profileCompletion`, `displayName`, `logoUrl` (Task 2), `parseOnboarding`, `parseCompany`, `parseBilling`, `COUNTRY_DEFAULTS`, `DbResult`, `FormState`, `requireUser` (Task 1), `signOutAction` (Task 4).
- Produces:
  - `prepareLogo(file: unknown): Promise<{ status: "none" } | { status: "invalid"; message: string } | { status: "ready"; data: Buffer }>`
  - `interface ProfileRepo { update(patch: ProfilePatch): Promise<DbResult>; uploadLogo(data: Buffer): Promise<DbResult & { path?: string }>; removeLogo(path: string): Promise<DbResult> }`
  - `finishOnboarding(repo, raw, logo: unknown)`, `saveCompany(repo, current, raw)`, `saveBilling(repo, raw)`, `saveLogo(repo, currentPath, file)`, `deleteLogo(repo, currentPath)` → `Promise<FormState>`
  - `profileRepo(supabase, userId)`, `clientsRepo(supabase, userId)`, `getProfile`, `listClients`, `getClient`
  - `getSession()` → `{ supabase, user, profile }` (mis en cache par requête)

- [ ] **Step 1: Écrire le test qui échoue `src/lib/logo.test.ts`**

```ts
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { LOGO_MAX_BYTES, prepareLogo } from "@/lib/logo";

async function pngFile(width: number, height: number) {
  const buffer = await sharp({ create: { width, height, channels: 3, background: "#00C853" } }).png().toBuffer();
  return new File([new Uint8Array(buffer)], "logo.png", { type: "image/png" });
}

describe("prepareLogo", () => {
  it("ignore l’absence de fichier", async () => {
    expect(await prepareLogo(null)).toEqual({ status: "none" });
    expect(await prepareLogo(new File([], "", { type: "application/octet-stream" }))).toEqual({ status: "none" });
  });

  it("refuse un format non image", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "doc.pdf", { type: "application/pdf" });
    expect(await prepareLogo(file)).toEqual({ status: "invalid", message: "Format accepté : PNG, JPG ou WebP" });
  });

  it("refuse une image de plus de 5 Mo", async () => {
    const file = new File([new Uint8Array(LOGO_MAX_BYTES + 1)], "gros.png", { type: "image/png" });
    expect(await prepareLogo(file)).toEqual({ status: "invalid", message: "Image trop lourde (5 Mo max)" });
  });

  it("redimensionne à 512 px maximum et convertit en WebP", async () => {
    const result = await prepareLogo(await pngFile(2000, 1000));
    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;
    const meta = await sharp(result.data).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(512);
    expect(meta.height).toBe(256);
  });

  it("n’agrandit pas une petite image", async () => {
    const result = await prepareLogo(await pngFile(200, 100));
    if (result.status !== "ready") throw new Error("attendu : ready");
    expect((await sharp(result.data).metadata()).width).toBe(200);
  });

  it("signale une image illisible", async () => {
    const file = new File([new Uint8Array([1, 2, 3, 4])], "casse.png", { type: "image/png" });
    expect(await prepareLogo(file)).toEqual({ status: "invalid", message: "Image illisible, essayez un autre fichier" });
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier l’échec**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "@/lib/logo"`.

- [ ] **Step 3: Implémenter `src/lib/logo.ts`**

```ts
import sharp from "sharp";

export const LOGO_MAX_BYTES = 5 * 1024 * 1024;
const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];

export type LogoResult = { status: "none" } | { status: "invalid"; message: string } | { status: "ready"; data: Buffer };

export async function prepareLogo(file: unknown): Promise<LogoResult> {
  if (!(file instanceof File) || file.size === 0) return { status: "none" };
  if (!LOGO_TYPES.includes(file.type)) return { status: "invalid", message: "Format accepté : PNG, JPG ou WebP" };
  if (file.size > LOGO_MAX_BYTES) return { status: "invalid", message: "Image trop lourde (5 Mo max)" };
  try {
    const data = await sharp(Buffer.from(await file.arrayBuffer()))
      .rotate()
      .resize(512, 512, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();
    return { status: "ready", data };
  } catch {
    return { status: "invalid", message: "Image illisible, essayez un autre fichier" };
  }
}
```

- [ ] **Step 4: Écrire le test qui échoue `src/lib/settings.test.ts`**

```ts
import sharp from "sharp";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GENERIC_ERROR } from "@/lib/form-state";
import { deleteLogo, finishOnboarding, saveBilling, saveCompany, saveLogo, type ProfileRepo } from "@/lib/settings";

function fakeRepo(overrides: Partial<ProfileRepo> = {}): ProfileRepo {
  return {
    update: vi.fn(async () => ({ error: null })),
    uploadLogo: vi.fn(async () => ({ error: null, path: "u1/logo-1.webp" })),
    removeLogo: vi.fn(async () => ({ error: null })),
    ...overrides,
  };
}

async function logoFile() {
  const buffer = await sharp({ create: { width: 300, height: 300, channels: 3, background: "#04201D" } }).png().toBuffer();
  return new File([new Uint8Array(buffer)], "logo.png", { type: "image/png" });
}

const company = { companyName: "Studio Awa", address: "", city: "Dakar", country: "CM", countryCode: "221", phone: "", businessEmail: "", rccm: "", nif: "" };

afterEach(() => vi.restoreAllMocks());

describe("finishOnboarding", () => {
  it("enregistre l’entreprise, les valeurs du pays et marque l’onboarding terminé", async () => {
    const repo = fakeRepo();
    expect(await finishOnboarding(repo, { companyName: "Studio Awa", country: "CM" }, null)).toEqual({ ok: true, redirectTo: "/app" });
    const patch = vi.mocked(repo.update).mock.calls[0][0];
    expect(patch).toMatchObject({ company_name: "Studio Awa", country: "CM", currency: "XAF", vat_rate: 19.25 });
    expect(typeof patch.onboarded_at).toBe("string");
  });

  it("accepte un onboarding entièrement passé", async () => {
    const repo = fakeRepo();
    await finishOnboarding(repo, { companyName: "", country: "" }, null);
    const patch = vi.mocked(repo.update).mock.calls[0][0];
    expect(patch).toMatchObject({ company_name: null, country: null });
    expect(patch).not.toHaveProperty("currency");
  });

  it("téléverse le logo s’il est fourni", async () => {
    const repo = fakeRepo();
    await finishOnboarding(repo, { companyName: "", country: "SN" }, await logoFile());
    expect(repo.uploadLogo).toHaveBeenCalled();
    expect(vi.mocked(repo.update).mock.calls[0][0]).toMatchObject({ logo_path: "u1/logo-1.webp" });
  });

  it("refuse un logo invalide sans rien enregistrer", async () => {
    const repo = fakeRepo();
    const pdf = new File([new Uint8Array([1])], "x.pdf", { type: "application/pdf" });
    expect(await finishOnboarding(repo, { companyName: "", country: "" }, pdf)).toEqual({
      ok: false,
      fieldErrors: { logo: "Format accepté : PNG, JPG ou WebP" },
    });
    expect(repo.update).not.toHaveBeenCalled();
  });
});

describe("saveCompany", () => {
  it("réaligne devise et TVA si la TVA était celle de l’ancien pays", async () => {
    const repo = fakeRepo();
    const state = await saveCompany(repo, { country: "SN", currency: "XOF", vat_rate: 18 }, company);
    expect(state.ok).toBe(true);
    expect(state.message).toBe("Enregistré ✓ Devise et TVA ajustées pour ce pays.");
    expect(vi.mocked(repo.update).mock.calls[0][0]).toMatchObject({ country: "CM", currency: "XAF", vat_rate: 19.25 });
  });

  it("ne touche pas une TVA personnalisée", async () => {
    const repo = fakeRepo();
    const state = await saveCompany(repo, { country: "SN", currency: "XOF", vat_rate: 0 }, company);
    expect(state.message).toBe("Enregistré ✓");
    expect(vi.mocked(repo.update).mock.calls[0][0]).not.toHaveProperty("vat_rate");
  });

  it("applique les valeurs du pays quand aucun pays n’était défini", async () => {
    const repo = fakeRepo();
    await saveCompany(repo, { country: null, currency: "XOF", vat_rate: 18 }, company);
    expect(vi.mocked(repo.update).mock.calls[0][0]).toMatchObject({ vat_rate: 19.25 });
  });

  it("renvoie les erreurs de champ", async () => {
    const repo = fakeRepo();
    const state = await saveCompany(repo, { country: null, currency: "XOF", vat_rate: 18 }, { ...company, phone: "12" });
    expect(state.fieldErrors?.phone).toBe("Numéro invalide : 8 à 10 chiffres");
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("journalise une erreur de base", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const repo = fakeRepo({ update: vi.fn(async () => ({ error: { message: "boom" } })) });
    expect(await saveCompany(repo, { country: "SN", currency: "XOF", vat_rate: 18 }, company)).toEqual({ ok: false, message: GENERIC_ERROR });
    expect(log).toHaveBeenCalled();
  });
});

describe("saveBilling", () => {
  it("enregistre la devise et le taux", async () => {
    const repo = fakeRepo();
    expect(await saveBilling(repo, { currency: "EUR", vatRate: "20" })).toEqual({ ok: true, message: "Enregistré ✓" });
    expect(repo.update).toHaveBeenCalledWith({ currency: "EUR", vat_rate: 20 });
  });
});

describe("saveLogo / deleteLogo", () => {
  it("remplace le logo et supprime l’ancien fichier", async () => {
    const repo = fakeRepo();
    expect(await saveLogo(repo, "u1/ancien.webp", await logoFile())).toEqual({ ok: true, message: "Logo mis à jour ✓" });
    expect(repo.update).toHaveBeenCalledWith({ logo_path: "u1/logo-1.webp" });
    expect(repo.removeLogo).toHaveBeenCalledWith("u1/ancien.webp");
  });

  it("demande de choisir une image", async () => {
    expect(await saveLogo(fakeRepo(), null, null)).toEqual({ ok: false, message: "Choisissez une image." });
  });

  it("retire le logo", async () => {
    const repo = fakeRepo();
    expect(await deleteLogo(repo, "u1/logo.webp")).toEqual({ ok: true, message: "Logo retiré." });
    expect(repo.update).toHaveBeenCalledWith({ logo_path: null });
    expect(repo.removeLogo).toHaveBeenCalledWith("u1/logo.webp");
  });
});
```

- [ ] **Step 5: Lancer le test pour vérifier l’échec**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "@/lib/settings"`.

- [ ] **Step 6: Implémenter `src/lib/settings.ts`**

```ts
import type { DbResult } from "@/lib/db";
import { GENERIC_ERROR, type FormState } from "@/lib/form-state";
import { prepareLogo } from "@/lib/logo";
import type { Profile } from "@/lib/profile";
import { COUNTRY_DEFAULTS, type CountryCode } from "@/lib/site";
import {
  parseBilling,
  parseCompany,
  parseOnboarding,
  type BillingField,
  type BillingInput,
  type CompanyField,
  type CompanyInput,
  type OnboardingField,
} from "@/lib/validation";

export type ProfilePatch = Partial<
  CompanyInput & BillingInput & { logo_path: string | null; onboarded_at: string }
>;

export interface ProfileRepo {
  update(patch: ProfilePatch): Promise<DbResult>;
  uploadLogo(data: Buffer): Promise<DbResult & { path?: string }>;
  removeLogo(path: string): Promise<DbResult>;
}

type Raw = Record<string, unknown>;
const SAVED = "Enregistré ✓";
const DB_DEFAULT_VAT = 18;

function dbFail(where: string, error: { message: string }): FormState {
  console.error(`[profil] ${where} :`, error.message);
  return { ok: false, message: GENERIC_ERROR };
}

const countryDefaults = (country: CountryCode) => ({
  currency: COUNTRY_DEFAULTS[country].currency,
  vat_rate: COUNTRY_DEFAULTS[country].vatRate,
});

export async function finishOnboarding(repo: ProfileRepo, raw: Raw, logo: unknown): Promise<FormState<OnboardingField>> {
  const parsed = parseOnboarding(raw);
  if (!parsed.success) return { ok: false, fieldErrors: parsed.fieldErrors };
  const prepared = await prepareLogo(logo);
  if (prepared.status === "invalid") return { ok: false, fieldErrors: { logo: prepared.message } };

  const patch: ProfilePatch = { ...parsed.data, onboarded_at: new Date().toISOString() };
  if (parsed.data.country) Object.assign(patch, countryDefaults(parsed.data.country));

  if (prepared.status === "ready") {
    const uploaded = await repo.uploadLogo(prepared.data);
    if (uploaded.error) return dbFail("logo (onboarding)", uploaded.error);
    patch.logo_path = uploaded.path ?? null;
  }

  const { error } = await repo.update(patch);
  if (error) return dbFail("onboarding", error);
  return { ok: true, redirectTo: "/app" };
}

export async function saveCompany(
  repo: ProfileRepo,
  current: Pick<Profile, "country" | "currency" | "vat_rate">,
  raw: Raw,
): Promise<FormState<CompanyField>> {
  const parsed = parseCompany(raw);
  if (!parsed.success) return { ok: false, fieldErrors: parsed.fieldErrors };

  const patch: ProfilePatch = { ...parsed.data };
  const next = parsed.data.country;
  let adjusted = false;
  if (next && next !== current.country) {
    const previousDefault = current.country ? COUNTRY_DEFAULTS[current.country].vatRate : DB_DEFAULT_VAT;
    if (Number(current.vat_rate) === previousDefault) {
      Object.assign(patch, countryDefaults(next));
      adjusted = true;
    }
  }

  const { error } = await repo.update(patch);
  if (error) return dbFail("entreprise", error);
  return { ok: true, message: adjusted ? `${SAVED} Devise et TVA ajustées pour ce pays.` : SAVED };
}

export async function saveBilling(repo: ProfileRepo, raw: Raw): Promise<FormState<BillingField>> {
  const parsed = parseBilling(raw);
  if (!parsed.success) return { ok: false, fieldErrors: parsed.fieldErrors };
  const { error } = await repo.update(parsed.data);
  if (error) return dbFail("facturation", error);
  return { ok: true, message: SAVED };
}

export async function saveLogo(repo: ProfileRepo, currentPath: string | null, file: unknown): Promise<FormState> {
  const prepared = await prepareLogo(file);
  if (prepared.status === "none") return { ok: false, message: "Choisissez une image." };
  if (prepared.status === "invalid") return { ok: false, message: prepared.message };

  const uploaded = await repo.uploadLogo(prepared.data);
  if (uploaded.error || !uploaded.path) return dbFail("logo", uploaded.error ?? { message: "chemin manquant" });
  const { error } = await repo.update({ logo_path: uploaded.path });
  if (error) return dbFail("logo", error);
  if (currentPath) await repo.removeLogo(currentPath);
  return { ok: true, message: "Logo mis à jour ✓" };
}

export async function deleteLogo(repo: ProfileRepo, currentPath: string | null): Promise<FormState> {
  const { error } = await repo.update({ logo_path: null });
  if (error) return dbFail("retrait du logo", error);
  if (currentPath) await repo.removeLogo(currentPath);
  return { ok: true, message: "Logo retiré." };
}
```

- [ ] **Step 7: Relancer les tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 8: Créer `src/lib/repos.ts`**

```ts
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Client, ClientsRepo } from "@/lib/clients";
import type { Profile } from "@/lib/profile";
import type { ProfileRepo } from "@/lib/settings";

const CLIENT_COLUMNS = "id,name,phone,email,address,city,country,tax_id";

export function profileRepo(supabase: SupabaseClient, userId: string): ProfileRepo {
  return {
    async update(patch) {
      const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
      return { error };
    },
    async uploadLogo(data) {
      const path = `${userId}/logo-${Date.now()}.webp`;
      const { error } = await supabase.storage.from("logos").upload(path, data, { contentType: "image/webp" });
      return { error: error ? { message: error.message } : null, path };
    },
    async removeLogo(path) {
      const { error } = await supabase.storage.from("logos").remove([path]);
      return { error: error ? { message: error.message } : null };
    },
  };
}

export function clientsRepo(supabase: SupabaseClient, userId: string): ClientsRepo {
  return {
    async create(row) {
      const { error } = await supabase.from("clients").insert({ ...row, user_id: userId });
      return { error };
    },
    async update(id, row) {
      const { data, error } = await supabase.from("clients").update(row).eq("id", id).is("archived_at", null).select("id");
      return { error, found: (data?.length ?? 0) > 0 };
    },
    async archive(id) {
      const { data, error } = await supabase
        .from("clients")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", id)
        .is("archived_at", null)
        .select("id");
      return { error, found: (data?.length ?? 0) > 0 };
    },
  };
}

export async function getProfile(supabase: SupabaseClient, userId: string): Promise<Profile> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (error || !data) throw new Error(`[profil] lecture impossible : ${error?.message ?? "profil absent"}`);
  return { ...data, vat_rate: Number(data.vat_rate) } as Profile;
}

export async function listClients(supabase: SupabaseClient, search: string): Promise<Client[]> {
  let query = supabase.from("clients").select(CLIENT_COLUMNS).is("archived_at", null).order("name");
  const term = search.replace(/[%_,()*]/g, " ").trim();
  if (term) query = query.or(`name.ilike.%${term}%,phone.ilike.%${term.replace(/\s/g, "")}%`);
  const { data, error } = await query;
  if (error) throw new Error(`[clients] liste impossible : ${error.message}`);
  return (data ?? []) as Client[];
}

export async function getClient(supabase: SupabaseClient, id: string): Promise<Client | null> {
  const { data } = await supabase.from("clients").select(CLIENT_COLUMNS).eq("id", id).is("archived_at", null).maybeSingle();
  return (data as Client | null) ?? null;
}
```

Créer aussi dès maintenant `src/lib/clients.ts` avec les seuls types dont les dépôts ont besoin (la logique est ajoutée à la Task 7, Step 3, qui remplace ce fichier) :
```ts
import type { DbResult } from "@/lib/db";
import type { ClientInput } from "@/lib/validation";

export type Client = ClientInput & { id: string };

export interface ClientsRepo {
  create(row: ClientInput): Promise<DbResult>;
  update(id: string, row: ClientInput): Promise<DbResult & { found: boolean }>;
  archive(id: string): Promise<DbResult & { found: boolean }>;
}
```

- [ ] **Step 9: Créer `src/lib/session.ts`**

```ts
import "server-only";
import { cache } from "react";
import { getProfile } from "@/lib/repos";
import { requireUser } from "@/lib/supabase/server";

// Une seule lecture de l’utilisateur et du profil par requête (layout + page + actions).
export const getSession = cache(async () => {
  const { supabase, user } = await requireUser();
  const profile = await getProfile(supabase, user.id);
  return { supabase, user, profile };
});
```

- [ ] **Step 10: Créer la coque de l’application**

`src/components/app/NavLinks.tsx` :
```tsx
"use client";

import { FileText, LayoutDashboard, Settings, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const ITEMS = [
  { href: "/app", label: "Tableau de bord", short: "Accueil", icon: LayoutDashboard, exact: true },
  { href: null, label: "Factures", short: "Factures", icon: FileText, exact: false },
  { href: "/app/clients", label: "Clients", short: "Clients", icon: Users, exact: false },
  { href: "/app/parametres", label: "Paramètres", short: "Réglages", icon: Settings, exact: false },
];

export function NavLinks({ variant }: { variant: "side" | "bottom" }) {
  const pathname = usePathname();
  const side = variant === "side";

  return (
    <ul className={side ? "mt-8 grid gap-1" : "grid grid-cols-4"}>
      {ITEMS.map(({ href, label, short, icon: Icon, exact }) => {
        const active = href !== null && (exact ? pathname === href : pathname.startsWith(href));
        const content = (
          <>
            <Icon className="h-5 w-5" aria-hidden="true" />
            <span className={side ? "" : "text-[11px]"}>{side ? label : short}</span>
            {href === null && (
              <span className={cn("rounded-full bg-white/10 px-1.5 text-[10px] font-bold uppercase", !side && "sr-only")}>Bientôt</span>
            )}
          </>
        );
        const base = side
          ? "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold"
          : "flex flex-col items-center gap-1 py-2 font-semibold";
        return (
          <li key={label}>
            {href === null ? (
              <span aria-disabled="true" className={cn(base, "cursor-not-allowed text-white/35")}>
                {content}
              </span>
            ) : (
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(base, active ? "bg-white/10 text-[#00C853]" : "text-white/75 hover:bg-white/5 hover:text-white")}
              >
                {content}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
```

`src/components/app/AppShell.tsx` :
```tsx
import { LogOut } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { signOutAction } from "@/app/(auth)/actions";
import { NavLinks } from "@/components/app/NavLinks";
import { Logo } from "@/components/ui/Logo";

type Props = { companyName: string | null; logoUrl: string | null; children: React.ReactNode };

export function AppShell({ companyName, logoUrl, children }: Props) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 lg:flex">
      <aside className="hidden lg:block lg:w-64 lg:shrink-0">
        <div className="sticky top-0 flex h-screen flex-col bg-[#04201D] p-5 text-white">
          <Link href="/app" aria-label="Factoo — tableau de bord">
            <Logo light />
          </Link>
          <nav aria-label="Navigation de l’application">
            <NavLinks variant="side" />
          </nav>
        </div>
      </aside>

      <div className="min-w-0 flex-1 pb-20 lg:pb-0">
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            {logoUrl ? (
              <Image src={logoUrl} alt="" width={36} height={36} className="h-9 w-9 rounded-lg border border-slate-200 object-contain" />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#04201D] text-sm font-extrabold text-white">
                {(companyName ?? "F").charAt(0).toUpperCase()}
              </span>
            )}
            <p className="truncate font-bold">{companyName ?? "Mon entreprise"}</p>
          </div>
          <form action={signOutAction}>
            <button type="submit" className="flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only sm:not-sr-only">Se déconnecter</span>
            </button>
          </form>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-6 lg:px-8 lg:py-10">{children}</main>
      </div>

      <nav aria-label="Navigation de l’application" className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#04201D] lg:hidden">
        <NavLinks variant="bottom" />
      </nav>
    </div>
  );
}
```

- [ ] **Step 11: Créer les layouts et l’accueil**

`src/app/app/layout.tsx` :
```tsx
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Factoo", robots: { index: false, follow: false } };

export default function AppRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
```

`src/app/app/(main)/layout.tsx` :
```tsx
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { logoUrl } from "@/lib/profile";
import { getSession } from "@/lib/session";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await getSession();
  if (!profile.onboarded_at) redirect("/app/bienvenue");
  return (
    <AppShell companyName={profile.company_name} logoUrl={logoUrl(profile.logo_path)}>
      {children}
    </AppShell>
  );
}
```

`src/app/app/(main)/page.tsx` :
```tsx
import { Building2, FileText, UserPlus } from "lucide-react";
import Link from "next/link";
import { displayName, profileCompletion } from "@/lib/profile";
import { getSession } from "@/lib/session";

const card = "flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 font-semibold transition hover:border-[#00C853]";

export default async function DashboardPage() {
  const { user, profile } = await getSession();
  const completion = profileCompletion(profile);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold sm:text-3xl">Bonjour {displayName(profile, user.email)} 👋</h1>
        <p className="mt-1 text-slate-500">Bienvenue sur votre espace Factoo.</p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">Profil complété</h2>
          <span className="font-bold text-[#007A33]">{completion} %</span>
        </div>
        <div className="mt-3 h-2 rounded-full bg-slate-100" role="progressbar" aria-label="Profil complété" aria-valuenow={completion} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-2 rounded-full bg-[#00C853]" style={{ width: `${completion}%` }} />
        </div>
        {completion < 100 && <p className="mt-3 text-sm text-slate-500">Ces informations apparaîtront sur vos factures.</p>}
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/app/clients/nouveau" className={card}>
          <UserPlus className="h-5 w-5 text-[#007A33]" aria-hidden="true" /> Ajouter un client
        </Link>
        <Link href="/app/parametres" className={card}>
          <Building2 className="h-5 w-5 text-[#007A33]" aria-hidden="true" /> Compléter mon profil
        </Link>
      </div>

      <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
        <FileText className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
        <h2 className="mt-2 font-bold">Vos factures arrivent bientôt</h2>
        <p className="mt-1 text-sm text-slate-500">La création de factures sera disponible dans la prochaine mise à jour.</p>
      </section>
    </div>
  );
}
```

- [ ] **Step 12: Créer l’onboarding**

`src/app/app/bienvenue/actions.ts` :
```ts
"use server";

import { redirect } from "next/navigation";
import type { FormState } from "@/lib/form-state";
import { profileRepo } from "@/lib/repos";
import { finishOnboarding } from "@/lib/settings";
import { requireUser } from "@/lib/supabase/server";

export async function finishOnboardingAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, user } = await requireUser();
  const logo = formData.get("skipLogo") ? null : formData.get("logo");
  const result = await finishOnboarding(profileRepo(supabase, user.id), Object.fromEntries(formData), logo);
  if (result.ok && result.redirectTo) redirect(result.redirectTo);
  return result;
}
```

`src/components/app/OnboardingWizard.tsx` :
```tsx
"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { finishOnboardingAction } from "@/app/app/bienvenue/actions";
import { CountrySelect } from "@/components/forms/CountrySelect";
import { Field, FormMessage, inputClass } from "@/components/forms/Field";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { buttonClass } from "@/components/ui/button";
import type { FormState } from "@/lib/form-state";
import { COUNTRY_DEFAULTS, CURRENCY_LABELS, type CountryCode } from "@/lib/site";
import { useFormValues } from "@/lib/use-form-values";

const STEPS = ["Votre entreprise", "Votre pays", "Votre logo"];

export function OnboardingWizard({ initial }: { initial: { companyName: string; country: string } }) {
  const [state, action] = useActionState(finishOnboardingAction, {} as FormState);
  const { values, bind } = useFormValues(initial);
  const [step, setStep] = useState(state.fieldErrors?.logo ? 2 : 0);
  const [preview, setPreview] = useState<string | null>(null);
  const defaults = values.country ? COUNTRY_DEFAULTS[values.country as CountryCode] : null;
  const next = () => setStep((s) => Math.min(s + 1, 2));

  return (
    <form action={action} noValidate className="grid gap-6">
      <div>
        <p className="text-sm font-semibold text-slate-500">
          Étape {step + 1} sur 3 · {STEPS[step]}
        </p>
        <div className="mt-2 h-1.5 rounded-full bg-slate-100">
          <div className="h-1.5 rounded-full bg-[#00C853] transition-all" style={{ width: `${((step + 1) / 3) * 100}%` }} />
        </div>
      </div>
      <FormMessage state={state} />

      <div hidden={step !== 0} className="grid gap-4">
        <h1 className="text-2xl font-extrabold">Comment s’appelle votre entreprise ?</h1>
        <Field id="companyName" label="Nom de l’entreprise" hint="Il apparaîtra sur vos factures." error={state.fieldErrors?.companyName}>
          <input id="companyName" autoComplete="organization" aria-describedby="companyName-msg" className={inputClass} {...bind("companyName")} />
        </Field>
      </div>

      <div hidden={step !== 1} className="grid gap-4">
        <h1 className="text-2xl font-extrabold">Où êtes-vous basé ?</h1>
        <Field id="country" label="Pays" error={state.fieldErrors?.country}>
          <CountrySelect id="country" {...bind("country")} />
        </Field>
        {defaults && (
          <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Devise : {CURRENCY_LABELS[defaults.currency]} · TVA : {String(defaults.vatRate).replace(".", ",")} % — modifiables dans les paramètres.
          </p>
        )}
      </div>

      <div hidden={step !== 2} className="grid gap-4">
        <h1 className="text-2xl font-extrabold">Ajoutez votre logo</h1>
        <Field id="logo" label="Logo" optional hint="PNG, JPG ou WebP, 5 Mo maximum." error={state.fieldErrors?.logo}>
          <input
            id="logo"
            name="logo"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            aria-describedby="logo-msg"
            onChange={(e) => {
              const file = e.target.files?.[0];
              setPreview(file ? URL.createObjectURL(file) : null);
            }}
            className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:font-semibold"
          />
        </Field>
        {preview && <Image src={preview} alt="Aperçu du logo" width={96} height={96} unoptimized className="h-24 w-24 rounded-2xl border border-slate-200 object-contain" />}
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        {step > 0 ? (
          <button type="button" onClick={() => setStep((s) => s - 1)} className={buttonClass("outline", "md")}>
            Retour
          </button>
        ) : (
          <span />
        )}
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          {step < 2 ? (
            <>
              <button type="button" onClick={next} className={buttonClass("outline", "md")}>
                Passer
              </button>
              <button type="button" onClick={next} className={buttonClass("brand", "md")}>
                Continuer
              </button>
            </>
          ) : (
            <>
              <button type="submit" name="skipLogo" value="1" className={buttonClass("outline", "md")}>
                Passer
              </button>
              <SubmitButton pendingLabel="Enregistrement…">Terminer</SubmitButton>
            </>
          )}
        </div>
      </div>
    </form>
  );
}
```

`src/app/app/bienvenue/page.tsx` :
```tsx
import { redirect } from "next/navigation";
import { OnboardingWizard } from "@/components/app/OnboardingWizard";
import { Logo } from "@/components/ui/Logo";
import { getSession } from "@/lib/session";

export default async function WelcomePage() {
  const { profile } = await getSession();
  if (profile.onboarded_at) redirect("/app");
  return (
    <div className="flex min-h-screen flex-col items-center bg-[#04201D] px-4 py-10">
      <Logo light />
      <main className="mt-8 w-full max-w-lg rounded-3xl bg-white p-6 text-slate-900 shadow-2xl sm:p-8">
        <OnboardingWizard initial={{ companyName: profile.company_name ?? "", country: profile.country ?? "" }} />
      </main>
    </div>
  );
}
```

- [ ] **Step 13: Vérifier**

Run: `npm run lint && npm test && npm run build`
Expected: tout vert.

- [ ] **Step 14: Commit**

```bash
git add -A
git commit -m "feat(app): coque de l’application, accueil provisoire, onboarding et logique profil/logo"
```

---

### Task 7: Répertoire clients

**Files:**
- Modify: `src/lib/clients.ts` (compléter les types créés à la Task 6)
- Create: `src/lib/clients.test.ts`, `src/components/app/ClientForm.tsx`, `src/components/app/ArchiveClientButton.tsx`, `src/app/app/(main)/clients/actions.ts`, `src/app/app/(main)/clients/page.tsx`, `src/app/app/(main)/clients/nouveau/page.tsx`, `src/app/app/(main)/clients/[id]/page.tsx`

**Interfaces:**
- Consumes: `parseClient`, `ClientInput`, `ClientField` (Task 2), `splitPhone`, `formatPhone` (Task 2), `clientsRepo`, `listClients`, `getClient` (Task 6), `getSession`, `requireUser`.
- Produces: `type Client = ClientInput & { id: string }` ; `interface ClientsRepo { create(row): Promise<DbResult>; update(id, row): Promise<DbResult & { found: boolean }>; archive(id): Promise<DbResult & { found: boolean }> }` ; `saveClient(repo, id | null, raw)`, `archiveClient(repo, id)` → `Promise<FormState>` ; `clientToFormValues(client | null, defaultDial)` ; `CLIENT_FLASH`.

- [ ] **Step 1: Écrire le test qui échoue `src/lib/clients.test.ts`**

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { archiveClient, clientToFormValues, saveClient, type ClientsRepo } from "@/lib/clients";
import { GENERIC_ERROR } from "@/lib/form-state";

function fakeRepo(overrides: Partial<ClientsRepo> = {}): ClientsRepo {
  return {
    create: vi.fn(async () => ({ error: null })),
    update: vi.fn(async () => ({ error: null, found: true })),
    archive: vi.fn(async () => ({ error: null, found: true })),
    ...overrides,
  };
}

const form = { name: "Agence Teranga", countryCode: "221", phone: "77 123 45 67", email: "", address: "", city: "Dakar", country: "SN", taxId: "" };

afterEach(() => vi.restoreAllMocks());

describe("saveClient", () => {
  it("crée un client et revient à la liste", async () => {
    const repo = fakeRepo();
    expect(await saveClient(repo, null, form)).toEqual({ ok: true, redirectTo: "/app/clients?ok=ajoute" });
    expect(repo.create).toHaveBeenCalledWith({
      name: "Agence Teranga",
      phone: "+221771234567",
      email: null,
      address: null,
      city: "Dakar",
      country: "SN",
      tax_id: null,
    });
  });

  it("modifie un client existant", async () => {
    const repo = fakeRepo();
    expect(await saveClient(repo, "c1", form)).toEqual({ ok: true, redirectTo: "/app/clients?ok=modifie" });
    expect(repo.update).toHaveBeenCalledWith("c1", expect.objectContaining({ name: "Agence Teranga" }));
  });

  it("signale un client introuvable (archivé ou d’un autre compte)", async () => {
    const repo = fakeRepo({ update: vi.fn(async () => ({ error: null, found: false })) });
    expect(await saveClient(repo, "c1", form)).toEqual({ ok: false, message: "Client introuvable." });
  });

  it("renvoie les erreurs de champ sans écrire", async () => {
    const repo = fakeRepo();
    const state = await saveClient(repo, null, { ...form, name: "" });
    expect(state.fieldErrors?.name).toBe("Le nom est obligatoire");
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("journalise une erreur de base", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const repo = fakeRepo({ create: vi.fn(async () => ({ error: { message: "boom" } })) });
    expect(await saveClient(repo, null, form)).toEqual({ ok: false, message: GENERIC_ERROR });
    expect(log).toHaveBeenCalled();
  });
});

describe("archiveClient", () => {
  it("archive et revient à la liste", async () => {
    expect(await archiveClient(fakeRepo(), "c1")).toEqual({ ok: true, redirectTo: "/app/clients?ok=archive" });
  });

  it("signale un client introuvable", async () => {
    const repo = fakeRepo({ archive: vi.fn(async () => ({ error: null, found: false })) });
    expect(await archiveClient(repo, "c1")).toEqual({ ok: false, message: "Client introuvable." });
  });
});

describe("clientToFormValues", () => {
  it("prépare les champs du formulaire", () => {
    expect(
      clientToFormValues(
        { id: "c1", name: "Teranga", phone: "+2250701020304", email: null, address: null, city: "Abidjan", country: "CI", tax_id: null },
        "221",
      ),
    ).toEqual({ name: "Teranga", countryCode: "225", phone: "0701020304", email: "", address: "", city: "Abidjan", country: "CI", taxId: "" });
    expect(clientToFormValues(null, "226")).toMatchObject({ name: "", countryCode: "226", phone: "" });
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier l’échec**

Run: `npm test`
Expected: FAIL — `saveClient` / `archiveClient` / `clientToFormValues` non exportés.

- [ ] **Step 3: Implémenter `src/lib/clients.ts`**

```ts
import type { DbResult } from "@/lib/db";
import { GENERIC_ERROR, type FormState } from "@/lib/form-state";
import { splitPhone } from "@/lib/phone";
import { parseClient, type ClientField, type ClientInput } from "@/lib/validation";

export type Client = ClientInput & { id: string };

export interface ClientsRepo {
  create(row: ClientInput): Promise<DbResult>;
  update(id: string, row: ClientInput): Promise<DbResult & { found: boolean }>;
  archive(id: string): Promise<DbResult & { found: boolean }>;
}

export const CLIENT_FLASH: Record<string, string> = {
  ajoute: "Client ajouté ✓",
  modifie: "Client modifié ✓",
  archive: "Client archivé.",
};

const NOT_FOUND = "Client introuvable.";

function dbFail(where: string, error: { message: string }): FormState<ClientField> {
  console.error(`[clients] ${where} :`, error.message);
  return { ok: false, message: GENERIC_ERROR };
}

export async function saveClient(repo: ClientsRepo, id: string | null, raw: Record<string, unknown>): Promise<FormState<ClientField>> {
  const parsed = parseClient(raw);
  if (!parsed.success) return { ok: false, fieldErrors: parsed.fieldErrors };

  if (id === null) {
    const { error } = await repo.create(parsed.data);
    if (error) return dbFail("création", error);
    return { ok: true, redirectTo: "/app/clients?ok=ajoute" };
  }

  const { error, found } = await repo.update(id, parsed.data);
  if (error) return dbFail("modification", error);
  if (!found) return { ok: false, message: NOT_FOUND };
  return { ok: true, redirectTo: "/app/clients?ok=modifie" };
}

export async function archiveClient(repo: ClientsRepo, id: string): Promise<FormState> {
  const { error, found } = await repo.archive(id);
  if (error) return dbFail("archivage", error);
  if (!found) return { ok: false, message: NOT_FOUND };
  return { ok: true, redirectTo: "/app/clients?ok=archive" };
}

export function clientToFormValues(client: Client | null, defaultDial: string) {
  const { countryCode, phone } = splitPhone(client?.phone ?? null, defaultDial);
  return {
    name: client?.name ?? "",
    countryCode,
    phone,
    email: client?.email ?? "",
    address: client?.address ?? "",
    city: client?.city ?? "",
    country: client?.country ?? "",
    taxId: client?.tax_id ?? "",
  };
}
```

- [ ] **Step 4: Relancer les tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Créer `src/app/app/(main)/clients/actions.ts`**

```ts
"use server";

import { redirect } from "next/navigation";
import { archiveClient, saveClient } from "@/lib/clients";
import type { FormState } from "@/lib/form-state";
import { clientsRepo } from "@/lib/repos";
import { requireUser } from "@/lib/supabase/server";

export async function saveClientAction(id: string | null, _prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, user } = await requireUser();
  const result = await saveClient(clientsRepo(supabase, user.id), id, Object.fromEntries(formData));
  if (result.ok && result.redirectTo) redirect(result.redirectTo);
  return result;
}

export async function archiveClientAction(id: string, _prev: FormState): Promise<FormState> {
  const { supabase, user } = await requireUser();
  const result = await archiveClient(clientsRepo(supabase, user.id), id);
  if (result.ok && result.redirectTo) redirect(result.redirectTo);
  return result;
}
```

- [ ] **Step 6: Créer `src/components/app/ClientForm.tsx` et `ArchiveClientButton.tsx`**

`src/components/app/ClientForm.tsx` :
```tsx
"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CountrySelect } from "@/components/forms/CountrySelect";
import { Field, FormMessage, inputClass } from "@/components/forms/Field";
import { PhoneFields } from "@/components/forms/PhoneFields";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { buttonClass } from "@/components/ui/button";
import type { FormState } from "@/lib/form-state";
import { useFormValues } from "@/lib/use-form-values";

type Values = {
  name: string;
  countryCode: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  country: string;
  taxId: string;
};

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial: Values;
};

export function ClientForm({ action, initial }: Props) {
  const [state, formAction] = useActionState(action, {} as FormState);
  const { bind } = useFormValues(initial);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} noValidate className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <FormMessage state={state} />
      <Field id="name" label="Nom ou raison sociale" error={errors.name}>
        <input id="name" autoComplete="organization" aria-invalid={Boolean(errors.name)} aria-describedby="name-msg" className={inputClass} {...bind("name")} />
      </Field>
      <PhoneFields id="phone" optional code={bind("countryCode")} phone={bind("phone")} codeError={errors.countryCode} phoneError={errors.phone} />
      <Field id="email" label="Email" optional error={errors.email}>
        <input id="email" type="email" inputMode="email" aria-invalid={Boolean(errors.email)} aria-describedby="email-msg" className={inputClass} {...bind("email")} />
      </Field>
      <Field id="address" label="Adresse" optional error={errors.address}>
        <input id="address" autoComplete="street-address" aria-describedby="address-msg" className={inputClass} {...bind("address")} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="city" label="Ville" optional error={errors.city}>
          <input id="city" aria-describedby="city-msg" className={inputClass} {...bind("city")} />
        </Field>
        <Field id="country" label="Pays" optional error={errors.country}>
          <CountrySelect id="country" {...bind("country")} />
        </Field>
      </div>
      <Field id="taxId" label="Identifiant fiscal (NIF, NINEA…)" optional hint="Utile pour les clients entreprises." error={errors.taxId}>
        <input id="taxId" aria-describedby="taxId-msg" className={inputClass} {...bind("taxId")} />
      </Field>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link href="/app/clients" className={buttonClass("outline", "md")}>
          Annuler
        </Link>
        <SubmitButton>Enregistrer</SubmitButton>
      </div>
    </form>
  );
}
```

`src/components/app/ArchiveClientButton.tsx` :
```tsx
"use client";

import { Archive } from "lucide-react";
import { useActionState } from "react";
import { FormMessage } from "@/components/forms/Field";
import type { FormState } from "@/lib/form-state";

export function ArchiveClientButton({ action }: { action: (prev: FormState) => Promise<FormState> }) {
  const [state, formAction, pending] = useActionState(action, {} as FormState);
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!window.confirm("Archiver ce client ? Ses futures factures resteront consultables.")) e.preventDefault();
      }}
      className="grid gap-3"
    >
      <FormMessage state={state} />
      <button type="submit" disabled={pending} className="flex items-center gap-2 justify-self-start rounded-full px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60">
        <Archive className="h-4 w-4" aria-hidden="true" /> {pending ? "Archivage…" : "Archiver ce client"}
      </button>
    </form>
  );
}
```

- [ ] **Step 7: Créer les pages clients**

`src/app/app/(main)/clients/page.tsx` :
```tsx
import { ChevronRight, Plus, Search, Users } from "lucide-react";
import Link from "next/link";
import { inputClass } from "@/components/forms/Field";
import { buttonClass } from "@/components/ui/button";
import { CLIENT_FLASH } from "@/lib/clients";
import { cn } from "@/lib/cn";
import { formatPhone } from "@/lib/phone";
import { listClients } from "@/lib/repos";
import { getSession } from "@/lib/session";

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string; ok?: string }> }) {
  const { q = "", ok } = await searchParams;
  const { supabase } = await getSession();
  const clients = await listClients(supabase, q);
  const flash = ok ? CLIENT_FLASH[ok] : undefined;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold sm:text-3xl">Clients</h1>
        <div className="hidden sm:block">
          <Link href="/app/clients/nouveau" className={buttonClass("brand", "sm")}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Ajouter un client
          </Link>
        </div>
      </div>

      {flash && (
        <p role="status" className="rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
          {flash}
        </p>
      )}

      <form role="search" className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input name="q" defaultValue={q} placeholder="Rechercher par nom ou téléphone" aria-label="Rechercher un client" className={cn(inputClass, "pl-12")} />
      </form>

      {clients.length === 0 ? (
        q ? (
          <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-500">Aucun client ne correspond à « {q} ».</p>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <Users className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
            <h2 className="mt-2 font-bold">Aucun client pour l’instant</h2>
            <p className="mt-1 text-sm text-slate-500">Ajoutez vos clients une fois, retrouvez-les à chaque facture.</p>
            <Link href="/app/clients/nouveau" className={buttonClass("brand", "md", "mt-4")}>
              Ajouter un client
            </Link>
          </div>
        )
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {clients.map((client) => (
            <li key={client.id}>
              <Link href={`/app/clients/${client.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{client.name}</p>
                  <p className="truncate text-sm text-slate-500">
                    {[formatPhone(client.phone), client.email].filter(Boolean).join(" · ") || "Aucun contact"}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="sm:hidden">
        <Link
          href="/app/clients/nouveau"
          aria-label="Ajouter un client"
          className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#00C853] text-black shadow-lg"
        >
          <Plus className="h-6 w-6" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
```

`src/app/app/(main)/clients/nouveau/page.tsx` :
```tsx
import { ClientForm } from "@/components/app/ClientForm";
import { clientToFormValues } from "@/lib/clients";
import { getSession } from "@/lib/session";
import { COUNTRIES } from "@/lib/site";
import { saveClientAction } from "../actions";

export default async function NewClientPage() {
  const { profile } = await getSession();
  const dial = COUNTRIES.find((c) => c.code === profile.country)?.dial || "221";
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold sm:text-3xl">Nouveau client</h1>
      <ClientForm action={saveClientAction.bind(null, null)} initial={clientToFormValues(null, dial)} />
    </div>
  );
}
```

`src/app/app/(main)/clients/[id]/page.tsx` :
```tsx
import { notFound } from "next/navigation";
import { ArchiveClientButton } from "@/components/app/ArchiveClientButton";
import { ClientForm } from "@/components/app/ClientForm";
import { clientToFormValues } from "@/lib/clients";
import { getClient } from "@/lib/repos";
import { getSession } from "@/lib/session";
import { archiveClientAction, saveClientAction } from "../actions";

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await getSession();
  const client = await getClient(supabase, id);
  if (!client) notFound();

  return (
    <div className="space-y-5">
      <h1 className="truncate text-2xl font-extrabold sm:text-3xl">{client.name}</h1>
      <ClientForm action={saveClientAction.bind(null, id)} initial={clientToFormValues(client, "221")} />
      <ArchiveClientButton action={archiveClientAction.bind(null, id)} />
    </div>
  );
}
```

- [ ] **Step 8: Vérifier et commit**

Run: `npm run lint && npm test && npm run build`

```bash
git add -A
git commit -m "feat(clients): répertoire, création, modification et archivage"
```

---

### Task 8: Paramètres (entreprise, logo, facturation, compte)

**Files:**
- Create: `src/app/app/(main)/parametres/actions.ts`, `src/app/app/(main)/parametres/page.tsx`, `src/components/app/{CompanyForm,BillingForm,LogoForm,PasswordForm}.tsx`

**Interfaces:**
- Consumes: `saveCompany`, `saveBilling`, `saveLogo`, `deleteLogo` (Task 6), `changePassword` (Task 4), `profileRepo`, `getSession`, `authApi`, `splitPhone`, `logoUrl`, `CURRENCIES`, `CURRENCY_LABELS`, composants de formulaire (Task 5).
- Produces: Server Actions `saveCompanyAction`, `saveBillingAction`, `saveLogoAction`, `deleteLogoAction`, `changePasswordAction` ; page `/app/parametres`.

- [ ] **Step 1: Créer `src/app/app/(main)/parametres/actions.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { changePassword } from "@/lib/auth";
import type { FormState } from "@/lib/form-state";
import { profileRepo } from "@/lib/repos";
import { getSession } from "@/lib/session";
import { deleteLogo, saveBilling, saveCompany, saveLogo } from "@/lib/settings";
import { authApi } from "@/lib/supabase/server";

const entries = (formData: FormData) => Object.fromEntries(formData);

async function withProfile<T extends FormState>(fn: (ctx: Awaited<ReturnType<typeof getSession>>) => Promise<T>): Promise<T> {
  const session = await getSession();
  const result = await fn(session);
  if (result.ok) revalidatePath("/app", "layout");
  return result;
}

export async function saveCompanyAction(_prev: FormState, formData: FormData) {
  return withProfile(({ supabase, user, profile }) => saveCompany(profileRepo(supabase, user.id), profile, entries(formData)));
}

export async function saveBillingAction(_prev: FormState, formData: FormData) {
  return withProfile(({ supabase, user }) => saveBilling(profileRepo(supabase, user.id), entries(formData)));
}

export async function saveLogoAction(_prev: FormState, formData: FormData) {
  return withProfile(({ supabase, user, profile }) => saveLogo(profileRepo(supabase, user.id), profile.logo_path, formData.get("logo")));
}

export async function deleteLogoAction(_prev: FormState) {
  return withProfile(({ supabase, user, profile }) => deleteLogo(profileRepo(supabase, user.id), profile.logo_path));
}

export async function changePasswordAction(_prev: FormState, formData: FormData) {
  const { supabase } = await getSession();
  return changePassword(authApi(supabase), entries(formData));
}
```

- [ ] **Step 2: Créer les formulaires des paramètres**

`src/components/app/CompanyForm.tsx` :
```tsx
"use client";

import { useActionState } from "react";
import { saveCompanyAction } from "@/app/app/(main)/parametres/actions";
import { CountrySelect } from "@/components/forms/CountrySelect";
import { Field, FormMessage, inputClass } from "@/components/forms/Field";
import { PhoneFields } from "@/components/forms/PhoneFields";
import { SubmitButton } from "@/components/forms/SubmitButton";
import type { FormState } from "@/lib/form-state";
import { useFormValues } from "@/lib/use-form-values";

type Values = {
  companyName: string;
  address: string;
  city: string;
  country: string;
  countryCode: string;
  phone: string;
  businessEmail: string;
  rccm: string;
  nif: string;
};

export function CompanyForm({ initial }: { initial: Values }) {
  const [state, action] = useActionState(saveCompanyAction, {} as FormState);
  const { bind } = useFormValues(initial);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} noValidate className="grid gap-5">
      <FormMessage state={state} />
      <Field id="companyName" label="Nom de l’entreprise" error={errors.companyName}>
        <input id="companyName" autoComplete="organization" aria-describedby="companyName-msg" className={inputClass} {...bind("companyName")} />
      </Field>
      <Field id="address" label="Adresse" error={errors.address}>
        <input id="address" autoComplete="street-address" aria-describedby="address-msg" className={inputClass} {...bind("address")} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="city" label="Ville" error={errors.city}>
          <input id="city" aria-describedby="city-msg" className={inputClass} {...bind("city")} />
        </Field>
        <Field id="country" label="Pays" error={errors.country}>
          <CountrySelect id="country" {...bind("country")} />
        </Field>
      </div>
      <PhoneFields id="phone" code={bind("countryCode")} phone={bind("phone")} codeError={errors.countryCode} phoneError={errors.phone} />
      <Field id="businessEmail" label="Email professionnel" optional error={errors.businessEmail}>
        <input id="businessEmail" type="email" inputMode="email" aria-describedby="businessEmail-msg" className={inputClass} {...bind("businessEmail")} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="rccm" label="RCCM" optional error={errors.rccm}>
          <input id="rccm" aria-describedby="rccm-msg" className={inputClass} {...bind("rccm")} />
        </Field>
        <Field id="nif" label="NIF / NINEA" optional error={errors.nif}>
          <input id="nif" aria-describedby="nif-msg" className={inputClass} {...bind("nif")} />
        </Field>
      </div>
      <SubmitButton className="sm:justify-self-end">Enregistrer</SubmitButton>
    </form>
  );
}
```

`src/components/app/BillingForm.tsx` :
```tsx
"use client";

import { useActionState } from "react";
import { saveBillingAction } from "@/app/app/(main)/parametres/actions";
import { Field, FormMessage, inputClass } from "@/components/forms/Field";
import { SubmitButton } from "@/components/forms/SubmitButton";
import type { FormState } from "@/lib/form-state";
import { CURRENCIES, CURRENCY_LABELS } from "@/lib/site";
import { useFormValues } from "@/lib/use-form-values";

export function BillingForm({ initial }: { initial: { currency: string; vatRate: string } }) {
  const [state, action] = useActionState(saveBillingAction, {} as FormState);
  const { bind } = useFormValues(initial);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} noValidate className="grid gap-5">
      <FormMessage state={state} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="currency" label="Devise par défaut" error={errors.currency}>
          <select id="currency" aria-describedby="currency-msg" className={inputClass} {...bind("currency")}>
            {CURRENCIES.map((currency) => (
              <option key={currency} value={currency}>
                {CURRENCY_LABELS[currency]}
              </option>
            ))}
          </select>
        </Field>
        <Field id="vatRate" label="Taux de TVA (%)" error={errors.vatRate} hint="Pas assujetti à la TVA ? Mettez 0 %.">
          <input id="vatRate" inputMode="decimal" aria-invalid={Boolean(errors.vatRate)} aria-describedby="vatRate-msg" className={inputClass} {...bind("vatRate")} />
        </Field>
      </div>
      <SubmitButton className="sm:justify-self-end">Enregistrer</SubmitButton>
    </form>
  );
}
```

`src/components/app/LogoForm.tsx` :
```tsx
"use client";

import { ImageIcon } from "lucide-react";
import Image from "next/image";
import { useActionState, useState } from "react";
import { deleteLogoAction, saveLogoAction } from "@/app/app/(main)/parametres/actions";
import { FormMessage } from "@/components/forms/Field";
import { SubmitButton } from "@/components/forms/SubmitButton";
import type { FormState } from "@/lib/form-state";

export function LogoForm({ logoUrl }: { logoUrl: string | null }) {
  const [saveState, saveAction] = useActionState(saveLogoAction, {} as FormState);
  const [deleteState, deleteAction, deleting] = useActionState(deleteLogoAction, {} as FormState);
  const [preview, setPreview] = useState<string | null>(null);
  const shown = preview ?? logoUrl;

  return (
    <div className="grid gap-4">
      <FormMessage state={deleteState.message ? deleteState : saveState} />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
          {shown ? (
            <Image src={shown} alt="Logo de l’entreprise" width={96} height={96} unoptimized className="h-full w-full object-contain" />
          ) : (
            <ImageIcon className="h-8 w-8 text-slate-400" aria-hidden="true" />
          )}
        </div>
        <form action={saveAction} className="grid flex-1 gap-3">
          <label htmlFor="logo" className="text-sm font-semibold text-slate-700">
            {logoUrl ? "Remplacer le logo" : "Ajouter un logo"}{" "}
            <span className="font-normal text-slate-400">(PNG, JPG ou WebP, 5 Mo max.)</span>
          </label>
          <input
            id="logo"
            name="logo"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0];
              setPreview(file ? URL.createObjectURL(file) : null);
            }}
            className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:font-semibold"
          />
          <SubmitButton pendingLabel="Envoi…" className="sm:justify-self-start">
            Enregistrer le logo
          </SubmitButton>
        </form>
      </div>
      {logoUrl && (
        <form action={deleteAction}>
          <button type="submit" disabled={deleting} className="text-sm font-semibold text-red-700 underline disabled:opacity-60">
            {deleting ? "Retrait…" : "Retirer le logo"}
          </button>
        </form>
      )}
    </div>
  );
}
```

`src/components/app/PasswordForm.tsx` :
```tsx
"use client";

import { useActionState } from "react";
import { changePasswordAction } from "@/app/app/(main)/parametres/actions";
import { Field, FormMessage } from "@/components/forms/Field";
import { PasswordInput } from "@/components/forms/PasswordInput";
import { SubmitButton } from "@/components/forms/SubmitButton";
import type { FormState } from "@/lib/form-state";
import { useFormValues } from "@/lib/use-form-values";

export function PasswordForm() {
  const [state, action] = useActionState(changePasswordAction, {} as FormState);
  const { bind } = useFormValues({ password: "" });
  return (
    <form action={action} noValidate className="grid gap-4">
      <FormMessage state={state} />
      <Field id="password" label="Nouveau mot de passe" error={state.fieldErrors?.password} hint="8 caractères minimum">
        <PasswordInput id="password" autoComplete="new-password" aria-invalid={Boolean(state.fieldErrors?.password)} {...bind("password")} />
      </Field>
      <SubmitButton variant="outline" className="sm:justify-self-start">
        Changer le mot de passe
      </SubmitButton>
    </form>
  );
}
```

- [ ] **Step 3: Créer `src/app/app/(main)/parametres/page.tsx`**

```tsx
import { signOutAction } from "@/app/(auth)/actions";
import { BillingForm } from "@/components/app/BillingForm";
import { CompanyForm } from "@/components/app/CompanyForm";
import { LogoForm } from "@/components/app/LogoForm";
import { PasswordForm } from "@/components/app/PasswordForm";
import { splitPhone } from "@/lib/phone";
import { logoUrl } from "@/lib/profile";
import { getSession } from "@/lib/session";
import { COUNTRIES } from "@/lib/site";

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <h2 className="text-lg font-bold">{title}</h2>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default async function SettingsPage() {
  const { user, profile } = await getSession();
  const dial = COUNTRIES.find((c) => c.code === profile.country)?.dial || "221";
  const phone = splitPhone(profile.phone, dial);
  const providers = (user.app_metadata?.providers as string[] | undefined) ?? [user.app_metadata?.provider];
  const hasPassword = providers.includes("email");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold sm:text-3xl">Paramètres</h1>

      <Section title="Entreprise" description="Ces informations apparaissent sur vos factures.">
        <CompanyForm
          initial={{
            companyName: profile.company_name ?? "",
            address: profile.address ?? "",
            city: profile.city ?? "",
            country: profile.country ?? "",
            countryCode: phone.countryCode,
            phone: phone.phone,
            businessEmail: profile.business_email ?? "",
            rccm: profile.rccm ?? "",
            nif: profile.nif ?? "",
          }}
        />
      </Section>

      <Section title="Logo" description="Redimensionné automatiquement pour vos factures.">
        <LogoForm logoUrl={logoUrl(profile.logo_path)} />
      </Section>

      <Section title="Facturation">
        <BillingForm initial={{ currency: profile.currency, vatRate: String(profile.vat_rate).replace(".", ",") }} />
      </Section>

      <Section title="Compte">
        <p className="text-sm text-slate-600">
          Email : <span className="font-semibold text-slate-900">{user.email}</span>
        </p>
        <div className="mt-5">
          {hasPassword ? <PasswordForm /> : <p className="text-sm text-slate-500">Vous vous connectez avec Google.</p>}
        </div>
        <form action={signOutAction} className="mt-6 border-t border-slate-100 pt-5">
          <button type="submit" className="text-sm font-semibold text-red-700 underline">
            Se déconnecter
          </button>
        </form>
      </Section>
    </div>
  );
}
```

- [ ] **Step 4: Vérifier et commit**

Run: `npm run lint && npm test && npm run build`

```bash
git add -A
git commit -m "feat(parametres): entreprise, logo, facturation et compte"
```

---

### Task 9: Configuration Supabase Auth, parcours complet et mise en ligne

**Files:**
- Modify: `README.md`
- Create (hors projet, scratchpad `e2e/`) : `bloc2a.mjs`

**Interfaces:**
- Consumes: tout le bloc.

- [ ] **Step 1: Compléter `README.md`** avec une section « Authentification (bloc 2a) » qui liste :
  1. Migration `supabase/migrations/002_profiles_clients.sql` à exécuter.
  2. Variables `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` (type « Configuration » sur Vercel).
  3. Modèles d’email Supabase (Authentication → Emails), longueur OTP 6 :
     - **Confirm signup** — Objet : `Votre code Factoo : {{ .Token }}` — Corps :
       ```html
       <h2>Bienvenue sur Factoo</h2>
       <p>Votre code de confirmation :</p>
       <p style="font-size:32px;font-weight:800;letter-spacing:6px">{{ .Token }}</p>
       <p>Ce code expire dans 1 heure. Si vous n’avez pas créé de compte, ignorez cet email.</p>
       ```
     - **Reset password** — Objet : `Votre code de réinitialisation Factoo : {{ .Token }}` — Corps identique avec « Pour choisir un nouveau mot de passe, saisissez ce code : ».
  4. SMTP Resend (hôte `smtp.resend.com`, port `465`, utilisateur `resend`, mot de passe = clé API Resend, expéditeur `onboarding@resend.dev` tant que le domaine n’est pas vérifié).
  5. Google : Google Cloud Console → identifiant OAuth « Application Web », URI de redirection `https://<projet>.supabase.co/auth/v1/callback` ; Supabase → Authentication → Providers → Google.
  6. URL Configuration : Site URL `https://factoo-wine.vercel.app` ; Redirect URLs `http://localhost:3000/**` et `https://factoo-wine.vercel.app/**`.
  7. `npm run check:rls` pour vérifier l’isolation.

- [ ] **Step 2: Point d’arrêt — configuration guidée par l’utilisateur**

Guider l’utilisateur écran par écran pour les étapes 3 à 6 du README (une étape à la fois, vérifier chaque capture). Ajouter `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` dans Vercel (type « Configuration », Production et aperçu).

- [ ] **Step 3: Parcours navigateur automatisé (hors projet)**

Créer `e2e/bloc2a.mjs` dans le scratchpad :
```js
import { chromium } from "playwright-core";
import { createClient } from "@supabase/supabase-js";

const BASE = process.env.BASE || "http://localhost:3100";
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const email = `e2e-${Date.now()}@example.com`;
const password = "E2e-motdepasse!";
const results = [];
const check = (name, ok, extra = "") => results.push(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? ` — ${extra}` : ""}`);

const { data: created, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
if (error) throw error;
const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });

try {
  for (const width of [360, 1440]) {
    const page = await (await browser.newContext({ viewport: { width, height: 900 } })).newPage();
    const overflow = async () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

    await page.goto(`${BASE}/app/clients`);
    check(`${width}px : /app renvoie vers la connexion`, page.url().includes("/connexion?next="));
    await page.fill("#email", email);
    await page.fill("#password", password);
    await page.getByRole("button", { name: "Se connecter" }).click();

    if (width === 360) {
      await page.waitForURL("**/app/bienvenue");
      check("onboarding affiché au premier accès", true);
      await page.fill("#companyName", "Studio E2E");
      await page.getByRole("button", { name: "Continuer" }).click();
      await page.selectOption("#country", "CM");
      check("TVA suggérée pour le Cameroun", await page.getByText("19,25 %").isVisible());
      await page.getByRole("button", { name: "Continuer" }).click();
      await page.getByRole("button", { name: "Passer" }).click();
      await page.waitForURL(`${BASE}/app`);
      check("onboarding terminé → accueil", true);
    } else {
      await page.waitForURL("**/app/clients");
      check("connexion → page demandée", true);
    }
    check(`${width}px : pas de débordement sur /app`, (await overflow()) <= 0);

    await page.goto(`${BASE}/app/clients/nouveau`);
    await page.getByRole("button", { name: "Enregistrer" }).click();
    check(`${width}px : nom obligatoire`, await page.getByText("Le nom est obligatoire").isVisible());
    await page.fill("#name", `Client ${width}`);
    await page.fill("#phone", "77 123 45 67");
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await page.waitForURL("**/app/clients?ok=ajoute");
    check(`${width}px : client ajouté`, await page.getByText(`Client ${width}`).isVisible());

    await page.getByText(`Client ${width}`).click();
    await page.fill("#city", "Douala");
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await page.waitForURL("**/app/clients?ok=modifie");
    check(`${width}px : client modifié`, true);

    await page.getByText(`Client ${width}`).click();
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Archiver ce client" }).click();
    await page.waitForURL("**/app/clients?ok=archive");
    check(`${width}px : client archivé`, !(await page.getByText(`Client ${width}`).isVisible()));

    await page.goto(`${BASE}/app/parametres`);
    await page.fill("#vatRate", "19,25");
    await page.locator("form", { has: page.locator("#vatRate") }).getByRole("button", { name: "Enregistrer" }).click();
    check(`${width}px : TVA enregistrée`, await page.getByText("Enregistré ✓").first().isVisible());
    check(`${width}px : pas de débordement sur les paramètres`, (await overflow()) <= 0);
    await page.close();
  }
} catch (e) {
  check("exécution", false, String(e?.message ?? e));
} finally {
  await browser.close();
  await admin.auth.admin.deleteUser(created.user.id);
}
console.log(results.join("\n"));
```

Run : `npm run build && npm run start -- -p 3100` (en arrière-plan), puis depuis le scratchpad `node --env-file="D:/LE BUREAU/factoocosen/.env.local" e2e/bloc2a.mjs`.
Expected: toutes les lignes `PASS` ; le compte de test est supprimé à la fin.

- [ ] **Step 4: Tests manuels par l’utilisateur**

Demander à l’utilisateur (avec l’adresse email de son compte Resend, seule autorisée en mode test) :
1. `/inscription` → réception du code → saisie → onboarding.
2. Déconnexion → « Mot de passe oublié » → code → nouveau mot de passe → connexion.
3. « Continuer avec Google » → onboarding (nouveau compte) ou accueil.

- [ ] **Step 5: Vérification finale, commit et déploiement**

Run: `npm run lint && npm test && npm run build && npm run check:rls`
Expected: tout vert, 8 `PASS` RLS.

```bash
git add -A
git commit -m "docs: configuration Supabase Auth, Resend et Google pour le bloc 2a"
git push
```
Attendre le déploiement Vercel, puis vérifier en ligne : `/connexion` s’affiche, `/app` sans session renvoie vers `/connexion`, la landing est inchangée.
