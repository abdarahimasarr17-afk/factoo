# Factoo Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construire la landing page pré-lancement de Factoo (Next.js) avec un formulaire de liste d'attente enregistré dans Supabase et un contact WhatsApp direct.

**Architecture:** Projet Next.js 15 (App Router) qui deviendra l'application complète. La page est statique, découpée en un composant par section ; seuls la navbar mobile, le toggle de thème et le formulaire sont des composants client. Le formulaire appelle une Server Action qui délègue à une fonction pure testable (`submitWaitlist`) recevant l'insertion Supabase en injection.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS v4, next-themes, lucide-react, zod 3, @supabase/supabase-js, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-24-landing-page-design.md`

## Global Constraints

- Langue : français uniquement, **vouvoiement**. Pas de sélecteur de langue.
- Dans le texte JSX, utiliser l'apostrophe typographique `’` (jamais `'`), sinon ESLint (`react/no-unescaped-entities`) casse le build.
- Couleurs uniquement via les tokens CSS de `src/app/globals.css` (`bg-primary`, `text-muted`, `bg-hero`…), sauf dans les maquettes du hero (`HeroVisual`) et l'image OG, qui sont volontairement fixes.
- Primaire `#0F766E` / clair `#14B8A6` ; accent ambre `#F59E0B` ; fond hero `#04201D`.
- Police : Plus Jakarta Sans via `next/font/google`, variable `--font-jakarta`.
- Aucun secret côté client : `SUPABASE_SERVICE_ROLE_KEY` n'est lu que dans `src/lib/supabase.ts` (importe `server-only`).
- Variables d'environnement : `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_WHATSAPP_NUMBER`, `NEXT_PUBLIC_SITE_URL` (ajoutée pour `metadataBase`, défaut `http://localhost:3000`).
- Si `NEXT_PUBLIC_WHATSAPP_NUMBER` est vide, aucun bouton/lien WhatsApp n'est rendu.
- Pas de témoignages fictifs, pas de compteur d'utilisateurs chiffré.
- Mobile d'abord (360–414 px), aucun scroll horizontal ; animations désactivées sous `prefers-reduced-motion`.
- Chaque tâche se termine par `npm run lint` et `npm test` verts avant commit.

## File Map

| Fichier | Responsabilité |
|---|---|
| `src/app/globals.css` | Tokens de couleur clair/sombre, thème Tailwind, animation `float` |
| `src/app/layout.tsx` | Police, ThemeProvider, métadonnées SEO/OG |
| `src/app/page.tsx` | Assemble les sections |
| `src/app/opengraph-image.tsx` | Image d'aperçu de partage |
| `src/app/actions/waitlist.ts` | Server Action `joinWaitlist` (adaptateur Supabase) |
| `src/app/cgu/page.tsx`, `src/app/confidentialite/page.tsx` | Pages légales |
| `src/lib/site.ts` | Contenus statiques : pays, profils, plans, FAQ, moyens de paiement |
| `src/lib/validation.ts` | Schéma zod + `parseWaitlist` |
| `src/lib/waitlist.ts` | `submitWaitlist` (logique métier pure) + types d'état |
| `src/lib/whatsapp.ts` | Construction des liens wa.me |
| `src/lib/supabase.ts` | Client Supabase serveur |
| `src/lib/cn.ts` | Concaténation de classes |
| `src/components/ui/*` | Container, SectionHeading, button, Logo, ThemeProvider, ThemeToggle, PaymentBadges |
| `src/components/landing/*` | Une section par fichier + `WaitlistForm` |
| `src/components/legal/LegalPage.tsx` | Gabarit des pages légales |
| `supabase/migrations/001_waitlist.sql` | Table `waitlist` |

---

### Task 1: Scaffold Next.js, tokens de design et outillage de test

**Files:**
- Create (via CLI): projet Next.js à la racine
- Replace: `src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx`
- Create: `src/lib/cn.ts`, `src/components/ui/ThemeProvider.tsx`, `vitest.config.ts`, `src/lib/cn.test.ts`
- Modify: `package.json` (script `test`)
- Delete: `public/*.svg` générés par le template

**Interfaces:**
- Produces: `cn(...classes: (string | false | null | undefined)[]): string` ; `ThemeProvider({ children })` ; classes Tailwind `bg-background text-foreground bg-card border-border text-muted bg-primary text-primary bg-primary-light text-primary-light bg-accent text-accent bg-hero font-sans` ; classe `animate-float`.

- [ ] **Step 1: Générer le projet**

Le dossier contient déjà `docs/` (autorisé par create-next-app).

```bash
cd "D:/LE BUREAU/factoocosen"
npx create-next-app@15 . --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes
```
Expected: « Success! Created factoocosen ». Un dépôt git est initialisé avec un commit initial.

- [ ] **Step 2: Installer les dépendances**

```bash
npm i @supabase/supabase-js zod@3 next-themes lucide-react server-only
npm i -D vitest
```

- [ ] **Step 3: Ajouter le script de test dans `package.json`**

Dans `"scripts"`, ajouter :
```json
"test": "vitest run"
```

- [ ] **Step 4: Créer `vitest.config.ts`**

```ts
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 5: Écrire le test qui échoue `src/lib/cn.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { cn } from "@/lib/cn";

describe("cn", () => {
  it("joint les classes et ignore les valeurs vides", () => {
    expect(cn("a", false, null, undefined, "", "b")).toBe("a b");
  });
});
```

- [ ] **Step 6: Lancer le test pour vérifier l'échec**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "@/lib/cn"`.

- [ ] **Step 7: Implémenter `src/lib/cn.ts`**

```ts
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
```

- [ ] **Step 8: Relancer le test**

Run: `npm test`
Expected: PASS (1 test).

- [ ] **Step 9: Remplacer `src/app/globals.css`**

```css
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));

:root {
  --background: #f8fafc;
  --foreground: #0b1220;
  --muted: #475569;
  --card: #ffffff;
  --border: #e2e8f0;
  --primary: #0f766e;
  --primary-light: #14b8a6;
  --accent: #f59e0b;
  --hero: #04201d;
}

.dark {
  --background: #06110f;
  --foreground: #e6f2f0;
  --muted: #94a3b8;
  --card: #0b1a18;
  --border: #1e2d2a;
  --primary: #14b8a6;
  --primary-light: #2dd4bf;
  --accent: #fbbf24;
  --hero: #020f0d;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-muted: var(--muted);
  --color-card: var(--card);
  --color-border: var(--border);
  --color-primary: var(--primary);
  --color-primary-light: var(--primary-light);
  --color-accent: var(--accent);
  --color-hero: var(--hero);
  --font-sans: var(--font-jakarta), ui-sans-serif, system-ui, sans-serif;
}

html {
  scroll-behavior: smooth;
}

section[id] {
  scroll-margin-top: 6rem;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}

.animate-float {
  animation: float 6s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }
  .animate-float {
    animation: none;
  }
}
```

- [ ] **Step 10: Créer `src/components/ui/ThemeProvider.tsx`**

```tsx
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  );
}
```

- [ ] **Step 11: Remplacer `src/app/layout.tsx`**

```tsx
import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ThemeProvider } from "@/components/ui/ThemeProvider";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const title = "Factoo — Facturez et faites-vous payer depuis WhatsApp";
const description =
  "Factoo permet aux freelances et PME d’Afrique de l’Ouest de créer une facture en 2 minutes et de se faire payer directement depuis WhatsApp, sans que le client ait besoin de compte.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title,
  description,
  openGraph: {
    title,
    description,
    siteName: "Factoo",
    locale: "fr_FR",
    type: "website",
  },
  twitter: { card: "summary_large_image", title, description },
};

export const viewport: Viewport = {
  themeColor: "#04201D",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${jakarta.variable} bg-background font-sans text-foreground antialiased`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 12: Remplacer `src/app/page.tsx` par un placeholder temporaire**

```tsx
export default function Home() {
  return (
    <main className="grid min-h-screen place-items-center bg-hero text-primary-light">
      <p className="text-3xl font-extrabold">Factoo</p>
    </main>
  );
}
```

- [ ] **Step 13: Supprimer les SVG du template**

```bash
rm -f public/file.svg public/globe.svg public/next.svg public/vercel.svg public/window.svg
```

- [ ] **Step 14: Vérifier lint, tests et build**

Run: `npm run lint && npm test && npm run build`
Expected: aucun erreur ; build « Compiled successfully ».

- [ ] **Step 15: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js avec tokens Factoo, thème et Vitest"
```

---

### Task 2: Contenus statiques, validation et liens WhatsApp

**Files:**
- Create: `src/lib/site.ts`, `src/lib/validation.ts`, `src/lib/whatsapp.ts`
- Test: `src/lib/validation.test.ts`, `src/lib/whatsapp.test.ts`

**Interfaces:**
- Consumes: rien.
- Produces:
  - `COUNTRY_CODES` (tuple `'SN'|'CI'|'ML'|'BF'|'BJ'|'TG'|'NE'|'CM'|'OTHER'`), `type CountryCode`, `COUNTRIES: { code: CountryCode; name: string; dial: string }[]`
  - `PROFILE_VALUES` (tuple `'freelance'|'pme'|'ecommerce'`), `type ProfileValue`, `PROFILES: { value: ProfileValue; label: string }[]`
  - `PLANS: Plan[]`, `FAQ: { question: string; answer: string }[]`, `PAYMENT_METHODS: { name: string; color: string }[]`
  - `type WaitlistField = 'countryCode'|'phone'|'country'|'profile'|'email'`
  - `type WaitlistRow = { phone: string; email: string | null; country: CountryCode; profile: ProfileValue }`
  - `parseWaitlist(raw: Record<string, unknown>): { success: true; data: WaitlistRow } | { success: false; fieldErrors: Partial<Record<WaitlistField, string>> }`
  - `whatsappLink(number: string | undefined, message?: string): string | null`, `siteWhatsappLink(): string | null`, `WHATSAPP_DEFAULT_MESSAGE`

- [ ] **Step 1: Créer `src/lib/site.ts`**

```ts
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

export const PAYMENT_METHODS: { name: string; color: string }[] = [
  { name: "Wave", color: "#1DC3F0" },
  { name: "Orange Money", color: "#FF7900" },
  { name: "Visa", color: "#1A1F71" },
  { name: "Mastercard", color: "#EB001B" },
];
```

- [ ] **Step 2: Écrire le test qui échoue `src/lib/validation.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { parseWaitlist } from "@/lib/validation";

const valid = { countryCode: "221", phone: "77 123 45 67", country: "SN", profile: "freelance", email: "" };

describe("parseWaitlist", () => {
  it("accepte un numéro sénégalais et le normalise en E.164", () => {
    const r = parseWaitlist(valid);
    expect(r).toEqual({
      success: true,
      data: { phone: "+221771234567", email: null, country: "SN", profile: "freelance" },
    });
  });

  it("garde le 0 initial des numéros ivoiriens à 10 chiffres", () => {
    const r = parseWaitlist({ ...valid, countryCode: "+225", phone: "07-01-02-03-04", country: "CI" });
    expect(r.success && r.data.phone).toBe("+2250701020304");
  });

  it("refuse un numéro trop court", () => {
    const r = parseWaitlist({ ...valid, phone: "12345" });
    expect(r).toEqual({ success: false, fieldErrors: { phone: "Numéro invalide : 8 à 10 chiffres" } });
  });

  it("refuse un numéro avec des lettres", () => {
    const r = parseWaitlist({ ...valid, phone: "77abc4567" });
    expect(r.success).toBe(false);
    expect(!r.success && r.fieldErrors.phone).toBeTruthy();
  });

  it("refuse un numéro absent (null venant de FormData)", () => {
    const r = parseWaitlist({ ...valid, phone: null });
    expect(!r.success && r.fieldErrors.phone).toBe("Numéro invalide : 8 à 10 chiffres");
  });

  it("refuse un indicatif vide", () => {
    const r = parseWaitlist({ ...valid, countryCode: "" });
    expect(!r.success && r.fieldErrors.countryCode).toBe("Indicatif invalide");
  });

  it("garde un email valide en minuscules sans espaces", () => {
    const r = parseWaitlist({ ...valid, email: "  awa@exemple.sn " });
    expect(r.success && r.data.email).toBe("awa@exemple.sn");
  });

  it("refuse un email invalide", () => {
    const r = parseWaitlist({ ...valid, email: "pas-un-email" });
    expect(!r.success && r.fieldErrors.email).toBe("Email invalide");
  });

  it("refuse un pays hors liste", () => {
    const r = parseWaitlist({ ...valid, country: "FR" });
    expect(!r.success && r.fieldErrors.country).toBe("Choisissez un pays");
  });

  it("refuse un profil hors liste", () => {
    const r = parseWaitlist({ ...valid, profile: "banque" });
    expect(!r.success && r.fieldErrors.profile).toBe("Choisissez un profil");
  });
});
```

- [ ] **Step 3: Lancer le test pour vérifier l'échec**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "@/lib/validation"`.

- [ ] **Step 4: Implémenter `src/lib/validation.ts`**

```ts
import { z } from "zod";
import { COUNTRY_CODES, PROFILE_VALUES, type CountryCode, type ProfileValue } from "@/lib/site";

export type WaitlistField = "countryCode" | "phone" | "country" | "profile" | "email";

export type WaitlistRow = {
  phone: string;
  email: string | null;
  country: CountryCode;
  profile: ProfileValue;
};

export type ParseResult =
  | { success: true; data: WaitlistRow }
  | { success: false; fieldErrors: Partial<Record<WaitlistField, string>> };

const digitsOnly = (v: unknown) => (typeof v === "string" ? v.replace(/[\s.\-+()]/g, "") : "");
const blankToUndefined = (v: unknown) =>
  v === null || (typeof v === "string" && v.trim() === "") ? undefined : v;

const waitlistSchema = z.object({
  countryCode: z.preprocess(digitsOnly, z.string().regex(/^\d{1,4}$/, "Indicatif invalide")),
  phone: z.preprocess(digitsOnly, z.string().regex(/^\d{8,10}$/, "Numéro invalide : 8 à 10 chiffres")),
  country: z.enum(COUNTRY_CODES, { errorMap: () => ({ message: "Choisissez un pays" }) }),
  profile: z.enum(PROFILE_VALUES, { errorMap: () => ({ message: "Choisissez un profil" }) }),
  email: z.preprocess(
    blankToUndefined,
    z.string().trim().toLowerCase().email("Email invalide").optional(),
  ),
});

export function parseWaitlist(raw: Record<string, unknown>): ParseResult {
  const result = waitlistSchema.safeParse(raw);
  if (!result.success) {
    const fieldErrors: Partial<Record<WaitlistField, string>> = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0] as WaitlistField | undefined;
      if (field && !fieldErrors[field]) fieldErrors[field] = issue.message;
    }
    return { success: false, fieldErrors };
  }
  const { countryCode, phone, country, profile, email } = result.data;
  return {
    success: true,
    data: { phone: `+${countryCode}${phone}`, email: email ?? null, country, profile },
  };
}
```

Note : `trim()` et `toLowerCase()` s'appliquent avant `email()` en zod 3 (transformations de string en ligne), ce qui permet d'accepter `"  awa@exemple.sn "`.

- [ ] **Step 5: Relancer les tests**

Run: `npm test`
Expected: PASS (validation : 10 tests).

- [ ] **Step 6: Écrire le test qui échoue `src/lib/whatsapp.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { WHATSAPP_DEFAULT_MESSAGE, whatsappLink } from "@/lib/whatsapp";

describe("whatsappLink", () => {
  it("construit un lien wa.me avec le message encodé", () => {
    expect(whatsappLink("221770000000", "Bonjour Factoo")).toBe(
      "https://wa.me/221770000000?text=Bonjour%20Factoo",
    );
  });

  it("nettoie le + et les espaces du numéro", () => {
    expect(whatsappLink("+221 77 000 00 00")).toBe(
      `https://wa.me/221770000000?text=${encodeURIComponent(WHATSAPP_DEFAULT_MESSAGE)}`,
    );
  });

  it("retourne null si aucun numéro n'est configuré", () => {
    expect(whatsappLink(undefined)).toBeNull();
    expect(whatsappLink("")).toBeNull();
  });
});
```

- [ ] **Step 7: Lancer le test pour vérifier l'échec**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "@/lib/whatsapp"`.

- [ ] **Step 8: Implémenter `src/lib/whatsapp.ts`**

```ts
export const WHATSAPP_DEFAULT_MESSAGE = "Bonjour, je suis intéressé(e) par Factoo.";

export function whatsappLink(number: string | undefined, message: string = WHATSAPP_DEFAULT_MESSAGE): string | null {
  const digits = (number ?? "").replace(/\D/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function siteWhatsappLink(): string | null {
  return whatsappLink(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER);
}
```

- [ ] **Step 9: Relancer lint et tests**

Run: `npm run lint && npm test`
Expected: PASS (14 tests au total).

- [ ] **Step 10: Commit**

```bash
git add src/lib
git commit -m "feat: contenus statiques, validation liste d'attente et liens WhatsApp"
```

---

### Task 3: Table Supabase et Server Action `joinWaitlist`

**Files:**
- Create: `supabase/migrations/001_waitlist.sql`, `src/lib/waitlist.ts`, `src/lib/supabase.ts`, `src/app/actions/waitlist.ts`
- Test: `src/lib/waitlist.test.ts`

**Interfaces:**
- Consumes: `parseWaitlist`, `WaitlistRow`, `WaitlistField` (Task 2).
- Produces:
  - `type WaitlistState = { status: 'idle' } | { status: 'success'; already: boolean } | { status: 'invalid'; fieldErrors: Partial<Record<WaitlistField, string>> } | { status: 'error' }`
  - `type InsertWaitlist = (row: WaitlistRow) => Promise<{ error: { code?: string; message: string } | null }>`
  - `submitWaitlist(formData: FormData, insert: InsertWaitlist): Promise<WaitlistState>`
  - Server Action `joinWaitlist(prev: WaitlistState, formData: FormData): Promise<WaitlistState>` (signature compatible `useActionState`)
  - Noms des champs du formulaire : `countryCode`, `phone`, `country`, `profile`, `email`, `website` (honeypot)

- [ ] **Step 1: Créer `supabase/migrations/001_waitlist.sql`**

```sql
create table if not exists public.waitlist (
  id          uuid primary key default gen_random_uuid(),
  phone       text not null unique,
  email       text,
  country     text not null check (country in ('SN','CI','ML','BF','BJ','TG','NE','CM','OTHER')),
  profile     text not null check (profile in ('freelance','pme','ecommerce')),
  created_at  timestamptz not null default now()
);

alter table public.waitlist enable row level security;
-- Aucune policy : seul le service_role (Server Action) peut lire et écrire.
```

- [ ] **Step 2: Écrire le test qui échoue `src/lib/waitlist.test.ts`**

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { submitWaitlist, type InsertWaitlist } from "@/lib/waitlist";

function form(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData();
  const values = {
    countryCode: "221",
    phone: "771234567",
    country: "SN",
    profile: "pme",
    email: "",
    website: "",
    ...overrides,
  };
  for (const [k, v] of Object.entries(values)) fd.set(k, v);
  return fd;
}

const ok: InsertWaitlist = async () => ({ error: null });

afterEach(() => vi.restoreAllMocks());

describe("submitWaitlist", () => {
  it("insère une inscription valide", async () => {
    const insert = vi.fn(ok);
    const state = await submitWaitlist(form(), insert);
    expect(state).toEqual({ status: "success", already: false });
    expect(insert).toHaveBeenCalledWith({ phone: "+221771234567", email: null, country: "SN", profile: "pme" });
  });

  it("ignore silencieusement les bots (honeypot rempli)", async () => {
    const insert = vi.fn(ok);
    const state = await submitWaitlist(form({ website: "http://spam.example" }), insert);
    expect(state).toEqual({ status: "success", already: false });
    expect(insert).not.toHaveBeenCalled();
  });

  it("retourne les erreurs de champ sans insérer", async () => {
    const insert = vi.fn(ok);
    const state = await submitWaitlist(form({ phone: "12" }), insert);
    expect(state).toEqual({ status: "invalid", fieldErrors: { phone: "Numéro invalide : 8 à 10 chiffres" } });
    expect(insert).not.toHaveBeenCalled();
  });

  it("traite un doublon (23505) comme déjà inscrit", async () => {
    const insert: InsertWaitlist = async () => ({ error: { code: "23505", message: "duplicate key" } });
    expect(await submitWaitlist(form(), insert)).toEqual({ status: "success", already: true });
  });

  it("retourne une erreur serveur et la logue", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const insert: InsertWaitlist = async () => ({ error: { code: "XX000", message: "boom" } });
    expect(await submitWaitlist(form(), insert)).toEqual({ status: "error" });
    expect(log).toHaveBeenCalled();
  });

  it("retourne une erreur serveur si l'insertion lève une exception", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const insert: InsertWaitlist = async () => {
      throw new Error("Supabase env missing");
    };
    expect(await submitWaitlist(form(), insert)).toEqual({ status: "error" });
  });
});
```

- [ ] **Step 3: Lancer le test pour vérifier l'échec**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "@/lib/waitlist"`.

- [ ] **Step 4: Implémenter `src/lib/waitlist.ts`**

```ts
import { parseWaitlist, type WaitlistField, type WaitlistRow } from "@/lib/validation";

export type WaitlistState =
  | { status: "idle" }
  | { status: "success"; already: boolean }
  | { status: "invalid"; fieldErrors: Partial<Record<WaitlistField, string>> }
  | { status: "error" };

export type InsertWaitlist = (
  row: WaitlistRow,
) => Promise<{ error: { code?: string; message: string } | null }>;

const FIELDS: WaitlistField[] = ["countryCode", "phone", "country", "profile", "email"];
const UNIQUE_VIOLATION = "23505";

export async function submitWaitlist(formData: FormData, insert: InsertWaitlist): Promise<WaitlistState> {
  const honeypot = formData.get("website");
  if (typeof honeypot === "string" && honeypot.trim() !== "") {
    return { status: "success", already: false };
  }

  const raw = Object.fromEntries(FIELDS.map((field) => [field, formData.get(field)]));
  const parsed = parseWaitlist(raw);
  if (!parsed.success) return { status: "invalid", fieldErrors: parsed.fieldErrors };

  try {
    const { error } = await insert(parsed.data);
    if (!error) return { status: "success", already: false };
    if (error.code === UNIQUE_VIOLATION) return { status: "success", already: true };
    console.error("[waitlist] insertion refusée :", error.message);
  } catch (err) {
    console.error("[waitlist] insertion impossible :", err);
  }
  return { status: "error" };
}
```

- [ ] **Step 5: Relancer les tests**

Run: `npm test`
Expected: PASS (20 tests au total).

- [ ] **Step 6: Créer `src/lib/supabase.ts`**

```ts
import "server-only";
import { createClient } from "@supabase/supabase-js";

export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant");
  return createClient(url, key, { auth: { persistSession: false } });
}
```

- [ ] **Step 7: Créer `src/app/actions/waitlist.ts`**

```ts
"use server";

import { getSupabaseAdmin } from "@/lib/supabase";
import { submitWaitlist, type WaitlistState } from "@/lib/waitlist";

export async function joinWaitlist(_prev: WaitlistState, formData: FormData): Promise<WaitlistState> {
  return submitWaitlist(formData, async (row) => {
    const { error } = await getSupabaseAdmin().from("waitlist").insert(row);
    return { error };
  });
}
```

- [ ] **Step 8: Vérifier lint, tests et build**

Run: `npm run lint && npm test && npm run build`
Expected: tout vert.

- [ ] **Step 9: Commit**

```bash
git add supabase src/lib src/app/actions
git commit -m "feat: table waitlist et Server Action joinWaitlist"
```

---

### Task 4: Composants UI de base, navbar et hero

**Files:**
- Create: `src/components/ui/Container.tsx`, `src/components/ui/SectionHeading.tsx`, `src/components/ui/button.ts`, `src/components/ui/Logo.tsx`, `src/components/ui/ThemeToggle.tsx`, `src/components/ui/PaymentBadges.tsx`
- Create: `src/components/landing/Navbar.tsx`, `src/components/landing/Hero.tsx`, `src/components/landing/HeroVisual.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `cn` (Task 1), `siteWhatsappLink`, `PAYMENT_METHODS` (Task 2).
- Produces:
  - `Container({ children, className? })`
  - `SectionHeading({ eyebrow, title, subtitle?, align? : 'center' | 'left', light? })`
  - `buttonClass(variant?: 'dark' | 'primary' | 'light' | 'ghost' | 'outline', size?: 'sm' | 'md', extra?: string): string`
  - `Logo({ light?, className? })`, `ThemeToggle()`, `PaymentBadges({ className? })`
  - `Navbar()`, `Hero()` ; ancres utilisées partout : `#top`, `#fonctionnalites`, `#comment`, `#tarifs`, `#faq`, `#waitlist`

- [ ] **Step 1: Créer `src/components/ui/Container.tsx`**

```tsx
import { cn } from "@/lib/cn";

export function Container({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6", className)}>{children}</div>;
}
```

- [ ] **Step 2: Créer `src/components/ui/SectionHeading.tsx`**

```tsx
import { cn } from "@/lib/cn";

type Props = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  align?: "center" | "left";
  light?: boolean;
};

export function SectionHeading({ eyebrow, title, subtitle, align = "center", light = false }: Props) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center")}>
      <p className={cn("text-sm font-bold uppercase tracking-widest", light ? "text-primary-light" : "text-primary")}>
        {eyebrow}
      </p>
      <h2
        className={cn(
          "mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl",
          light ? "text-white" : "text-foreground",
        )}
      >
        {title}
      </h2>
      {subtitle && <p className={cn("mt-4 text-lg", light ? "text-white/70" : "text-muted")}>{subtitle}</p>}
    </div>
  );
}
```

- [ ] **Step 3: Créer `src/components/ui/button.ts`**

```ts
import { cn } from "@/lib/cn";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-light disabled:cursor-not-allowed disabled:opacity-60";

const variants = {
  dark: "bg-foreground text-background hover:opacity-90",
  primary: "bg-primary text-white hover:opacity-90",
  light: "bg-white text-hero hover:bg-white/90",
  ghost: "border border-white/20 text-white hover:bg-white/10",
  outline: "border border-border text-foreground hover:bg-foreground/5",
} as const;

const sizes = {
  sm: "h-10 px-4 text-sm",
  md: "h-12 px-6 text-base",
} as const;

export function buttonClass(
  variant: keyof typeof variants = "primary",
  size: keyof typeof sizes = "md",
  extra?: string,
): string {
  return cn(base, variants[variant], sizes[size], extra);
}
```

- [ ] **Step 4: Créer `src/components/ui/Logo.tsx`**

```tsx
import { cn } from "@/lib/cn";

export function Logo({ light = false, className }: { light?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-xl font-extrabold tracking-tight",
        light ? "text-white" : "text-foreground",
        className,
      )}
    >
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden="true">
        <rect width="32" height="32" rx="9" fill="#0F766E" />
        <path d="M11 7h7l5 5v13H11z" fill="#FFFFFF" />
        <path d="M18 7v5h5" fill="#CCFBF1" />
        <path d="M14 18.5l2.5 2.5 4.5-4.5" fill="none" stroke="#0F766E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Factoo
    </span>
  );
}
```

- [ ] **Step 5: Créer `src/components/ui/ThemeToggle.tsx`**

```tsx
"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-foreground transition hover:bg-foreground/5"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
```

- [ ] **Step 6: Créer `src/components/ui/PaymentBadges.tsx`**

```tsx
import { cn } from "@/lib/cn";
import { PAYMENT_METHODS } from "@/lib/site";

export function PaymentBadges({ className }: { className?: string }) {
  return (
    <ul className={cn("flex flex-wrap gap-2", className)} aria-label="Moyens de paiement acceptés">
      {PAYMENT_METHODS.map((method) => (
        <li
          key={method.name}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-semibold text-foreground"
        >
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: method.color }} aria-hidden="true" />
          {method.name}
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 7: Créer `src/components/landing/Navbar.tsx`**

```tsx
"use client";

import { Menu, X } from "lucide-react";
import { useState } from "react";
import { buttonClass } from "@/components/ui/button";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const LINKS = [
  { href: "#fonctionnalites", label: "Fonctionnalités" },
  { href: "#comment", label: "Comment ça marche" },
  { href: "#tarifs", label: "Tarifs" },
  { href: "#faq", label: "FAQ" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-3">
      <nav
        aria-label="Navigation principale"
        className="mx-auto max-w-6xl rounded-3xl border border-border bg-card/85 px-4 py-2 shadow-lg backdrop-blur-md"
      >
        <div className="flex items-center justify-between gap-4">
          <a href="#top" aria-label="Factoo — retour en haut">
            <Logo />
          </a>
          <ul className="hidden items-center gap-6 lg:flex">
            {LINKS.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="text-sm font-medium text-muted transition hover:text-foreground">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <a href="#waitlist" className={buttonClass("dark", "sm", "hidden sm:inline-flex")}>
              Rejoindre la liste d’attente
            </a>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="menu-mobile"
              aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-foreground lg:hidden"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {open && (
          <div id="menu-mobile" className="border-t border-border pb-2 pt-3 lg:hidden">
            <ul className="grid gap-1">
              {LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    onClick={close}
                    className="block rounded-xl px-3 py-2.5 font-medium text-foreground hover:bg-foreground/5"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
            <a href="#waitlist" onClick={close} className={buttonClass("dark", "md", "mt-2 w-full")}>
              Rejoindre la liste d’attente
            </a>
          </div>
        )}
      </nav>
    </header>
  );
}
```

- [ ] **Step 8: Créer `src/components/landing/HeroVisual.tsx`**

Maquette décorative en HTML/CSS (couleurs fixes volontaires, `aria-hidden`).

```tsx
import { BellRing, CheckCircle2 } from "lucide-react";

export function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-sm px-4 py-8 sm:px-8 lg:max-w-md" aria-hidden="true">
      <div className="rounded-3xl bg-white p-6 text-slate-900 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Facture</p>
            <p className="text-lg font-extrabold">FAC-2026-0042</p>
          </div>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">En attente</span>
        </div>
        <p className="mt-4 text-sm text-slate-500">
          Client : <span className="font-semibold text-slate-800">Agence Teranga</span>
        </p>
        <ul className="mt-4 space-y-2 border-y border-slate-100 py-4 text-sm">
          <li className="flex justify-between gap-4">
            <span>Identité visuelle × 1</span>
            <span className="font-semibold">120 000</span>
          </li>
          <li className="flex justify-between gap-4">
            <span>Visuels réseaux sociaux × 2</span>
            <span className="font-semibold">30 000</span>
          </li>
        </ul>
        <div className="mt-4 flex items-baseline justify-between">
          <span className="text-sm font-semibold text-slate-500">Total TTC</span>
          <span className="text-2xl font-extrabold text-[#0F766E]">150 000 FCFA</span>
        </div>
        <div className="mt-5 rounded-full bg-[#0F766E] py-3 text-center font-bold text-white">Payer maintenant</div>
        <p className="mt-3 text-center text-xs text-slate-500">Wave · Orange Money · Carte</p>
      </div>

      <div className="animate-float absolute -top-1 right-0 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-slate-900 shadow-xl">
        <CheckCircle2 className="h-8 w-8 text-[#0F766E]" />
        <div>
          <p className="text-sm font-bold">Payée via Wave</p>
          <p className="text-xs text-slate-500">150 000 FCFA · à l’instant</p>
        </div>
      </div>

      <div className="animate-float absolute -bottom-2 left-0 max-w-[240px] rounded-2xl bg-[#DCF8C6] px-4 py-3 text-slate-900 shadow-xl [animation-delay:1.5s]">
        <p className="flex items-center gap-2 text-xs font-bold text-[#075E54]">
          <BellRing className="h-4 w-4" /> Relance J+3 envoyée
        </p>
        <p className="mt-1 text-xs">Bonjour, petit rappel pour la facture FAC-2026-0042…</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 9: Créer `src/components/landing/Hero.tsx`**

```tsx
import { ArrowRight, MessageCircle, Zap } from "lucide-react";
import { HeroVisual } from "@/components/landing/HeroVisual";
import { buttonClass } from "@/components/ui/button";
import { Container } from "@/components/ui/Container";
import { siteWhatsappLink } from "@/lib/whatsapp";

export function Hero() {
  const whatsapp = siteWhatsappLink();

  return (
    <section id="top" className="relative overflow-hidden bg-hero pb-20 pt-32 text-white sm:pt-40">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(20,184,166,0.35),transparent_60%)]"
      />
      <Container className="relative grid items-center gap-12 lg:grid-cols-2">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm font-medium">
            <Zap className="h-4 w-4 text-accent" aria-hidden="true" />
            Bientôt disponible · Sénégal, Côte d’Ivoire, Mali…
          </p>
          <h1 className="mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
            Facturez en 2 minutes. <span className="text-primary-light">Faites-vous payer depuis WhatsApp.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-white/75">
            Créez une facture conforme, envoyez un lien de paiement par WhatsApp, et votre client paie en 3 taps —
            Wave, Orange Money ou carte. Sans compte.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href="#waitlist" className={buttonClass("light")}>
              Rejoindre la liste d’attente <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
            {whatsapp && (
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={buttonClass("ghost")}>
                <MessageCircle className="h-4 w-4" aria-hidden="true" /> Discuter sur WhatsApp
              </a>
            )}
          </div>
        </div>
        <HeroVisual />
      </Container>
    </section>
  );
}
```

- [ ] **Step 10: Mettre à jour `src/app/page.tsx`**

```tsx
import { Hero } from "@/components/landing/Hero";
import { Navbar } from "@/components/landing/Navbar";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
      </main>
    </>
  );
}
```

- [ ] **Step 11: Vérifier**

Run: `npm run lint && npm test && npm run build`
Expected: tout vert.

Puis `npm run dev` et ouvrir http://localhost:3000 : navbar pilule, hero sombre avec la carte facture et les deux bulles flottantes ; à 375 px de large, menu burger fonctionnel et aucun scroll horizontal ; le toggle bascule clair/sombre.

- [ ] **Step 12: Commit**

```bash
git add src
git commit -m "feat: composants UI, navbar et hero de la landing"
```

---

### Task 5: Sections Stats, Problème/solution, Fonctionnalités, Comment ça marche

**Files:**
- Create: `src/components/landing/Stats.tsx`, `src/components/landing/ProblemSolution.tsx`, `src/components/landing/Features.tsx`, `src/components/landing/HowItWorks.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `Container`, `SectionHeading` (Task 4).
- Produces: `Stats()`, `ProblemSolution()`, `Features()` (section `id="fonctionnalites"`), `HowItWorks()` (section `id="comment"`).

- [ ] **Step 1: Créer `src/components/landing/Stats.tsx`**

```tsx
import { Container } from "@/components/ui/Container";

const STATS = [
  { value: "2 min", label: "pour créer une facture" },
  { value: "3 taps", label: "pour que votre client paie" },
  { value: "0 FCFA", label: "pour commencer" },
  { value: "J+3 · J+7 · J+14", label: "relances automatiques" },
];

export function Stats() {
  return (
    <section aria-label="Factoo en chiffres" className="py-12">
      <Container>
        <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-border bg-card p-5">
              <dt className="sr-only">{stat.label}</dt>
              <dd className="text-xl font-extrabold text-primary sm:text-3xl">{stat.value}</dd>
              <dd className="mt-1 text-sm text-muted">{stat.label}</dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}
```

- [ ] **Step 2: Créer `src/components/landing/ProblemSolution.tsx`**

```tsx
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

const ITEMS = [
  {
    pain: "« Mon client met 3 semaines à me payer »",
    fix: "Votre facture contient un lien de paiement. Votre client paie en 3 taps depuis WhatsApp.",
  },
  {
    pain: "« Je perds du temps à relancer mes clients »",
    fix: "Factoo relance automatiquement par WhatsApp à J+3, J+7 et J+14. Vous n’êtes plus recouvreur.",
  },
  {
    pain: "« Je fais mes factures sur Word, ce n’est pas conforme »",
    fix: "Des PDF conformes SYSCOHADA : numérotation séquentielle, TVA et mentions légales obligatoires.",
  },
];

export function ProblemSolution() {
  return (
    <section className="py-20">
      <Container>
        <SectionHeading eyebrow="Le problème" title="Se faire payer ne devrait pas être un second métier" />
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {ITEMS.map((item) => (
            <div key={item.pain} className="rounded-2xl border border-border bg-card p-6">
              <p className="font-bold text-foreground">{item.pain}</p>
              <div className="my-4 h-px bg-border" />
              <p className="flex gap-2 text-muted">
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                {item.fix}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
```

- [ ] **Step 3: Créer `src/components/landing/Features.tsx`**

Grille bento : grande carte 2×2 à gauche, puis 5 petites cartes.

```tsx
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
```

- [ ] **Step 4: Créer `src/components/landing/HowItWorks.tsx`**

```tsx
import { FilePlus2, Send, Wallet } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

const STEPS = [
  { icon: FilePlus2, title: "Créez la facture", text: "Choisissez le client, ajoutez vos prestations : la facture est prête en 2 minutes." },
  { icon: Send, title: "Envoyez-la sur WhatsApp", text: "Un clic ouvre WhatsApp avec le lien de paiement et le résumé de la facture." },
  { icon: Wallet, title: "Encaissez", text: "Votre client paie en 3 taps. La facture passe en « Payée » et vous êtes notifié." },
];

export function HowItWorks() {
  return (
    <section id="comment" className="py-20">
      <Container>
        <SectionHeading eyebrow="Comment ça marche" title="De la facture au paiement en 3 étapes" />
        <ol className="mt-12 grid gap-8 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, text }, index) => (
            <li key={title} className="text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <p className="mt-4 text-sm font-bold text-primary">Étape {index + 1}</p>
              <h3 className="mt-1 text-lg font-bold text-foreground">{title}</h3>
              <p className="mx-auto mt-2 max-w-xs text-muted">{text}</p>
            </li>
          ))}
        </ol>
        <p className="mt-10 text-center font-semibold text-foreground">Factoo ne détient jamais vos fonds.</p>
      </Container>
    </section>
  );
}
```

- [ ] **Step 5: Mettre à jour `src/app/page.tsx`**

```tsx
import { Features } from "@/components/landing/Features";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Navbar } from "@/components/landing/Navbar";
import { ProblemSolution } from "@/components/landing/ProblemSolution";
import { Stats } from "@/components/landing/Stats";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Stats />
        <ProblemSolution />
        <Features />
        <HowItWorks />
      </main>
    </>
  );
}
```

- [ ] **Step 6: Vérifier**

Run: `npm run lint && npm test && npm run build`
Expected: tout vert. Contrôle visuel à 375 px et 1440 px, en clair et en sombre : grande carte « Lien de paiement » en 2×2 sur desktop, empilée sur mobile ; liens de la navbar « Fonctionnalités » et « Comment ça marche » scrollent vers leur section sans être masqués par la navbar.

- [ ] **Step 7: Commit**

```bash
git add src
git commit -m "feat: sections stats, problème, fonctionnalités et étapes"
```

---

### Task 6: Sections Tarifs, Confiance et FAQ

**Files:**
- Create: `src/components/landing/Pricing.tsx`, `src/components/landing/Trust.tsx`, `src/components/landing/Faq.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `PLANS`, `FAQ` (Task 2) ; `Container`, `SectionHeading`, `buttonClass`, `PaymentBadges` (Task 4).
- Produces: `Pricing()` (section `id="tarifs"`), `Trust()`, `Faq()` (section `id="faq"`).

- [ ] **Step 1: Créer `src/components/landing/Pricing.tsx`**

```tsx
import { Check, Gift } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { cn } from "@/lib/cn";
import { PLANS } from "@/lib/site";

export function Pricing() {
  return (
    <section id="tarifs" className="py-20">
      <Container>
        <SectionHeading
          eyebrow="Tarifs"
          title="Commencez gratuitement, passez Pro quand vous êtes prêt"
          subtitle="2 fois moins cher que les outils existants. Payable par Wave, Orange Money ou carte."
        />
        <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={cn(
                "relative flex flex-col rounded-3xl border p-8",
                plan.highlight ? "border-primary bg-card shadow-xl ring-2 ring-primary" : "border-border bg-card",
              )}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-8 rounded-full bg-accent px-3 py-1 text-xs font-bold text-slate-900">
                  Le plus choisi
                </span>
              )}
              <h3 className="text-xl font-extrabold text-foreground">{plan.name}</h3>
              <p className="mt-4 flex flex-wrap items-baseline gap-x-2">
                {plan.oldPrice && (
                  <span className="text-lg text-muted line-through">
                    <span className="sr-only">Au lieu de </span>
                    {plan.oldPrice}
                  </span>
                )}
                <span className="text-4xl font-extrabold text-foreground">{plan.price}</span>
                <span className="text-muted">{plan.period}</span>
              </p>
              {plan.yearly && (
                <p className="mt-1 text-sm text-muted">
                  ou <span className="line-through">{plan.yearly.oldPrice}</span>{" "}
                  <span className="font-bold text-foreground">{plan.yearly.price}</span> par an
                </p>
              )}
              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-3 text-foreground">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>
              <a
                href="#waitlist"
                className={buttonClass(plan.highlight ? "primary" : "outline", "md", "mt-8 w-full")}
              >
                Rejoindre la liste d’attente
              </a>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-8 flex max-w-2xl items-center justify-center gap-3 rounded-2xl border border-accent/40 bg-accent/10 p-4 text-center font-semibold text-foreground">
          <Gift className="h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
          Tarif de lancement garanti aux inscrits de la liste d’attente.
        </p>
      </Container>
    </section>
  );
}
```

- [ ] **Step 2: Créer `src/components/landing/Trust.tsx`**

```tsx
import { Sparkles } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { PaymentBadges } from "@/components/ui/PaymentBadges";

export function Trust() {
  return (
    <section aria-label="Moyens de paiement et premiers utilisateurs" className="py-16">
      <Container className="grid items-center gap-8 rounded-3xl border border-border bg-card p-8 md:grid-cols-2">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-primary">Moyens de paiement</p>
          <p className="mt-2 text-lg font-bold text-foreground">Vos clients paient avec ce qu’ils utilisent déjà.</p>
          <PaymentBadges className="mt-4" />
        </div>
        <div className="flex gap-4 rounded-2xl bg-primary/10 p-6">
          <Sparkles className="h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
          <p className="text-foreground">
            <span className="font-bold">Rejoignez les premiers freelances et PME qui testent Factoo.</span> Vos retours
            construisent le produit : on vous écrit personnellement sur WhatsApp.
          </p>
        </div>
      </Container>
    </section>
  );
}
```

- [ ] **Step 3: Créer `src/components/landing/Faq.tsx`**

Accordéon natif `<details>` : fonctionne sans JavaScript.

```tsx
import { Plus } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { FAQ } from "@/lib/site";

export function Faq() {
  return (
    <section id="faq" className="py-20">
      <Container className="max-w-3xl">
        <SectionHeading eyebrow="FAQ" title="Vos questions" />
        <div className="mt-10 space-y-3">
          {FAQ.map((item) => (
            <details key={item.question} className="group rounded-2xl border border-border bg-card p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-foreground [&::-webkit-details-marker]:hidden">
                {item.question}
                <Plus className="h-5 w-5 shrink-0 text-primary transition group-open:rotate-45" aria-hidden="true" />
              </summary>
              <p className="mt-3 text-muted">{item.answer}</p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}
```

- [ ] **Step 4: Mettre à jour `src/app/page.tsx`**

```tsx
import { Faq } from "@/components/landing/Faq";
import { Features } from "@/components/landing/Features";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Navbar } from "@/components/landing/Navbar";
import { Pricing } from "@/components/landing/Pricing";
import { ProblemSolution } from "@/components/landing/ProblemSolution";
import { Stats } from "@/components/landing/Stats";
import { Trust } from "@/components/landing/Trust";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Stats />
        <ProblemSolution />
        <Features />
        <HowItWorks />
        <Pricing />
        <Trust />
        <Faq />
      </main>
    </>
  );
}
```

- [ ] **Step 5: Vérifier**

Run: `npm run lint && npm test && npm run build`
Expected: tout vert. Contrôle visuel : carte Pro mise en avant avec prix barré 10 000 → 5 000 FCFA et 100 000 → 50 000 FCFA/an ; encart « Tarif de lancement garanti » ; FAQ qui s'ouvre au clic et au clavier (Tab + Entrée).

- [ ] **Step 6: Commit**

```bash
git add src
git commit -m "feat: sections tarifs, confiance et FAQ"
```

---

### Task 7: Formulaire de liste d'attente, CTA final et footer

**Files:**
- Create: `src/components/landing/WaitlistForm.tsx`, `src/components/landing/FinalCta.tsx`, `src/components/landing/Footer.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `joinWaitlist` (Task 3), `WaitlistState` (Task 3), `COUNTRIES`, `PROFILES` (Task 2), `siteWhatsappLink` (Task 2), `Container`, `buttonClass`, `Logo`, `PaymentBadges` (Task 4).
- Produces: `WaitlistForm()`, `FinalCta()` (section `id="waitlist"`), `Footer()`.

- [ ] **Step 1: Créer `src/components/landing/WaitlistForm.tsx`**

Tous les champs sont contrôlés : React 19 réinitialise les champs non contrôlés après une action de formulaire, ce qui effacerait la saisie en cas d'erreur de validation.

```tsx
"use client";

import { CheckCircle2 } from "lucide-react";
import { useActionState, useState } from "react";
import { joinWaitlist } from "@/app/actions/waitlist";
import { buttonClass } from "@/components/ui/button";
import { COUNTRIES, PROFILES } from "@/lib/site";
import type { WaitlistState } from "@/lib/waitlist";

const initialState: WaitlistState = { status: "idle" };

const inputClass =
  "h-12 w-full rounded-xl border border-white/20 bg-white px-4 text-slate-900 placeholder:text-slate-400 focus:outline-2 focus:outline-primary-light aria-[invalid=true]:border-amber-400";
const labelClass = "mb-1.5 block text-sm font-semibold text-white";
const errorClass = "mt-1.5 text-sm font-medium text-amber-200";

export function WaitlistForm() {
  const [state, formAction, pending] = useActionState(joinWaitlist, initialState);
  const [values, setValues] = useState({ country: "SN", countryCode: "221", phone: "", profile: "", email: "" });

  if (state.status === "success") {
    return (
      <div role="status" className="flex flex-col items-center gap-3 rounded-2xl bg-white/10 p-8 text-center">
        <CheckCircle2 className="h-12 w-12 text-primary-light" aria-hidden="true" />
        <p className="text-lg font-bold text-white">
          {state.already
            ? "Vous êtes déjà inscrit — on vous prévient au lancement."
            : "C’est noté ! On vous écrit sur WhatsApp au lancement."}
        </p>
      </div>
    );
  }

  const errors = state.status === "invalid" ? state.fieldErrors : {};
  const set = (field: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setValues((v) => ({ ...v, [field]: e.target.value }));

  const onCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const country = COUNTRIES.find((c) => c.code === e.target.value);
    setValues((v) => ({ ...v, country: e.target.value, countryCode: country?.dial || v.countryCode }));
  };

  return (
    <form action={formAction} noValidate className="grid gap-4">
      <div>
        <label htmlFor="wl-country" className={labelClass}>
          Pays
        </label>
        <select
          id="wl-country"
          name="country"
          value={values.country}
          onChange={onCountryChange}
          aria-invalid={Boolean(errors.country)}
          aria-describedby={errors.country ? "wl-country-error" : undefined}
          className={inputClass}
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
        {errors.country && <p id="wl-country-error" className={errorClass}>{errors.country}</p>}
      </div>

      <div>
        <label htmlFor="wl-phone" className={labelClass}>
          Numéro WhatsApp
        </label>
        <div className="flex gap-2">
          <div className="relative w-24 shrink-0">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">+</span>
            <input
              name="countryCode"
              aria-label="Indicatif pays"
              inputMode="numeric"
              value={values.countryCode}
              onChange={set("countryCode")}
              aria-invalid={Boolean(errors.countryCode)}
              aria-describedby={errors.countryCode ? "wl-code-error" : undefined}
              className={`${inputClass} pl-6`}
            />
          </div>
          <input
            id="wl-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="77 123 45 67"
            value={values.phone}
            onChange={set("phone")}
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? "wl-phone-error" : undefined}
            className={inputClass}
          />
        </div>
        {errors.countryCode && <p id="wl-code-error" className={errorClass}>{errors.countryCode}</p>}
        {errors.phone && <p id="wl-phone-error" className={errorClass}>{errors.phone}</p>}
      </div>

      <div>
        <label htmlFor="wl-profile" className={labelClass}>
          Vous êtes
        </label>
        <select
          id="wl-profile"
          name="profile"
          value={values.profile}
          onChange={set("profile")}
          aria-invalid={Boolean(errors.profile)}
          aria-describedby={errors.profile ? "wl-profile-error" : undefined}
          className={inputClass}
        >
          <option value="" disabled>
            Choisissez votre profil
          </option>
          {PROFILES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        {errors.profile && <p id="wl-profile-error" className={errorClass}>{errors.profile}</p>}
      </div>

      <div>
        <label htmlFor="wl-email" className={labelClass}>
          Email <span className="font-normal text-white/60">(facultatif)</span>
        </label>
        <input
          id="wl-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="vous@exemple.com"
          value={values.email}
          onChange={set("email")}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "wl-email-error" : undefined}
          className={inputClass}
        />
        {errors.email && <p id="wl-email-error" className={errorClass}>{errors.email}</p>}
      </div>

      <div className="hidden" aria-hidden="true">
        <label htmlFor="wl-website">Site web</label>
        <input id="wl-website" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

      <button type="submit" disabled={pending} className={buttonClass("light", "md", "mt-2 w-full")}>
        {pending ? "Inscription…" : "Je m’inscris"}
      </button>

      {state.status === "error" && (
        <p role="alert" className="rounded-xl bg-amber-400/15 p-3 text-sm font-medium text-amber-100">
          Un souci technique, réessayez dans un instant ou écrivez-nous sur WhatsApp.
        </p>
      )}
    </form>
  );
}
```

- [ ] **Step 2: Créer `src/components/landing/FinalCta.tsx`**

```tsx
import { Check, MessageCircle } from "lucide-react";
import { WaitlistForm } from "@/components/landing/WaitlistForm";
import { Container } from "@/components/ui/Container";
import { siteWhatsappLink } from "@/lib/whatsapp";

const PERKS = [
  "Prévenu en premier sur WhatsApp au lancement",
  "Tarif de lancement garanti",
  "Aucun engagement, désinscription sur simple message",
];

export function FinalCta() {
  const whatsapp = siteWhatsappLink();

  return (
    <section id="waitlist" className="py-20">
      <Container>
        <div className="relative grid gap-10 overflow-hidden rounded-3xl bg-hero p-6 text-white sm:p-10 lg:grid-cols-2 lg:p-14">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(20,184,166,0.3),transparent_60%)]"
          />
          <div className="relative">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Soyez parmi les premiers à facturer avec Factoo
            </h2>
            <p className="mt-4 text-lg text-white/75">
              Laissez votre numéro WhatsApp : on vous prévient dès l’ouverture, et on aimerait avoir votre avis avant.
            </p>
            <ul className="mt-6 space-y-3">
              {PERKS.map((perk) => (
                <li key={perk} className="flex gap-3">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary-light" aria-hidden="true" />
                  {perk}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative">
            <WaitlistForm />
            {whatsapp && (
              <p className="mt-6 text-center text-sm text-white/75">
                Une question ?{" "}
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-white underline underline-offset-4"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden="true" /> Discutons sur WhatsApp
                </a>
              </p>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}
```

- [ ] **Step 3: Créer `src/components/landing/Footer.tsx`**

```tsx
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Logo } from "@/components/ui/Logo";
import { PaymentBadges } from "@/components/ui/PaymentBadges";
import { siteWhatsappLink } from "@/lib/whatsapp";

const linkClass = "text-muted transition hover:text-foreground";
const headingClass = "text-xs font-bold uppercase tracking-widest text-muted";

export function Footer() {
  const whatsapp = siteWhatsappLink();

  return (
    <footer className="border-t border-border py-14">
      <Container>
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className={headingClass}>Produit</p>
            <ul className="mt-4 space-y-3">
              <li><Link href="/#fonctionnalites" className={linkClass}>Fonctionnalités</Link></li>
              <li><Link href="/#tarifs" className={linkClass}>Tarifs</Link></li>
              <li><Link href="/#faq" className={linkClass}>Questions fréquentes</Link></li>
            </ul>
          </div>
          <div>
            <p className={headingClass}>Entreprise</p>
            <ul className="mt-4 space-y-3">
              <li><Link href="/#top" className={linkClass}>À propos</Link></li>
              {whatsapp && (
                <li>
                  <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={linkClass}>
                    Contact WhatsApp
                  </a>
                </li>
              )}
            </ul>
          </div>
          <div>
            <p className={headingClass}>Légal</p>
            <ul className="mt-4 space-y-3">
              <li><Link href="/cgu" className={linkClass}>Conditions d’utilisation</Link></li>
              <li><Link href="/confidentialite" className={linkClass}>Confidentialité</Link></li>
            </ul>
          </div>
          <div>
            <p className={headingClass}>Moyens de paiement</p>
            <PaymentBadges className="mt-4" />
          </div>
        </div>
        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-border pt-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <Logo className="text-base" />
            <p className="text-sm text-muted">© 2026 Factoo — Facturez et faites-vous payer depuis WhatsApp.</p>
          </div>
          <Link href="/#top" className="text-sm font-semibold text-foreground">
            Retour en haut ↑
          </Link>
        </div>
      </Container>
    </footer>
  );
}
```

- [ ] **Step 4: Mettre à jour `src/app/page.tsx` (version finale)**

```tsx
import { Faq } from "@/components/landing/Faq";
import { Features } from "@/components/landing/Features";
import { FinalCta } from "@/components/landing/FinalCta";
import { Footer } from "@/components/landing/Footer";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Navbar } from "@/components/landing/Navbar";
import { Pricing } from "@/components/landing/Pricing";
import { ProblemSolution } from "@/components/landing/ProblemSolution";
import { Stats } from "@/components/landing/Stats";
import { Trust } from "@/components/landing/Trust";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Stats />
        <ProblemSolution />
        <Features />
        <HowItWorks />
        <Pricing />
        <Trust />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
```

- [ ] **Step 5: Vérifier lint, tests et build**

Run: `npm run lint && npm test && npm run build`
Expected: tout vert.

- [ ] **Step 6: Vérifier le formulaire sans Supabase configuré**

Run: `npm run dev`, ouvrir http://localhost:3000/#waitlist :
- Envoyer vide → erreurs « Numéro invalide : 8 à 10 chiffres » et « Choisissez un profil », saisie conservée.
- Choisir « Côte d’Ivoire » → l'indicatif passe à 225.
- Saisie valide (sans `.env.local`) → message « Un souci technique… » et log serveur `[waitlist] insertion impossible`.

- [ ] **Step 7: Commit**

```bash
git add src
git commit -m "feat: formulaire liste d'attente, CTA final et footer"
```

---

### Task 8: Pages légales, image de partage, README et vérification finale

**Files:**
- Create: `src/components/legal/LegalPage.tsx`, `src/app/cgu/page.tsx`, `src/app/confidentialite/page.tsx`, `src/app/opengraph-image.tsx`, `.env.example`
- Replace: `README.md`
- Modify: `.gitignore` (s'assurer que `.env*.local` est ignoré et `.env.example` versionné)

**Interfaces:**
- Consumes: `Container`, `Logo` (Task 4), `Footer` (Task 7).
- Produces: `LegalPage({ title, updatedAt, children })` ; routes `/cgu`, `/confidentialite`, `/opengraph-image`.

- [ ] **Step 1: Créer `src/components/legal/LegalPage.tsx`**

```tsx
import Link from "next/link";
import { Footer } from "@/components/landing/Footer";
import { Container } from "@/components/ui/Container";
import { Logo } from "@/components/ui/Logo";

type Props = { title: string; updatedAt: string; children: React.ReactNode };

export function LegalPage({ title, updatedAt, children }: Props) {
  return (
    <>
      <header className="border-b border-border py-4">
        <Container>
          <Link href="/" aria-label="Factoo — accueil">
            <Logo />
          </Link>
        </Container>
      </header>
      <main className="py-14">
        <Container className="max-w-3xl">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">{title}</h1>
          <p className="mt-2 text-sm text-muted">Dernière mise à jour : {updatedAt}</p>
          <div className="mt-8 space-y-6 text-foreground [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-bold [&_p]:text-muted [&_li]:text-muted [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6">
            {children}
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
```

- [ ] **Step 2: Créer `src/app/cgu/page.tsx`**

```tsx
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
        Ce site présente le service Factoo, en cours de développement, et permet de s’inscrire à une liste
        d’attente pour être informé de son lancement.
      </p>
      <h2>2. Inscription à la liste d’attente</h2>
      <p>
        L’inscription est gratuite et sans engagement. Elle ne crée aucun compte et ne donne pas accès au service.
        Vous pouvez demander votre retrait à tout moment par message WhatsApp ou email.
      </p>
      <h2>3. Tarifs annoncés</h2>
      <p>
        Les tarifs affichés sont ceux prévus au lancement. Le « tarif de lancement garanti » s’applique aux personnes
        inscrites sur la liste d’attente au moment de l’ouverture du service.
      </p>
      <h2>4. Responsabilité</h2>
      <p>
        Les informations du site sont fournies à titre indicatif et peuvent évoluer avant le lancement du service.
      </p>
      <h2>5. Contact</h2>
      <p>Pour toute question, contactez-nous via le lien WhatsApp présent sur le site.</p>
    </LegalPage>
  );
}
```

- [ ] **Step 3: Créer `src/app/confidentialite/page.tsx`**

```tsx
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
      <p>Les données sont stockées chez notre hébergeur de base de données (Supabase) et ne sont accessibles qu’à l’équipe Factoo.</p>
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
```

- [ ] **Step 4: Créer `src/app/opengraph-image.tsx`**

```tsx
import { ImageResponse } from "next/og";

export const alt = "Factoo — Facturez et faites-vous payer depuis WhatsApp";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          padding: 80,
          background: "linear-gradient(135deg, #04201D 0%, #0F766E 100%)",
          color: "white",
        }}
      >
        <div style={{ display: "flex", fontSize: 44, fontWeight: 800, color: "#2DD4BF" }}>Factoo</div>
        <div style={{ display: "flex", fontSize: 76, fontWeight: 800, lineHeight: 1.1, marginTop: 28 }}>
          Facturez en 2 minutes.
        </div>
        <div style={{ display: "flex", fontSize: 76, fontWeight: 800, lineHeight: 1.1, color: "#FBBF24" }}>
          Payé depuis WhatsApp.
        </div>
        <div style={{ display: "flex", fontSize: 32, marginTop: 36, opacity: 0.85 }}>
          Wave · Orange Money · Carte — sans compte client
        </div>
      </div>
    ),
    size,
  );
}
```

- [ ] **Step 5: Créer `.env.example`**

```bash
# Supabase (Project Settings > API). Clé service_role : serveur uniquement, ne jamais exposer.
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Numéro WhatsApp du bouton de contact, format international sans + ni espaces (ex. 221770000000).
# Vide = boutons WhatsApp masqués.
NEXT_PUBLIC_WHATSAPP_NUMBER=

# URL publique du site (aperçus de partage). Ex. https://factoo.app
NEXT_PUBLIC_SITE_URL=
```

- [ ] **Step 6: Vérifier `.gitignore`**

Run: `git check-ignore .env.local .env.example`
Expected: seule `.env.local` est listée. Si `.env.example` est aussi ignorée (le template ignore `.env*`), ajouter à la fin de `.gitignore` :
```
!.env.example
```
et relancer la commande pour confirmer.

- [ ] **Step 7: Remplacer `README.md`**

````markdown
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
````

- [ ] **Step 8: Vérification finale**

Run: `npm run lint && npm test && npm run build`
Expected: lint sans erreur, 20 tests PASS, build OK avec les routes `/`, `/cgu`, `/confidentialite`, `/opengraph-image` listées comme statiques (○).

Puis `npm run start` et vérifier :
```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/cgu
curl -s -o /dev/null -w "%{http_code} %{content_type}\n" http://localhost:3000/opengraph-image
```
Expected: `200`, `200`, `200 image/png`.

Contrôle manuel dans le navigateur (DevTools, mode responsive) :
- 375 px et 1440 px, clair et sombre : pas de scroll horizontal, contrastes lisibles, focus visible au clavier.
- Lighthouse mobile sur `npm run start` : Performance, Accessibilité, SEO ≥ 90.
- Avec `.env.local` rempli : une inscription apparaît dans la table `waitlist` ; une deuxième avec le même numéro affiche « Vous êtes déjà inscrit ».

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: pages légales, image de partage, README et .env.example"
```
