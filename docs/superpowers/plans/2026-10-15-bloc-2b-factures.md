# Bloc 2b — Factures, PDF, WhatsApp, « Payée », tableau de bord — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Créer, émettre (numéro légal), envoyer par WhatsApp (page publique + PDF), marquer payées les factures, et suivre l’encaissé sur un tableau de bord.

**Architecture:** Next.js 15 (App Router, Server Actions) + Supabase (RLS, fonctions Postgres pour les transitions d’état et la numérotation atomique). Toute la logique métier est pure dans `src/lib/*` (repo injecté, testée par Vitest) ; les Server Actions sont minces. PDF généré à la demande par `@react-pdf/renderer` à partir d’un instantané figé à l’émission.

**Tech Stack:** Next.js 15.5 (Turbopack), React 19, TypeScript, Tailwind 4, Supabase (`@supabase/ssr`, `@supabase/supabase-js`), zod 3, Vitest 5, `@react-pdf/renderer` 4, `sharp`, `lucide-react`.

**Spec:** `docs/superpowers/specs/2026-10-15-bloc-2b-factures-design.md`

## Global Constraints

- Français uniquement, vouvoiement, apostrophe typographique `’` dans tous les textes affichés (JSX et messages).
- Couleurs : accent factures teal `#0F766E` ; bouton principal `#00C853` texte noir (classe `buttonClass("brand")`) ; fond app `#F8FAFC` ; sombre `#04201D`.
- Montants stockés en entiers `bigint` en unité mineure : XOF/XAF ×1, EUR ×100. Jamais de flottant pour un montant stocké.
- Séparateur des milliers : espace insécable ` ` (compatible police Helvetica du PDF).
- Numéro de facture : `FAC-AAAA-NNNN`, séquence par utilisateur et par année, attribuée uniquement par `issue_invoice()`.
- « Aujourd’hui » = date UTC (`Africa/Dakar`, UTC+0) au format `YYYY-MM-DD`.
- Server Actions : `"use server"` → `requireUser()`/`getSession()` → logique pure de `src/lib` → `FormState`. Aucune erreur brute Supabase affichée ; logs serveur préfixés `[factures]`, `[pdf]`, `[profil]`.
- Formulaires : composants client avec `useActionState`, champs contrôlés, `noValidate`.
- Mobile d’abord : utilisable à 360 px, aucun débordement horizontal.
- Aucune nouvelle dépendance hormis `@react-pdf/renderer`.
- Commandes : `npm test` (Vitest), `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm run check:rls`.
- Commits : messages en français au format `feat(factures): …`, terminés par la ligne `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Carte des fichiers

| Fichier | Rôle |
|---|---|
| `supabase/migrations/005_invoices.sql` | Colonnes paiement du profil, tables `invoices` / `invoice_lines` / `invoice_counters`, RLS, droits, fonctions `save_invoice_draft`, `issue_invoice`, `mark_invoice_paid`, `unmark_invoice_paid`, `cancel_invoice` |
| `scripts/check-rls.mjs` | + contrôles factures |
| `src/lib/invoice-types.ts` | Types partagés (statuts, lignes, instantanés, vue) |
| `src/lib/money.ts` | Conversion saisie ↔ unité mineure, formatage |
| `src/lib/amount-words.ts` | Montant en lettres |
| `src/lib/invoice-totals.ts` | Calcul des totaux |
| `src/lib/invoice-status.ts` | Dates, échéances, statut affiché, libellés |
| `src/lib/invoice-list.ts` | Filtre / tri / recherche de la liste |
| `src/lib/invoice-view.ts` | Construction de la vue (brouillon vivant ou instantané) |
| `src/lib/validation.ts` | + `parseInvoice`, `parseMarkPaid`, `parsePayment`, échéance par défaut dans `parseBilling` |
| `src/lib/invoices.ts` | Logique des actions (repo injecté), traduction des codes SQL |
| `src/lib/dashboard.ts` | Agrégats du tableau de bord |
| `src/lib/whatsapp.ts` | + message et lien de facture |
| `src/lib/profile.ts` / `settings.ts` / `clients.ts` | Profil étendu, `savePayment`, création rapide de client |
| `src/lib/repos.ts` | + `invoicesRepo`, `listInvoiceRows`, `getInvoice`, `getPublicInvoice`, `dashboardRows`, `listClientOptions` |
| `src/pdf/InvoiceDocument.tsx`, `src/pdf/render.tsx` | PDF |
| `src/app/app/(main)/factures/**` | Liste, création, détail, PDF, actions |
| `src/app/f/[token]/**` | Page publique + PDF public |
| `src/components/app/*` | Formulaire, lignes, sélecteur client, vue, actions, badges, graphique, cartes, paiement |

---

### Task 1: Migration SQL 005 et contrôles de sécurité

**Files:**
- Create: `supabase/migrations/005_invoices.sql`
- Modify: `scripts/check-rls.mjs`

**Interfaces:**
- Produces (RPC Supabase, appelées par `src/lib/repos.ts`) :
  - `save_invoice_draft(p_id uuid, p_data jsonb, p_lines jsonb) returns uuid` — exceptions `not_editable`, `client_not_found`
  - `issue_invoice(p_id uuid, p_logo_path text) returns text` — exceptions `not_found`, `not_draft`, `no_client`, `client_archived`, `no_lines`, `totals_mismatch`, `due_date_past`
  - `mark_invoice_paid(p_id uuid, p_paid_at date, p_method text) returns void` — `not_found`, `not_issued`, `paid_at_invalid`
  - `unmark_invoice_paid(p_id uuid) returns void` — `not_found`, `not_paid`
  - `cancel_invoice(p_id uuid) returns void` — `not_found`, `not_issued`
  - `p_data` clés : `client_id, due_kind, due_date, currency, vat_rate, discount_type, discount_value, note, subtotal, discount_amount, vat_amount, total` ; `p_lines` : tableau de `{position, description, quantity, unit_price, line_total}`.

- [ ] **Step 1: Écrire la migration**

```sql
-- 005 — Factures : coordonnées de paiement, factures, lignes, numérotation, transitions d'état.
-- À exécuter dans Supabase → SQL Editor. Idempotence non garantie : à exécuter une seule fois.

alter table public.profiles
  add column wave_number         text,
  add column orange_money_number text,
  add column iban                text,
  add column payment_note        text check (length(payment_note) <= 300),
  add column default_due_days    int not null default 30 check (default_due_days in (0, 15, 30));

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
  discount_value  numeric(16,2) check (discount_value >= 0),  -- % si percent, unité mineure si amount
  note            text check (length(note) <= 500),
  subtotal        bigint not null default 0,
  discount_amount bigint not null default 0,
  vat_amount      bigint not null default 0,
  total           bigint not null default 0,
  seller          jsonb,
  buyer           jsonb,
  public_token    text not null unique
                  default replace(replace(encode(extensions.gen_random_bytes(18), 'base64'), '+', '-'), '/', '_'),
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

alter table public.invoices         enable row level security;
alter table public.invoice_lines    enable row level security;
alter table public.invoice_counters enable row level security;

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
  using (user_id = auth.uid() and exists (
    select 1 from public.invoices i where i.id = invoice_id and i.user_id = auth.uid() and i.status = 'draft'))
  with check (user_id = auth.uid() and exists (
    select 1 from public.invoices i where i.id = invoice_id and i.user_id = auth.uid() and i.status = 'draft'));

grant select, insert, update, delete on public.invoices, public.invoice_lines to authenticated;
grant all on public.invoices, public.invoice_lines, public.invoice_counters to service_role;
revoke all on public.invoices, public.invoice_lines, public.invoice_counters from anon;
-- profiles : nouvelles colonnes couvertes par « grant select, update on public.profiles » (003).

-- Enregistrement atomique d'un brouillon et de ses lignes (droits de l'appelant : RLS appliquée).
create function public.save_invoice_draft(p_id uuid, p_data jsonb, p_lines jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  v_id uuid;
  v_client uuid := nullif(p_data ->> 'client_id', '')::uuid;
begin
  if v_client is not null and not exists (
    select 1 from public.clients c where c.id = v_client and c.user_id = auth.uid() and c.archived_at is null
  ) then
    raise exception 'client_not_found' using errcode = 'P0001';
  end if;

  if p_id is null then
    insert into public.invoices (client_id, due_kind, due_date, currency, vat_rate, discount_type, discount_value, note,
                                 subtotal, discount_amount, vat_amount, total)
    values (v_client, p_data ->> 'due_kind', nullif(p_data ->> 'due_date', '')::date, p_data ->> 'currency',
            (p_data ->> 'vat_rate')::numeric, nullif(p_data ->> 'discount_type', ''),
            nullif(p_data ->> 'discount_value', '')::numeric, nullif(p_data ->> 'note', ''),
            (p_data ->> 'subtotal')::bigint, (p_data ->> 'discount_amount')::bigint,
            (p_data ->> 'vat_amount')::bigint, (p_data ->> 'total')::bigint)
    returning id into v_id;
  else
    update public.invoices set
      client_id = v_client,
      due_kind = p_data ->> 'due_kind',
      due_date = nullif(p_data ->> 'due_date', '')::date,
      currency = p_data ->> 'currency',
      vat_rate = (p_data ->> 'vat_rate')::numeric,
      discount_type = nullif(p_data ->> 'discount_type', ''),
      discount_value = nullif(p_data ->> 'discount_value', '')::numeric,
      note = nullif(p_data ->> 'note', ''),
      subtotal = (p_data ->> 'subtotal')::bigint,
      discount_amount = (p_data ->> 'discount_amount')::bigint,
      vat_amount = (p_data ->> 'vat_amount')::bigint,
      total = (p_data ->> 'total')::bigint
    where id = p_id and status = 'draft'
    returning id into v_id;
    if v_id is null then
      raise exception 'not_editable' using errcode = 'P0001';
    end if;
    delete from public.invoice_lines where invoice_id = v_id;
  end if;

  insert into public.invoice_lines (invoice_id, position, description, quantity, unit_price, line_total)
  select v_id, (l ->> 'position')::int, l ->> 'description', (l ->> 'quantity')::numeric,
         (l ->> 'unit_price')::bigint, (l ->> 'line_total')::bigint
  from jsonb_array_elements(p_lines) as l;

  return v_id;
end $$;

-- Émission : numéro séquentiel sans trou (verrou de ligne sur le compteur), instantanés figés.
create function public.issue_invoice(p_id uuid, p_logo_path text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_uid     uuid := auth.uid();
  v_inv     public.invoices%rowtype;
  v_client  public.clients%rowtype;
  v_profile public.profiles%rowtype;
  v_today   date := (now() at time zone 'Africa/Dakar')::date;
  v_year    int := extract(year from (now() at time zone 'Africa/Dakar'))::int;
  v_count   int;
  v_sum     bigint;
  v_seq     int;
  v_number  text;
  v_logo    text := case when split_part(coalesce(p_logo_path, ''), '/', 1) = v_uid::text then p_logo_path end;
begin
  select * into v_inv from public.invoices where id = p_id and user_id = v_uid for update;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  if v_inv.status <> 'draft' then raise exception 'not_draft' using errcode = 'P0001'; end if;
  if v_inv.client_id is null then raise exception 'no_client' using errcode = 'P0001'; end if;

  select * into v_client from public.clients where id = v_inv.client_id and user_id = v_uid;
  if not found then raise exception 'no_client' using errcode = 'P0001'; end if;
  if v_client.archived_at is not null then raise exception 'client_archived' using errcode = 'P0001'; end if;

  select count(*), coalesce(sum(line_total), 0) into v_count, v_sum from public.invoice_lines where invoice_id = p_id;
  if v_count = 0 or v_count > 50 then raise exception 'no_lines' using errcode = 'P0001'; end if;
  if v_sum <> v_inv.subtotal or v_inv.total <> v_inv.subtotal - v_inv.discount_amount + v_inv.vat_amount then
    raise exception 'totals_mismatch' using errcode = 'P0001';
  end if;
  if v_inv.due_kind = 'date' and (v_inv.due_date is null or v_inv.due_date < v_today) then
    raise exception 'due_date_past' using errcode = 'P0001';
  end if;

  select * into v_profile from public.profiles where id = v_uid;

  insert into public.invoice_counters (user_id, year) values (v_uid, v_year) on conflict do nothing;
  update public.invoice_counters set last_seq = last_seq + 1
    where user_id = v_uid and year = v_year
    returning last_seq into v_seq;
  v_number := format('FAC-%s-%s', v_year, case when v_seq < 10000 then lpad(v_seq::text, 4, '0') else v_seq::text end);

  update public.invoices set
    status = 'issued',
    number = v_number,
    year = v_year,
    seq = v_seq,
    issue_date = v_today,
    due_date = case due_kind when '0' then v_today when '15' then v_today + 15 when '30' then v_today + 30 else due_date end,
    seller = jsonb_build_object(
      'company_name', v_profile.company_name, 'address', v_profile.address, 'city', v_profile.city,
      'country', v_profile.country, 'phone', v_profile.phone, 'business_email', v_profile.business_email,
      'rccm', v_profile.rccm, 'nif', v_profile.nif, 'logo_path', v_logo,
      'wave_number', v_profile.wave_number, 'orange_money_number', v_profile.orange_money_number,
      'iban', v_profile.iban, 'payment_note', v_profile.payment_note),
    buyer = jsonb_build_object(
      'name', v_client.name, 'phone', v_client.phone, 'email', v_client.email, 'address', v_client.address,
      'city', v_client.city, 'country', v_client.country, 'tax_id', v_client.tax_id),
    issued_at = now()
  where id = p_id;

  return v_number;
end $$;

create function public.mark_invoice_paid(p_id uuid, p_paid_at date, p_method text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_inv public.invoices%rowtype;
  v_today date := (now() at time zone 'Africa/Dakar')::date;
begin
  select * into v_inv from public.invoices where id = p_id and user_id = auth.uid() for update;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  if v_inv.status <> 'issued' then raise exception 'not_issued' using errcode = 'P0001'; end if;
  if p_paid_at is null or p_paid_at < v_inv.issue_date or p_paid_at > v_today
     or p_method not in ('wave','orange_money','cash','transfer','other') then
    raise exception 'paid_at_invalid' using errcode = 'P0001';
  end if;
  update public.invoices set status = 'paid', paid_at = p_paid_at, payment_method = p_method where id = p_id;
end $$;

create function public.unmark_invoice_paid(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_inv public.invoices%rowtype;
begin
  select * into v_inv from public.invoices where id = p_id and user_id = auth.uid() for update;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  if v_inv.status <> 'paid' then raise exception 'not_paid' using errcode = 'P0001'; end if;
  update public.invoices set status = 'issued', paid_at = null, payment_method = null where id = p_id;
end $$;

create function public.cancel_invoice(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_inv public.invoices%rowtype;
begin
  select * into v_inv from public.invoices where id = p_id and user_id = auth.uid() for update;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  if v_inv.status <> 'issued' then raise exception 'not_issued' using errcode = 'P0001'; end if;
  update public.invoices set status = 'cancelled', cancelled_at = now() where id = p_id;
end $$;

revoke execute on function public.save_invoice_draft(uuid, jsonb, jsonb) from public, anon;
revoke execute on function public.issue_invoice(uuid, text) from public, anon;
revoke execute on function public.mark_invoice_paid(uuid, date, text) from public, anon;
revoke execute on function public.unmark_invoice_paid(uuid) from public, anon;
revoke execute on function public.cancel_invoice(uuid) from public, anon;
grant execute on function public.save_invoice_draft(uuid, jsonb, jsonb) to authenticated;
grant execute on function public.issue_invoice(uuid, text) to authenticated;
grant execute on function public.mark_invoice_paid(uuid, date, text) to authenticated;
grant execute on function public.unmark_invoice_paid(uuid) to authenticated;
grant execute on function public.cancel_invoice(uuid) to authenticated;
```

- [ ] **Step 2: Étendre `scripts/check-rls.mjs`**

Insérer avant la ligne `} catch (error) {` (après le contrôle « A peut supprimer son propre logo ») :

```js
  // ---------- Factures ----------
  const line = (position) => ({ position, description: `Prestation ${position}`, quantity: 1, unit_price: 1000, line_total: 1000 });
  const draftData = (clientId) => ({
    client_id: clientId, due_kind: "30", due_date: "", currency: "XOF", vat_rate: 18, discount_type: "",
    discount_value: "", note: "", subtotal: 1000, discount_amount: 0, vat_amount: 180, total: 1180,
  });

  const { data: draftId, error: draftError } = await a.client.rpc("save_invoice_draft", {
    p_id: null, p_data: draftData(clientId), p_lines: [line(0)],
  });
  check("A enregistre un brouillon", !draftError && Boolean(draftId), draftError?.message);

  const { data: seenInvoice } = await b.client.from("invoices").select("id").eq("id", draftId);
  check("B ne voit pas la facture de A", seenInvoice?.length === 0);

  const { error: foreignIssue } = await b.client.rpc("issue_invoice", { p_id: draftId, p_logo_path: null });
  check("B ne peut pas émettre la facture de A", foreignIssue?.message === "not_found", foreignIssue?.message);

  const { error: foreignClient } = await b.client.rpc("save_invoice_draft", {
    p_id: null, p_data: draftData(clientId), p_lines: [line(0)],
  });
  check("B ne peut pas facturer le client de A", foreignClient?.message === "client_not_found", foreignClient?.message);

  const { error: forgedStatus } = await a.client
    .from("invoices")
    .insert({ currency: "XOF", vat_rate: 18, status: "issued", number: "FAC-1999-0001" });
  check("A ne peut pas insérer une facture déjà émise", Boolean(forgedStatus));

  const { data: number, error: issueError } = await a.client.rpc("issue_invoice", { p_id: draftId, p_logo_path: null });
  check("A émet sa facture", !issueError && /^FAC-\d{4}-0001$/.test(number ?? ""), issueError?.message ?? number);

  const { data: editedIssued } = await a.client.from("invoices").update({ note: "modifiée" }).eq("id", draftId).select("id");
  check("A ne peut pas modifier une facture émise", (editedIssued?.length ?? 0) === 0);

  const { error: editLines } = await a.client.from("invoice_lines").insert({ invoice_id: draftId, position: 9, description: "ajout", quantity: 1, unit_price: 1, line_total: 1 });
  check("A ne peut pas ajouter de ligne à une facture émise", Boolean(editLines));

  const { error: foreignPaid } = await b.client.rpc("mark_invoice_paid", { p_id: draftId, p_paid_at: new Date().toISOString().slice(0, 10), p_method: "wave" });
  check("B ne peut pas marquer payée la facture de A", foreignPaid?.message === "not_found", foreignPaid?.message);

  const ids = [];
  for (let i = 0; i < 10; i++) {
    const { data } = await a.client.rpc("save_invoice_draft", { p_id: null, p_data: draftData(clientId), p_lines: [line(0)] });
    ids.push(data);
  }
  const numbers = await Promise.all(ids.map((id) => a.client.rpc("issue_invoice", { p_id: id, p_logo_path: null })));
  const seqs = numbers.map((r) => Number(r.data?.slice(-4))).sort((x, y) => x - y);
  check("10 émissions simultanées : 0002 à 0011 sans trou ni doublon", seqs.join(",") === "2,3,4,5,6,7,8,9,10,11", seqs.join(","));

  const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { error: anonRead } = await anon.from("invoices").select("id").limit(1);
  check("un visiteur anonyme n’a pas accès aux factures", Boolean(anonRead));
```

Le compte A est supprimé à la fin (`deleteUser`) : la cascade supprime factures, lignes et compteurs.

- [ ] **Step 3: Faire exécuter la migration par l’utilisateur**

Donner à l’utilisateur le contenu de `005_invoices.sql` à coller dans **Supabase → SQL Editor → New query → Run**. Attendre sa confirmation.

- [ ] **Step 4: Vérifier**

Run: `npm run check:rls`
Expected: toutes les lignes `PASS`, dont les 11 nouvelles lignes factures.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/005_invoices.sql scripts/check-rls.mjs
git commit -m "feat(db): factures, lignes, numérotation atomique, transitions d'état et contrôles RLS"
```

---

### Task 2: Types partagés et formatage des montants

**Files:**
- Create: `src/lib/invoice-types.ts`, `src/lib/money.ts`
- Test: `src/lib/money.test.ts`

**Interfaces:**
- Produces:
  - `invoice-types.ts` : `InvoiceStatus`, `DueKind`, `PaymentMethod`, `DiscountType`, `SellerSnapshot`, `BuyerSnapshot`, `InvoiceLine`, `InvoiceRecord`, `PAYMENT_METHOD_LABELS`, `DUE_KIND_LABELS`
  - `money.ts` : `MINOR_FACTOR: Record<Currency, number>`, `parseAmount(input: string, currency: Currency): number | null`, `minorToInput(minor: number, currency: Currency): string`, `formatMoney(minor: number, currency: Currency): string`, `formatCompact(minor: number, currency: Currency): string`, `MAX_TOTAL = 1e15`

- [ ] **Step 1: Écrire les types**

```ts
// src/lib/invoice-types.ts
import type { CountryCode, Currency } from "@/lib/site";

export type InvoiceStatus = "draft" | "issued" | "paid" | "cancelled";
export type DueKind = "0" | "15" | "30" | "date";
export type PaymentMethod = "wave" | "orange_money" | "cash" | "transfer" | "other";
export type DiscountType = "percent" | "amount";

export const PAYMENT_METHODS: PaymentMethod[] = ["wave", "orange_money", "cash", "transfer", "other"];
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  wave: "Wave",
  orange_money: "Orange Money",
  cash: "Espèces",
  transfer: "Virement",
  other: "Autre",
};

export const DUE_KINDS: DueKind[] = ["0", "15", "30", "date"];
export const DUE_KIND_LABELS: Record<DueKind, string> = {
  "0": "À réception",
  "15": "15 jours",
  "30": "30 jours",
  date: "Date précise",
};

export type SellerSnapshot = {
  company_name: string | null;
  address: string | null;
  city: string | null;
  country: CountryCode | null;
  phone: string | null;
  business_email: string | null;
  rccm: string | null;
  nif: string | null;
  logo_path: string | null;
  wave_number: string | null;
  orange_money_number: string | null;
  iban: string | null;
  payment_note: string | null;
};

export type BuyerSnapshot = {
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  country: CountryCode | null;
  tax_id: string | null;
};

export type InvoiceLine = {
  position: number;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

// Ligne de la table invoices telle que lue par l'application (bigint/numeric convertis en number).
export type InvoiceRecord = {
  id: string;
  client_id: string | null;
  status: InvoiceStatus;
  number: string | null;
  issue_date: string | null;
  due_kind: DueKind;
  due_date: string | null;
  currency: Currency;
  vat_rate: number;
  discount_type: DiscountType | null;
  discount_value: number | null;
  note: string | null;
  subtotal: number;
  discount_amount: number;
  vat_amount: number;
  total: number;
  seller: SellerSnapshot | null;
  buyer: BuyerSnapshot | null;
  public_token: string;
  paid_at: string | null;
  payment_method: PaymentMethod | null;
  updated_at: string;
};
```

- [ ] **Step 2: Écrire le test qui échoue**

```ts
// src/lib/money.test.ts
import { describe, expect, it } from "vitest";
import { formatCompact, formatMoney, minorToInput, parseAmount } from "@/lib/money";

const NB = " ";

describe("parseAmount", () => {
  it("lit un montant en FCFA (entier, espaces tolérés)", () => {
    expect(parseAmount("150000", "XOF")).toBe(150000);
    expect(parseAmount("150 000", "XOF")).toBe(150000);
    expect(parseAmount(`1${NB}250`, "XAF")).toBe(1250);
    expect(parseAmount("0", "XOF")).toBe(0);
  });
  it("refuse les décimales en FCFA", () => {
    expect(parseAmount("10,5", "XOF")).toBeNull();
  });
  it("lit un montant en euros avec virgule ou point", () => {
    expect(parseAmount("1 250,50", "EUR")).toBe(125050);
    expect(parseAmount("12.5", "EUR")).toBe(1250);
    expect(parseAmount("3", "EUR")).toBe(300);
    expect(parseAmount("1,234", "EUR")).toBeNull();
  });
  it("refuse le vide, le négatif et le texte", () => {
    expect(parseAmount("", "XOF")).toBeNull();
    expect(parseAmount("-5", "XOF")).toBeNull();
    expect(parseAmount("abc", "EUR")).toBeNull();
  });
});

describe("minorToInput", () => {
  it("prépare la valeur d’un champ", () => {
    expect(minorToInput(150000, "XOF")).toBe("150000");
    expect(minorToInput(125050, "EUR")).toBe("1250,50");
    expect(minorToInput(300, "EUR")).toBe("3");
  });
});

describe("formatMoney", () => {
  it("formate FCFA sans décimales", () => {
    expect(formatMoney(150000, "XOF")).toBe(`150${NB}000${NB}FCFA`);
    expect(formatMoney(0, "XAF")).toBe(`0${NB}FCFA`);
    expect(formatMoney(1234567, "XOF")).toBe(`1${NB}234${NB}567${NB}FCFA`);
  });
  it("formate l’euro avec 2 décimales", () => {
    expect(formatMoney(125050, "EUR")).toBe(`1${NB}250,50${NB}€`);
    expect(formatMoney(5, "EUR")).toBe(`0,05${NB}€`);
  });
});

describe("formatCompact", () => {
  it("abrège les grands montants", () => {
    expect(formatCompact(950, "XOF")).toBe("950");
    expect(formatCompact(85000, "XOF")).toBe("85 k");
    expect(formatCompact(1250000, "XOF")).toBe("1,3 M");
    expect(formatCompact(125050, "EUR")).toBe("1,3 k");
  });
});
```

- [ ] **Step 3: Vérifier l’échec**

Run: `npx vitest run src/lib/money.test.ts`
Expected: FAIL (module `@/lib/money` introuvable).

- [ ] **Step 4: Implémenter**

```ts
// src/lib/money.ts
import type { Currency } from "@/lib/site";

const NB = " ";
export const MINOR_FACTOR: Record<Currency, number> = { XOF: 1, XAF: 1, EUR: 100 };
export const MAX_TOTAL = 1e15;

const SYMBOL: Record<Currency, string> = { XOF: "FCFA", XAF: "FCFA", EUR: "€" };

function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, NB);
}

// "1 250,50" → unité mineure ; null si invalide (négatif, texte, trop de décimales).
export function parseAmount(input: string, currency: Currency): number | null {
  const cleaned = input.replace(/[\s  ]/g, "").replace(",", ".");
  const decimals = currency === "EUR" ? 2 : 0;
  const pattern = decimals ? /^\d+(\.\d{1,2})?$/ : /^\d+$/;
  if (!pattern.test(cleaned)) return null;
  const [whole, fraction = ""] = cleaned.split(".");
  const minor = Number(whole) * MINOR_FACTOR[currency] + Number(fraction.padEnd(decimals, "0") || 0);
  return Number.isSafeInteger(minor) ? minor : null;
}

export function minorToInput(minor: number, currency: Currency): string {
  if (currency !== "EUR") return String(minor);
  const whole = Math.floor(minor / 100);
  const cents = minor % 100;
  return cents ? `${whole},${String(cents).padStart(2, "0")}` : String(whole);
}

export function formatMoney(minor: number, currency: Currency): string {
  const negative = minor < 0;
  const abs = Math.abs(minor);
  let text: string;
  if (currency === "EUR") {
    text = `${groupThousands(String(Math.floor(abs / 100)))},${String(abs % 100).padStart(2, "0")}`;
  } else {
    text = groupThousands(String(abs));
  }
  return `${negative ? "-" : ""}${text}${NB}${SYMBOL[currency]}`;
}

export function formatCompact(minor: number, currency: Currency): string {
  const value = minor / MINOR_FACTOR[currency];
  const fmt = (n: number) => n.toFixed(1).replace(/\.0$/, "").replace(".", ",");
  if (value >= 1e9) return `${fmt(value / 1e9)} Md`;
  if (value >= 1e6) return `${fmt(value / 1e6)} M`;
  if (value >= 1e3) return `${fmt(value / 1e3)} k`;
  return String(Math.round(value));
}
```

- [ ] **Step 5: Vérifier**

Run: `npx vitest run src/lib/money.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/invoice-types.ts src/lib/money.ts src/lib/money.test.ts
git commit -m "feat(factures): types partagés et formatage des montants"
```

---

### Task 3: Montant en lettres

**Files:**
- Create: `src/lib/amount-words.ts`
- Test: `src/lib/amount-words.test.ts`

**Interfaces:**
- Produces: `numberToFrench(n: number): string`, `amountInWords(minor: number, currency: Currency): string`

- [ ] **Step 1: Écrire le test qui échoue**

```ts
// src/lib/amount-words.test.ts
import { describe, expect, it } from "vitest";
import { amountInWords, numberToFrench } from "@/lib/amount-words";

describe("numberToFrench", () => {
  it.each([
    [0, "zéro"], [1, "un"], [16, "seize"], [17, "dix-sept"], [21, "vingt et un"], [22, "vingt-deux"],
    [70, "soixante-dix"], [71, "soixante et onze"], [77, "soixante-dix-sept"], [80, "quatre-vingts"],
    [81, "quatre-vingt-un"], [90, "quatre-vingt-dix"], [91, "quatre-vingt-onze"], [100, "cent"], [101, "cent un"],
    [200, "deux cents"], [201, "deux cent un"], [1000, "mille"], [1001, "mille un"], [1250, "mille deux cent cinquante"],
    [21000, "vingt et un mille"], [80000, "quatre-vingt mille"], [150000, "cent cinquante mille"],
    [200000, "deux cent mille"], [1000000, "un million"], [2000000, "deux millions"],
    [200000000, "deux cents millions"], [1000000000, "un milliard"], [2500000, "deux millions cinq cent mille"],
  ])("%i → %s", (n, words) => {
    expect(numberToFrench(n)).toBe(words);
  });
});

describe("amountInWords", () => {
  it("francs CFA", () => {
    expect(amountInWords(150000, "XOF")).toBe("cent cinquante mille francs CFA");
    expect(amountInWords(1, "XAF")).toBe("un franc CFA");
    expect(amountInWords(0, "XOF")).toBe("zéro franc CFA");
    expect(amountInWords(2000000, "XOF")).toBe("deux millions de francs CFA");
  });
  it("euros et centimes", () => {
    expect(amountInWords(125050, "EUR")).toBe("mille deux cent cinquante euros et cinquante centimes");
    expect(amountInWords(100, "EUR")).toBe("un euro");
    expect(amountInWords(101, "EUR")).toBe("un euro et un centime");
    expect(amountInWords(50, "EUR")).toBe("zéro euro et cinquante centimes");
    expect(amountInWords(100000000, "EUR")).toBe("un million d’euros");
  });
});
```

- [ ] **Step 2: Vérifier l’échec**

Run: `npx vitest run src/lib/amount-words.test.ts` — Expected: FAIL (module introuvable).

- [ ] **Step 3: Implémenter**

```ts
// src/lib/amount-words.ts
import type { Currency } from "@/lib/site";

const UNITS = [
  "zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf",
  "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize",
];
const TENS: Record<number, string> = { 2: "vingt", 3: "trente", 4: "quarante", 5: "cinquante", 6: "soixante" };

// « final » : le groupe n'est pas suivi de « mille » (invariable) → « cents » et « quatre-vingts » prennent un s.
function below100(n: number, final: boolean): string {
  if (n < 17) return UNITS[n];
  if (n < 20) return `dix-${UNITS[n - 10]}`;
  const tens = Math.floor(n / 10);
  const unit = n % 10;
  if (tens === 7) return unit === 1 ? "soixante et onze" : `soixante-${below100(10 + unit, false)}`;
  if (tens === 9) return `quatre-vingt-${below100(10 + unit, false)}`;
  if (tens === 8) return unit === 0 ? (final ? "quatre-vingts" : "quatre-vingt") : `quatre-vingt-${UNITS[unit]}`;
  if (unit === 0) return TENS[tens];
  if (unit === 1) return `${TENS[tens]} et un`;
  return `${TENS[tens]}-${UNITS[unit]}`;
}

function below1000(n: number, final: boolean): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (hundreds === 1) parts.push("cent");
  else if (hundreds > 1) parts.push(`${UNITS[hundreds]} ${rest === 0 && final ? "cents" : "cent"}`);
  if (rest) parts.push(below100(rest, final));
  return parts.join(" ");
}

export function numberToFrench(n: number): string {
  if (n === 0) return "zéro";
  const billions = Math.floor(n / 1e9);
  const millions = Math.floor(n / 1e6) % 1000;
  const thousands = Math.floor(n / 1000) % 1000;
  const rest = n % 1000;
  const parts: string[] = [];
  if (billions) parts.push(`${numberToFrench(billions)} ${billions > 1 ? "milliards" : "milliard"}`);
  if (millions) parts.push(`${below1000(millions, true)} ${millions > 1 ? "millions" : "million"}`);
  if (thousands) parts.push(thousands === 1 ? "mille" : `${below1000(thousands, false)} mille`);
  if (rest) parts.push(below1000(rest, true));
  return parts.join(" ");
}

const exactMillions = (n: number) => n >= 1e6 && n % 1e6 === 0;

export function amountInWords(minor: number, currency: Currency): string {
  if (currency === "EUR") {
    const euros = Math.floor(minor / 100);
    const cents = minor % 100;
    const unit = exactMillions(euros) ? "d’euros" : euros > 1 ? "euros" : "euro";
    let text = `${numberToFrench(euros)} ${unit}`;
    if (cents) text += ` et ${numberToFrench(cents)} ${cents > 1 ? "centimes" : "centime"}`;
    return text;
  }
  const unit = exactMillions(minor) ? "de francs CFA" : minor > 1 ? "francs CFA" : "franc CFA";
  return `${numberToFrench(minor)} ${unit}`;
}
```

- [ ] **Step 4: Vérifier** — `npx vitest run src/lib/amount-words.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/amount-words.ts src/lib/amount-words.test.ts
git commit -m "feat(factures): montant en lettres (FCFA et euros)"
```

---

### Task 4: Calcul des totaux

**Files:**
- Create: `src/lib/invoice-totals.ts`
- Test: `src/lib/invoice-totals.test.ts`

**Interfaces:**
- Produces: `type Discount = { type: DiscountType; value: number } | null` (value : % si `percent`, unité mineure si `amount`) ; `type Totals = { lineTotals: number[]; subtotal: number; discountAmount: number; net: number; vatAmount: number; total: number }` ; `computeTotals(lines: { quantity: number; unitPrice: number }[], discount: Discount, vatRate: number): Totals`

- [ ] **Step 1: Écrire le test qui échoue**

```ts
// src/lib/invoice-totals.test.ts
import { describe, expect, it } from "vitest";
import { computeTotals } from "@/lib/invoice-totals";

describe("computeTotals", () => {
  it("sans remise, TVA 18 %", () => {
    expect(computeTotals([{ quantity: 2, unitPrice: 50000 }, { quantity: 1, unitPrice: 25000 }], null, 18)).toEqual({
      lineTotals: [100000, 25000], subtotal: 125000, discountAmount: 0, net: 125000, vatAmount: 22500, total: 147500,
    });
  });
  it("remise en pourcentage", () => {
    const t = computeTotals([{ quantity: 1, unitPrice: 100000 }], { type: "percent", value: 10 }, 18);
    expect(t).toMatchObject({ discountAmount: 10000, net: 90000, vatAmount: 16200, total: 106200 });
  });
  it("remise en montant égale au total", () => {
    const t = computeTotals([{ quantity: 1, unitPrice: 5000 }], { type: "amount", value: 5000 }, 18);
    expect(t).toMatchObject({ net: 0, vatAmount: 0, total: 0 });
  });
  it("TVA 0 % et 19,25 %", () => {
    expect(computeTotals([{ quantity: 1, unitPrice: 10000 }], null, 0).total).toBe(10000);
    expect(computeTotals([{ quantity: 1, unitPrice: 10000 }], null, 19.25).vatAmount).toBe(1925);
  });
  it("quantités décimales arrondies à l’unité mineure (demi vers le haut)", () => {
    expect(computeTotals([{ quantity: 1.5, unitPrice: 333 }], null, 0).lineTotals).toEqual([500]); // 499,5 → 500
    expect(computeTotals([{ quantity: 0.333, unitPrice: 1000 }], null, 0).lineTotals).toEqual([333]);
  });
  it("TVA arrondie une seule fois sur le total", () => {
    // 3 × 333 = 999 ; 18 % = 179,82 → 180
    expect(computeTotals([{ quantity: 1, unitPrice: 333 }, { quantity: 1, unitPrice: 333 }, { quantity: 1, unitPrice: 333 }], null, 18).vatAmount).toBe(180);
  });
  it("aucune ligne", () => {
    expect(computeTotals([], null, 18)).toEqual({ lineTotals: [], subtotal: 0, discountAmount: 0, net: 0, vatAmount: 0, total: 0 });
  });
});
```

- [ ] **Step 2: Vérifier l’échec** — `npx vitest run src/lib/invoice-totals.test.ts` → FAIL.

- [ ] **Step 3: Implémenter**

```ts
// src/lib/invoice-totals.ts
import type { DiscountType } from "@/lib/invoice-types";

export type Discount = { type: DiscountType; value: number } | null;
export type Totals = {
  lineTotals: number[];
  subtotal: number;
  discountAmount: number;
  net: number;
  vatAmount: number;
  total: number;
};

// a × b / d arrondi demi vers le haut, en BigInt pour éviter toute erreur de flottant.
function mulDivRound(a: bigint, b: bigint, d: bigint): bigint {
  return (a * b * 2n + d) / (2n * d);
}

const scaled = (n: number, factor: number) => BigInt(Math.round(n * factor));

export function computeTotals(lines: { quantity: number; unitPrice: number }[], discount: Discount, vatRate: number): Totals {
  const lineTotals = lines.map((l) => Number(mulDivRound(scaled(l.quantity, 1000), BigInt(l.unitPrice), 1000n)));
  const subtotal = lineTotals.reduce((sum, v) => sum + v, 0);
  let discountAmount = 0;
  if (discount?.type === "percent") discountAmount = Number(mulDivRound(BigInt(subtotal), scaled(discount.value, 100), 10000n));
  if (discount?.type === "amount") discountAmount = Math.round(discount.value);
  discountAmount = Math.min(discountAmount, subtotal);
  const net = subtotal - discountAmount;
  const vatAmount = Number(mulDivRound(BigInt(net), scaled(vatRate, 100), 10000n));
  return { lineTotals, subtotal, discountAmount, net, vatAmount, total: net + vatAmount };
}
```

Note : la limitation `Math.min` protège l’affichage en direct ; le refus explicite d’une remise > total HT est fait dans `saveInvoice` (Task 7).

- [ ] **Step 4: Vérifier** — PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/invoice-totals.ts src/lib/invoice-totals.test.ts
git commit -m "feat(factures): calcul des totaux HT, remise, TVA et TTC"
```

---

### Task 5: Dates, statut affiché et liste filtrée

**Files:**
- Create: `src/lib/invoice-status.ts`, `src/lib/invoice-list.ts`
- Test: `src/lib/invoice-status.test.ts`, `src/lib/invoice-list.test.ts`

**Interfaces:**
- Produces:
  - `todayInDakar(now?: Date): string`, `addDays(date: string, days: number): string`, `dueDateFor(kind: DueKind, from: string, custom: string | null): string | null`, `formatDateFr(date: string): string` (« 14/11/2026 »), `type DisplayStatus = "draft" | "pending" | "overdue" | "paid" | "cancelled"`, `displayStatus(inv: { status: InvoiceStatus; due_date: string | null }, today: string): DisplayStatus`, `STATUS_LABELS: Record<DisplayStatus, string>`
  - `type ListFilter = "toutes" | "brouillons" | "attente" | "retard" | "payees" | "annulees"`, `LIST_FILTERS: { value: ListFilter; label: string }[]`, `type ListRow = { id: string; number: string | null; status: InvoiceStatus; due_date: string | null; total: number; currency: Currency; updated_at: string; issued_at: string | null; client_name: string | null }`, `filterInvoices(rows: ListRow[], filter: ListFilter, q: string, today: string): ListRow[]`, `parseListFilter(value: string | undefined): ListFilter`

- [ ] **Step 1: Écrire les tests qui échouent**

```ts
// src/lib/invoice-status.test.ts
import { describe, expect, it } from "vitest";
import { addDays, displayStatus, dueDateFor, formatDateFr, todayInDakar } from "@/lib/invoice-status";

describe("dates", () => {
  it("aujourd’hui à Dakar (UTC)", () => {
    expect(todayInDakar(new Date("2026-10-15T23:30:00Z"))).toBe("2026-10-15");
  });
  it("ajoute des jours en changeant de mois et d’année", () => {
    expect(addDays("2026-12-20", 15)).toBe("2027-01-04");
    expect(addDays("2026-02-15", 15)).toBe("2026-03-02");
  });
  it("échéance selon le choix rapide", () => {
    expect(dueDateFor("0", "2026-10-15", null)).toBe("2026-10-15");
    expect(dueDateFor("15", "2026-10-15", null)).toBe("2026-10-30");
    expect(dueDateFor("30", "2026-10-15", null)).toBe("2026-11-14");
    expect(dueDateFor("date", "2026-10-15", "2026-12-01")).toBe("2026-12-01");
    expect(dueDateFor("date", "2026-10-15", null)).toBeNull();
  });
  it("format français", () => {
    expect(formatDateFr("2026-11-14")).toBe("14/11/2026");
  });
});

describe("displayStatus", () => {
  const today = "2026-10-15";
  it("brouillon, payée, annulée", () => {
    expect(displayStatus({ status: "draft", due_date: null }, today)).toBe("draft");
    expect(displayStatus({ status: "paid", due_date: "2026-01-01" }, today)).toBe("paid");
    expect(displayStatus({ status: "cancelled", due_date: "2026-01-01" }, today)).toBe("cancelled");
  });
  it("échéance aujourd’hui : en attente ; hier : en retard", () => {
    expect(displayStatus({ status: "issued", due_date: "2026-10-15" }, today)).toBe("pending");
    expect(displayStatus({ status: "issued", due_date: "2026-10-14" }, today)).toBe("overdue");
  });
});
```

```ts
// src/lib/invoice-list.test.ts
import { describe, expect, it } from "vitest";
import { filterInvoices, parseListFilter, type ListRow } from "@/lib/invoice-list";

const row = (over: Partial<ListRow>): ListRow => ({
  id: "x", number: null, status: "draft", due_date: null, total: 1000, currency: "XOF",
  updated_at: "2026-10-01T10:00:00Z", issued_at: null, client_name: "Teranga", ...over,
});
const rows: ListRow[] = [
  row({ id: "d1", updated_at: "2026-10-10T10:00:00Z" }),
  row({ id: "d2", updated_at: "2026-10-12T10:00:00Z", client_name: null }),
  row({ id: "p1", status: "issued", number: "FAC-2026-0001", due_date: "2026-10-20", issued_at: "2026-10-01T09:00:00Z", client_name: "Awa Couture" }),
  row({ id: "r1", status: "issued", number: "FAC-2026-0002", due_date: "2026-10-01", issued_at: "2026-10-02T09:00:00Z" }),
  row({ id: "pa", status: "paid", number: "FAC-2026-0003", issued_at: "2026-10-03T09:00:00Z" }),
  row({ id: "c1", status: "cancelled", number: "FAC-2026-0004", issued_at: "2026-10-04T09:00:00Z" }),
];
const ids = (list: ListRow[]) => list.map((r) => r.id);
const today = "2026-10-15";

describe("filterInvoices", () => {
  it("toutes : brouillons récents d’abord, puis émises de la plus récente à la plus ancienne", () => {
    expect(ids(filterInvoices(rows, "toutes", "", today))).toEqual(["d2", "d1", "c1", "pa", "r1", "p1"]);
  });
  it("filtres par statut", () => {
    expect(ids(filterInvoices(rows, "brouillons", "", today))).toEqual(["d2", "d1"]);
    expect(ids(filterInvoices(rows, "attente", "", today))).toEqual(["p1"]);
    expect(ids(filterInvoices(rows, "retard", "", today))).toEqual(["r1"]);
    expect(ids(filterInvoices(rows, "payees", "", today))).toEqual(["pa"]);
    expect(ids(filterInvoices(rows, "annulees", "", today))).toEqual(["c1"]);
  });
  it("recherche sur le numéro et le client, sans tenir compte des accents ni de la casse", () => {
    expect(ids(filterInvoices(rows, "toutes", "0002", today))).toEqual(["r1"]);
    expect(ids(filterInvoices(rows, "toutes", "awa couture", today))).toEqual(["p1"]);
    expect(ids(filterInvoices(rows, "toutes", "TERANGA", today))).toEqual(["d1", "c1", "pa", "r1"]);
  });
});

describe("parseListFilter", () => {
  it("valeur inconnue → toutes", () => {
    expect(parseListFilter("retard")).toBe("retard");
    expect(parseListFilter("n’importe")).toBe("toutes");
    expect(parseListFilter(undefined)).toBe("toutes");
  });
});
```

- [ ] **Step 2: Vérifier l’échec** — `npx vitest run src/lib/invoice-status.test.ts src/lib/invoice-list.test.ts` → FAIL.

- [ ] **Step 3: Implémenter**

```ts
// src/lib/invoice-status.ts
import type { DueKind, InvoiceStatus } from "@/lib/invoice-types";

// Dakar est en UTC+0 toute l'année : la date UTC est la date locale.
export function todayInDakar(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function dueDateFor(kind: DueKind, from: string, custom: string | null): string | null {
  if (kind === "date") return custom;
  return addDays(from, Number(kind));
}

export function formatDateFr(date: string): string {
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}

export type DisplayStatus = "draft" | "pending" | "overdue" | "paid" | "cancelled";

export const STATUS_LABELS: Record<DisplayStatus, string> = {
  draft: "Brouillon",
  pending: "En attente",
  overdue: "En retard",
  paid: "Payée",
  cancelled: "Annulée",
};

export function displayStatus(inv: { status: InvoiceStatus; due_date: string | null }, today: string): DisplayStatus {
  if (inv.status === "draft") return "draft";
  if (inv.status === "paid") return "paid";
  if (inv.status === "cancelled") return "cancelled";
  return inv.due_date !== null && inv.due_date < today ? "overdue" : "pending";
}
```

```ts
// src/lib/invoice-list.ts
import { displayStatus, type DisplayStatus } from "@/lib/invoice-status";
import type { InvoiceStatus } from "@/lib/invoice-types";
import type { Currency } from "@/lib/site";

export type ListFilter = "toutes" | "brouillons" | "attente" | "retard" | "payees" | "annulees";

export const LIST_FILTERS: { value: ListFilter; label: string }[] = [
  { value: "toutes", label: "Toutes" },
  { value: "brouillons", label: "Brouillons" },
  { value: "attente", label: "En attente" },
  { value: "retard", label: "En retard" },
  { value: "payees", label: "Payées" },
  { value: "annulees", label: "Annulées" },
];

const FILTER_STATUS: Record<Exclude<ListFilter, "toutes">, DisplayStatus> = {
  brouillons: "draft",
  attente: "pending",
  retard: "overdue",
  payees: "paid",
  annulees: "cancelled",
};

export type ListRow = {
  id: string;
  number: string | null;
  status: InvoiceStatus;
  due_date: string | null;
  total: number;
  currency: Currency;
  updated_at: string;
  issued_at: string | null;
  client_name: string | null;
};

const normalize = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function parseListFilter(value: string | undefined): ListFilter {
  return LIST_FILTERS.some((f) => f.value === value) ? (value as ListFilter) : "toutes";
}

export function filterInvoices(rows: ListRow[], filter: ListFilter, q: string, today: string): ListRow[] {
  const term = normalize(q.trim());
  return rows
    .filter((r) => filter === "toutes" || displayStatus(r, today) === FILTER_STATUS[filter])
    .filter((r) => !term || normalize(`${r.number ?? ""} ${r.client_name ?? ""}`).includes(term))
    .sort((a, b) => {
      if ((a.status === "draft") !== (b.status === "draft")) return a.status === "draft" ? -1 : 1;
      const ka = a.status === "draft" ? a.updated_at : (a.issued_at ?? "");
      const kb = b.status === "draft" ? b.updated_at : (b.issued_at ?? "");
      return kb.localeCompare(ka);
    });
}
```

- [ ] **Step 4: Vérifier** — PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/invoice-status.ts src/lib/invoice-status.test.ts src/lib/invoice-list.ts src/lib/invoice-list.test.ts
git commit -m "feat(factures): échéances, statut affiché et liste filtrée"
```

---

### Task 6: Validation (facture, paiement, paramètres)

**Files:**
- Modify: `src/lib/validation.ts` (ajouter à la fin ; modifier le bloc Facturation)
- Test: `src/lib/validation.test.ts` (ajouter des `describe`)

**Interfaces:**
- Consumes: `parseAmount` (Task 2), types (Task 2).
- Produces:
  - `type InvoiceLineInput = { description: string; quantity: number; unit_price: number }`
  - `type InvoiceInput = { client_id: string | null; due_kind: DueKind; due_date: string | null; currency: Currency; vat_rate: number; discount: Discount; note: string | null; lines: InvoiceLineInput[] }`
  - `parseInvoice(raw: Record<string, unknown>, today: string): Parsed<InvoiceInput, string>` — erreurs indexées `clientId`, `dueDate`, `vatRate`, `discountValue`, `note`, `lines`, `lines.N.description`, `lines.N.quantity`, `lines.N.unitPrice`
  - `parseMarkPaid(raw, today): Parsed<{ paid_at: string; payment_method: PaymentMethod }, "paidAt" | "method">`
  - `type PaymentInput = { wave_number: string | null; orange_money_number: string | null; iban: string | null; payment_note: string | null }`, `type PaymentField = "waveCountryCode" | "wavePhone" | "omCountryCode" | "omPhone" | "iban" | "paymentNote"`, `parsePayment(raw): Parsed<PaymentInput, PaymentField>`
  - `BillingInput` devient `{ currency: Currency; vat_rate: number; default_due_days?: 0 | 15 | 30 }`, `BillingField` ajoute `"dueDays"`.

- [ ] **Step 1: Écrire les tests qui échouent** (ajouter à `src/lib/validation.test.ts`, en important `parseInvoice, parseMarkPaid, parsePayment` depuis `@/lib/validation`)

```ts
describe("parseInvoice", () => {
  const today = "2026-10-15";
  const base = {
    clientId: "8f1c2f9e-3b1a-4c6e-9d2a-1a2b3c4d5e6f", dueKind: "30", dueDate: "", currency: "XOF", vatRate: "18",
    discountType: "", discountValue: "", note: "",
    "lines.0.description": "Logo", "lines.0.quantity": "1", "lines.0.unitPrice": "150 000",
    "lines.1.description": "Cartes de visite", "lines.1.quantity": "2,5", "lines.1.unitPrice": "10000",
  };

  it("reconstruit les lignes et convertit les montants", () => {
    const r = parseInvoice(base, today);
    expect(r).toEqual({
      success: true,
      data: {
        client_id: base.clientId, due_kind: "30", due_date: null, currency: "XOF", vat_rate: 18, discount: null, note: null,
        lines: [
          { description: "Logo", quantity: 1, unit_price: 150000 },
          { description: "Cartes de visite", quantity: 2.5, unit_price: 10000 },
        ],
      },
    });
  });

  it("ignore les lignes entièrement vides", () => {
    const r = parseInvoice({ ...base, "lines.2.description": "", "lines.2.quantity": "", "lines.2.unitPrice": "" }, today);
    expect(r.success && r.data.lines).toHaveLength(2);
  });

  it("indexe les erreurs de ligne", () => {
    const r = parseInvoice({ ...base, "lines.1.quantity": "0", "lines.0.description": " " }, today);
    expect(!r.success && r.fieldErrors["lines.1.quantity"]).toBe("Quantité invalide");
    expect(!r.success && r.fieldErrors["lines.0.description"]).toBe("Désignation obligatoire");
  });

  it("exige au moins une ligne", () => {
    const r = parseInvoice({ ...base, "lines.0.description": "", "lines.0.quantity": "", "lines.0.unitPrice": "", "lines.1.description": "", "lines.1.quantity": "", "lines.1.unitPrice": "" }, today);
    expect(!r.success && r.fieldErrors.lines).toBe("Ajoutez au moins une ligne.");
  });

  it("prix en euros avec centimes ; décimales refusées en FCFA", () => {
    const eur = parseInvoice({ ...base, currency: "EUR", "lines.0.unitPrice": "99,90" }, today);
    expect(eur.success && eur.data.lines[0].unit_price).toBe(9990);
    const xof = parseInvoice({ ...base, "lines.0.unitPrice": "99,90" }, today);
    expect(!xof.success && xof.fieldErrors["lines.0.unitPrice"]).toBe("Prix invalide");
  });

  it("client facultatif pour un brouillon", () => {
    const r = parseInvoice({ ...base, clientId: "" }, today);
    expect(r.success && r.data.client_id).toBeNull();
  });

  it("date précise obligatoire et non passée", () => {
    expect(parseInvoice({ ...base, dueKind: "date", dueDate: "" }, today)).toMatchObject({ success: false, fieldErrors: { dueDate: "Choisissez une date" } });
    expect(parseInvoice({ ...base, dueKind: "date", dueDate: "2026-10-14" }, today)).toMatchObject({ success: false, fieldErrors: { dueDate: "L’échéance ne peut pas être dans le passé." } });
    const ok = parseInvoice({ ...base, dueKind: "date", dueDate: "2026-12-01" }, today);
    expect(ok.success && ok.data.due_date).toBe("2026-12-01");
  });

  it("remise en % ou en montant", () => {
    const pct = parseInvoice({ ...base, discountType: "percent", discountValue: "12,5" }, today);
    expect(pct.success && pct.data.discount).toEqual({ type: "percent", value: 12.5 });
    const amt = parseInvoice({ ...base, discountType: "amount", discountValue: "5 000" }, today);
    expect(amt.success && amt.data.discount).toEqual({ type: "amount", value: 5000 });
    const bad = parseInvoice({ ...base, discountType: "percent", discountValue: "120" }, today);
    expect(!bad.success && bad.fieldErrors.discountValue).toBe("Remise invalide");
  });

  it("TVA avec virgule", () => {
    const r = parseInvoice({ ...base, vatRate: "19,25" }, today);
    expect(r.success && r.data.vat_rate).toBe(19.25);
  });
});

describe("parseMarkPaid", () => {
  it("date ≤ aujourd’hui et moyen connu", () => {
    expect(parseMarkPaid({ paidAt: "2026-10-15", method: "wave" }, "2026-10-15")).toEqual({ success: true, data: { paid_at: "2026-10-15", payment_method: "wave" } });
    expect(parseMarkPaid({ paidAt: "2026-10-16", method: "wave" }, "2026-10-15")).toMatchObject({ success: false, fieldErrors: { paidAt: "La date ne peut pas être dans le futur." } });
    expect(parseMarkPaid({ paidAt: "2026-10-15", method: "bitcoin" }, "2026-10-15")).toMatchObject({ success: false, fieldErrors: { method: "Choisissez un moyen de paiement" } });
  });
});

describe("parsePayment", () => {
  it("numéros normalisés, IBAN compacté, champs vides → null", () => {
    expect(parsePayment({ waveCountryCode: "221", wavePhone: "77 123 45 67", omCountryCode: "221", omPhone: "", iban: "sn08 sn01 0015 2000", paymentNote: "" })).toEqual({
      success: true,
      data: { wave_number: "+221771234567", orange_money_number: null, iban: "SN08SN0100152000", payment_note: null },
    });
  });
  it("refuse un numéro invalide", () => {
    expect(parsePayment({ waveCountryCode: "221", wavePhone: "123", omCountryCode: "221", omPhone: "", iban: "", paymentNote: "" })).toMatchObject({ success: false, fieldErrors: { wavePhone: "Numéro invalide : 8 à 10 chiffres" } });
  });
});

describe("parseBilling — échéance par défaut", () => {
  it("facultative ; 0, 15 ou 30", () => {
    expect(parseBilling({ currency: "XOF", vatRate: "18", dueDays: "15" })).toEqual({ success: true, data: { currency: "XOF", vat_rate: 18, default_due_days: 15 } });
    expect(parseBilling({ currency: "XOF", vatRate: "18" })).toEqual({ success: true, data: { currency: "XOF", vat_rate: 18 } });
    expect(parseBilling({ currency: "XOF", vatRate: "18", dueDays: "45" })).toMatchObject({ success: false, fieldErrors: { dueDays: "Choisissez une échéance" } });
  });
});
```

- [ ] **Step 2: Vérifier l’échec** — `npx vitest run src/lib/validation.test.ts` → FAIL (fonctions non exportées).

- [ ] **Step 3: Modifier le bloc Facturation de `validation.ts`**

Remplacer le bloc `/* ---------- Facturation ---------- */` existant par :

```ts
/* ---------- Facturation ---------- */

export type BillingField = "currency" | "vatRate" | "dueDays";
export type BillingInput = { currency: Currency; vat_rate: number; default_due_days?: 0 | 15 | 30 };

const vatRateSchema = z.preprocess(
  (v) => (typeof v === "number" ? String(v) : asString(v).trim()),
  z
    .string()
    .regex(/^\d{1,3}([.,]\d{1,2})?$/, "Taux invalide (ex. 18 ou 19,25)")
    .transform((s) => Number(s.replace(",", ".")))
    .refine((n) => n <= 100, "100 % maximum"),
);

const billingSchema = z
  .object({
    currency: z.enum(CURRENCIES, { errorMap: () => ({ message: "Choisissez une devise" }) }),
    vatRate: vatRateSchema,
    dueDays: z.preprocess(
      blankToUndefined,
      z.enum(["0", "15", "30"], { errorMap: () => ({ message: "Choisissez une échéance" }) }).optional(),
    ),
  })
  .transform((v): BillingInput => {
    const out: BillingInput = { currency: v.currency, vat_rate: v.vatRate };
    if (v.dueDays !== undefined) out.default_due_days = Number(v.dueDays) as 0 | 15 | 30;
    return out;
  });

export function parseBilling(raw: Record<string, unknown>): Parsed<BillingInput, BillingField> {
  return parseWith<typeof billingSchema, BillingField>(billingSchema, raw);
}
```

- [ ] **Step 4: Ajouter à la fin de `validation.ts`**

Ajouter aux imports en tête du fichier : `import type { Discount } from "@/lib/invoice-totals";`, `import { PAYMENT_METHODS, type DueKind, type PaymentMethod } from "@/lib/invoice-types";`, `import { parseAmount } from "@/lib/money";`.

```ts
/* ---------- Factures ---------- */

export type InvoiceLineInput = { description: string; quantity: number; unit_price: number };
export type InvoiceInput = {
  client_id: string | null;
  due_kind: DueKind;
  due_date: string | null;
  currency: Currency;
  vat_rate: number;
  discount: Discount;
  note: string | null;
  lines: InvoiceLineInput[];
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const QTY_RE = /^\d{1,6}([.,]\d{1,3})?$/;
const PCT_RE = /^\d{1,3}([.,]\d{1,2})?$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_LINES = 50;
const MAX_UNIT_PRICE = 1e12;

// Les champs de ligne arrivent à plat (« lines.3.quantity ») : on les regroupe par index, dans l'ordre.
function collectLines(raw: Record<string, unknown>) {
  const byIndex = new Map<number, Record<string, string>>();
  for (const [key, value] of Object.entries(raw)) {
    const m = /^lines\.(\d+)\.(description|quantity|unitPrice)$/.exec(key);
    if (!m) continue;
    const index = Number(m[1]);
    byIndex.set(index, { ...(byIndex.get(index) ?? {}), [m[2]]: asString(value) });
  }
  return [...byIndex.entries()]
    .sort(([a], [b]) => a - b)
    .map(([index, l]) => ({ index, description: (l.description ?? "").trim(), quantity: (l.quantity ?? "").trim(), unitPrice: (l.unitPrice ?? "").trim() }))
    .filter((l) => l.description || l.quantity || l.unitPrice);
}

export function parseInvoice(raw: Record<string, unknown>, today: string): Parsed<InvoiceInput, string> {
  const errors: FieldErrors<string> = {};
  const fail = (field: string, message: string) => {
    if (!errors[field]) errors[field] = message;
  };

  const clientId = asString(raw.clientId).trim();
  if (clientId && !UUID_RE.test(clientId)) fail("clientId", "Choisissez un client");

  const dueKind = asString(raw.dueKind) as DueKind;
  if (!["0", "15", "30", "date"].includes(dueKind)) fail("dueKind", "Choisissez une échéance");
  const dueDateRaw = asString(raw.dueDate).trim();
  let dueDate: string | null = null;
  if (dueKind === "date") {
    if (!DATE_RE.test(dueDateRaw)) fail("dueDate", "Choisissez une date");
    else if (dueDateRaw < today) fail("dueDate", "L’échéance ne peut pas être dans le passé.");
    else dueDate = dueDateRaw;
  }

  const currency = asString(raw.currency) as Currency;
  if (!(CURRENCIES as readonly string[]).includes(currency)) fail("currency", "Choisissez une devise");

  const vat = vatRateSchema.safeParse(raw.vatRate);
  if (!vat.success) fail("vatRate", vat.error.issues[0].message);

  let discount: Discount = null;
  const discountType = asString(raw.discountType);
  const discountValue = asString(raw.discountValue).trim();
  if (discountType === "percent" || discountType === "amount") {
    if (discountType === "percent") {
      const n = Number(discountValue.replace(",", "."));
      if (!PCT_RE.test(discountValue) || n > 100) fail("discountValue", "Remise invalide");
      else if (n > 0) discount = { type: "percent", value: n };
    } else {
      const minor = parseAmount(discountValue, currency);
      if (minor === null) fail("discountValue", "Remise invalide");
      else if (minor > 0) discount = { type: "amount", value: minor };
    }
  }

  const note = asString(raw.note).trim();
  if (note.length > 500) fail("note", "500 caractères maximum");

  const collected = collectLines(raw);
  if (collected.length === 0) fail("lines", "Ajoutez au moins une ligne.");
  if (collected.length > MAX_LINES) fail("lines", `${MAX_LINES} lignes maximum.`);
  const lines: InvoiceLineInput[] = collected.map((l, position) => {
    const key = (field: string) => `lines.${l.index}.${field}`;
    if (!l.description) fail(key("description"), "Désignation obligatoire");
    else if (l.description.length > 300) fail(key("description"), "300 caractères maximum");
    const quantity = Number(l.quantity.replace(",", "."));
    if (!QTY_RE.test(l.quantity) || quantity <= 0 || quantity > 100000) fail(key("quantity"), "Quantité invalide");
    const unitPrice = parseAmount(l.unitPrice, currency);
    if (unitPrice === null || unitPrice > MAX_UNIT_PRICE) fail(key("unitPrice"), "Prix invalide");
    void position;
    return { description: l.description, quantity, unit_price: unitPrice ?? 0 };
  });

  if (Object.keys(errors).length > 0) return { success: false, fieldErrors: errors };
  return {
    success: true,
    data: {
      client_id: clientId || null,
      due_kind: dueKind,
      due_date: dueDate,
      currency,
      vat_rate: vat.success ? vat.data : 0,
      discount,
      note: note || null,
      lines,
    },
  };
}

/* ---------- Paiement d'une facture ---------- */

export function parseMarkPaid(
  raw: Record<string, unknown>,
  today: string,
): Parsed<{ paid_at: string; payment_method: PaymentMethod }, "paidAt" | "method"> {
  const errors: FieldErrors<"paidAt" | "method"> = {};
  const paidAt = asString(raw.paidAt).trim();
  if (!DATE_RE.test(paidAt)) errors.paidAt = "Choisissez une date";
  else if (paidAt > today) errors.paidAt = "La date ne peut pas être dans le futur.";
  const method = asString(raw.method) as PaymentMethod;
  if (!PAYMENT_METHODS.includes(method)) errors.method = "Choisissez un moyen de paiement";
  if (errors.paidAt || errors.method) return { success: false, fieldErrors: errors };
  return { success: true, data: { paid_at: paidAt, payment_method: method } };
}

/* ---------- Coordonnées de paiement (Paramètres) ---------- */

export type PaymentField = "waveCountryCode" | "wavePhone" | "omCountryCode" | "omPhone" | "iban" | "paymentNote";
export type PaymentInput = {
  wave_number: string | null;
  orange_money_number: string | null;
  iban: string | null;
  payment_note: string | null;
};

const paymentSchema = z
  .object({
    waveCountryCode: z.preprocess(digitsOnly, z.string()),
    wavePhone: z.preprocess(digitsOnly, z.string()),
    omCountryCode: z.preprocess(digitsOnly, z.string()),
    omPhone: z.preprocess(digitsOnly, z.string()),
    iban: z.preprocess(
      (v) => asString(v).replace(/\s/g, "").toUpperCase(),
      z.string().regex(/^[A-Z0-9]{0,34}$/, "IBAN invalide"),
    ),
    paymentNote: optionalText(300),
  })
  .superRefine((v, ctx) => {
    checkPhonePair({ countryCode: v.waveCountryCode, phone: v.wavePhone }, {
      ...ctx,
      addIssue: (issue) => ctx.addIssue({ ...issue, path: [issue.path?.[0] === "phone" ? "wavePhone" : "waveCountryCode"] }),
    } as z.RefinementCtx);
    checkPhonePair({ countryCode: v.omCountryCode, phone: v.omPhone }, {
      ...ctx,
      addIssue: (issue) => ctx.addIssue({ ...issue, path: [issue.path?.[0] === "phone" ? "omPhone" : "omCountryCode"] }),
    } as z.RefinementCtx);
  })
  .transform(
    (v): PaymentInput => ({
      wave_number: phoneOrNull({ countryCode: v.waveCountryCode, phone: v.wavePhone }),
      orange_money_number: phoneOrNull({ countryCode: v.omCountryCode, phone: v.omPhone }),
      iban: v.iban || null,
      payment_note: v.paymentNote ?? null,
    }),
  );

export function parsePayment(raw: Record<string, unknown>): Parsed<PaymentInput, PaymentField> {
  return parseWith<typeof paymentSchema, PaymentField>(paymentSchema, raw);
}
```

Retirer la ligne `void position;` et le paramètre `position` du `map` si le lint le signale (il est inutile ; il n’est là que pour lisibilité) — version finale : `collected.map((l) => { … })`.

- [ ] **Step 5: Vérifier** — `npx vitest run src/lib/validation.test.ts` → PASS (anciens et nouveaux tests). Puis `npx tsc --noEmit` → aucune erreur.

- [ ] **Step 6: Commit**

```bash
git add src/lib/validation.ts src/lib/validation.test.ts
git commit -m "feat(factures): validation des factures, du paiement et des coordonnées de paiement"
```

---

### Task 7: Logique des actions sur les factures

**Files:**
- Create: `src/lib/invoices.ts`
- Test: `src/lib/invoices.test.ts`

**Interfaces:**
- Consumes: `parseInvoice`, `parseMarkPaid` (Task 6), `computeTotals` (Task 4), `MAX_TOTAL` (Task 2).
- Produces:
  - `type DraftPayload = { client_id: string | null; due_kind: DueKind; due_date: string | null; currency: Currency; vat_rate: number; discount_type: DiscountType | null; discount_value: number | null; note: string | null; subtotal: number; discount_amount: number; vat_amount: number; total: number }`
  - `type LinePayload = { position: number; description: string; quantity: number; unit_price: number; line_total: number }`
  - `interface InvoicesRepo { saveDraft(id: string | null, data: DraftPayload, lines: LinePayload[]): Promise<DbResult & { id?: string }>; copyLogo(invoiceId: string): Promise<string | null>; issue(id: string, logoPath: string | null): Promise<DbResult & { number?: string }>; markPaid(id: string, paidAt: string, method: PaymentMethod): Promise<DbResult>; unmarkPaid(id: string): Promise<DbResult>; cancel(id: string): Promise<DbResult>; deleteDraft(id: string): Promise<DbResult & { found: boolean }> }`
  - `saveInvoice(repo, id: string | null, raw, opts: { issue: boolean; today: string }): Promise<FormState>`
  - `markInvoicePaid(repo, id, raw, today): Promise<FormState>`, `unmarkInvoicePaid(repo, id)`, `cancelInvoice(repo, id)`, `deleteDraft(repo, id)` → `Promise<FormState>`
  - `INVOICE_FLASH: Record<string, string>` (contient `{numero}` pour `emise`), `INVOICE_ERRORS: Record<string, string>`

- [ ] **Step 1: Écrire le test qui échoue**

```ts
// src/lib/invoices.test.ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { GENERIC_ERROR } from "@/lib/form-state";
import { cancelInvoice, deleteDraft, markInvoicePaid, saveInvoice, unmarkInvoicePaid, type InvoicesRepo } from "@/lib/invoices";

function fakeRepo(over: Partial<InvoicesRepo> = {}): InvoicesRepo {
  return {
    saveDraft: vi.fn(async () => ({ error: null, id: "inv1" })),
    copyLogo: vi.fn(async () => "u1/factures/inv1.webp"),
    issue: vi.fn(async () => ({ error: null, number: "FAC-2026-0001" })),
    markPaid: vi.fn(async () => ({ error: null })),
    unmarkPaid: vi.fn(async () => ({ error: null })),
    cancel: vi.fn(async () => ({ error: null })),
    deleteDraft: vi.fn(async () => ({ error: null, found: true })),
    ...over,
  };
}

const today = "2026-10-15";
const form = {
  clientId: "8f1c2f9e-3b1a-4c6e-9d2a-1a2b3c4d5e6f", dueKind: "30", dueDate: "", currency: "XOF", vatRate: "18",
  discountType: "", discountValue: "", note: "",
  "lines.0.description": "Logo", "lines.0.quantity": "2", "lines.0.unitPrice": "50000",
};

afterEach(() => vi.restoreAllMocks());

describe("saveInvoice", () => {
  it("enregistre un brouillon avec totaux calculés côté serveur", async () => {
    const repo = fakeRepo();
    expect(await saveInvoice(repo, null, form, { issue: false, today })).toEqual({ ok: true, redirectTo: "/app/factures/inv1?ok=brouillon" });
    expect(repo.saveDraft).toHaveBeenCalledWith(
      null,
      {
        client_id: form.clientId, due_kind: "30", due_date: null, currency: "XOF", vat_rate: 18, discount_type: null,
        discount_value: null, note: null, subtotal: 100000, discount_amount: 0, vat_amount: 18000, total: 118000,
      },
      [{ position: 0, description: "Logo", quantity: 2, unit_price: 50000, line_total: 100000 }],
    );
    expect(repo.issue).not.toHaveBeenCalled();
  });

  it("émet : enregistre, copie le logo puis attribue le numéro", async () => {
    const repo = fakeRepo();
    expect(await saveInvoice(repo, "inv1", form, { issue: true, today })).toEqual({ ok: true, redirectTo: "/app/factures/inv1?ok=emise" });
    expect(repo.saveDraft).toHaveBeenCalledWith("inv1", expect.anything(), expect.anything());
    expect(repo.issue).toHaveBeenCalledWith("inv1", "u1/factures/inv1.webp");
  });

  it("refuse l’émission sans client, sans rien écrire", async () => {
    const repo = fakeRepo();
    const state = await saveInvoice(repo, null, { ...form, clientId: "" }, { issue: true, today });
    expect(state.fieldErrors?.clientId).toBe("Choisissez un client avant d’émettre la facture.");
    expect(repo.saveDraft).not.toHaveBeenCalled();
  });

  it("refuse une remise supérieure au total HT", async () => {
    const state = await saveInvoice(fakeRepo(), null, { ...form, discountType: "amount", discountValue: "200000" }, { issue: false, today });
    expect(state.fieldErrors?.discountValue).toBe("La remise ne peut pas dépasser le total HT.");
  });

  it("traduit un refus d’émission et ramène sur le brouillon créé", async () => {
    const repo = fakeRepo({ issue: vi.fn(async () => ({ error: { message: "client_archived" } })) });
    expect(await saveInvoice(repo, null, form, { issue: true, today })).toEqual({
      ok: false, message: "Ce client a été archivé. Choisissez-en un autre.", redirectTo: "/app/factures/inv1?erreur=client_archived",
    });
  });

  it("brouillon devenu non modifiable", async () => {
    const repo = fakeRepo({ saveDraft: vi.fn(async () => ({ error: { message: "not_editable" } })) });
    expect(await saveInvoice(repo, "inv1", form, { issue: false, today })).toEqual({ ok: false, message: "Cette facture a déjà été émise.", redirectTo: "/app/factures/inv1" });
  });

  it("erreur inattendue journalisée", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const repo = fakeRepo({ saveDraft: vi.fn(async () => ({ error: { message: "boom" } })) });
    expect(await saveInvoice(repo, null, form, { issue: false, today })).toEqual({ ok: false, message: GENERIC_ERROR });
    expect(log).toHaveBeenCalled();
  });
});

describe("transitions", () => {
  it("marque payée", async () => {
    const repo = fakeRepo();
    expect(await markInvoicePaid(repo, "inv1", { paidAt: today, method: "wave" }, today)).toEqual({ ok: true, redirectTo: "/app/factures/inv1?ok=payee" });
    expect(repo.markPaid).toHaveBeenCalledWith("inv1", today, "wave");
  });
  it("date de paiement refusée par la base", async () => {
    const repo = fakeRepo({ markPaid: vi.fn(async () => ({ error: { message: "paid_at_invalid" } })) });
    expect(await markInvoicePaid(repo, "inv1", { paidAt: today, method: "cash" }, today)).toEqual({
      ok: false, fieldErrors: { paidAt: "La date de paiement doit être entre la date d’émission et aujourd’hui." },
    });
  });
  it("annule le paiement, annule la facture, supprime le brouillon", async () => {
    expect(await unmarkInvoicePaid(fakeRepo(), "inv1")).toEqual({ ok: true, redirectTo: "/app/factures/inv1?ok=impayee" });
    expect(await cancelInvoice(fakeRepo(), "inv1")).toEqual({ ok: true, redirectTo: "/app/factures/inv1?ok=annulee" });
    expect(await deleteDraft(fakeRepo(), "inv1")).toEqual({ ok: true, redirectTo: "/app/factures?ok=supprime" });
  });
  it("action devenue impossible", async () => {
    const repo = fakeRepo({ cancel: vi.fn(async () => ({ error: { message: "not_issued" } })) });
    expect(await cancelInvoice(repo, "inv1")).toEqual({ ok: false, message: "Cette action n’est plus possible sur cette facture.", redirectTo: "/app/factures/inv1" });
  });
});
```

- [ ] **Step 2: Vérifier l’échec** — `npx vitest run src/lib/invoices.test.ts` → FAIL.

- [ ] **Step 3: Implémenter**

```ts
// src/lib/invoices.ts
import type { DbResult } from "@/lib/db";
import { GENERIC_ERROR, type FormState } from "@/lib/form-state";
import { computeTotals } from "@/lib/invoice-totals";
import type { DiscountType, DueKind, PaymentMethod } from "@/lib/invoice-types";
import { MAX_TOTAL } from "@/lib/money";
import type { Currency } from "@/lib/site";
import { parseInvoice, parseMarkPaid } from "@/lib/validation";

export type DraftPayload = {
  client_id: string | null;
  due_kind: DueKind;
  due_date: string | null;
  currency: Currency;
  vat_rate: number;
  discount_type: DiscountType | null;
  discount_value: number | null;
  note: string | null;
  subtotal: number;
  discount_amount: number;
  vat_amount: number;
  total: number;
};

export type LinePayload = { position: number; description: string; quantity: number; unit_price: number; line_total: number };

export interface InvoicesRepo {
  saveDraft(id: string | null, data: DraftPayload, lines: LinePayload[]): Promise<DbResult & { id?: string }>;
  copyLogo(invoiceId: string): Promise<string | null>;
  issue(id: string, logoPath: string | null): Promise<DbResult & { number?: string }>;
  markPaid(id: string, paidAt: string, method: PaymentMethod): Promise<DbResult>;
  unmarkPaid(id: string): Promise<DbResult>;
  cancel(id: string): Promise<DbResult>;
  deleteDraft(id: string): Promise<DbResult & { found: boolean }>;
}

export const INVOICE_FLASH: Record<string, string> = {
  brouillon: "Brouillon enregistré ✓",
  emise: "Facture {numero} émise ✓",
  payee: "Facture marquée comme payée ✓",
  impayee: "Paiement annulé.",
  annulee: "Facture annulée.",
  supprime: "Brouillon supprimé.",
};

const NOT_POSSIBLE = "Cette action n’est plus possible sur cette facture.";

export const INVOICE_ERRORS: Record<string, string> = {
  not_found: "Facture introuvable.",
  not_draft: "Cette facture a déjà été émise.",
  not_editable: "Cette facture a déjà été émise.",
  no_client: "Choisissez un client avant d’émettre la facture.",
  client_not_found: "Ce client n’existe plus. Choisissez-en un autre.",
  client_archived: "Ce client a été archivé. Choisissez-en un autre.",
  no_lines: "Ajoutez au moins une ligne.",
  due_date_past: "L’échéance ne peut pas être dans le passé.",
  not_issued: NOT_POSSIBLE,
  not_paid: NOT_POSSIBLE,
};

const PAID_AT_ERROR = "La date de paiement doit être entre la date d’émission et aujourd’hui.";

function known(error: { message: string }): string | undefined {
  return INVOICE_ERRORS[error.message];
}

function dbFail(where: string, error: { message: string }): FormState {
  console.error(`[factures] ${where} :`, error.message);
  return { ok: false, message: GENERIC_ERROR };
}

const detail = (id: string) => `/app/factures/${id}`;

export async function saveInvoice(
  repo: InvoicesRepo,
  id: string | null,
  raw: Record<string, unknown>,
  opts: { issue: boolean; today: string },
): Promise<FormState> {
  const parsed = parseInvoice(raw, opts.today);
  if (!parsed.success) return { ok: false, fieldErrors: parsed.fieldErrors };
  const input = parsed.data;
  if (opts.issue && !input.client_id) return { ok: false, fieldErrors: { clientId: INVOICE_ERRORS.no_client } };

  const totals = computeTotals(
    input.lines.map((l) => ({ quantity: l.quantity, unitPrice: l.unit_price })),
    input.discount,
    input.vat_rate,
  );
  if (input.discount?.type === "amount" && input.discount.value > totals.subtotal) {
    return { ok: false, fieldErrors: { discountValue: "La remise ne peut pas dépasser le total HT." } };
  }
  if (totals.total > MAX_TOTAL) return { ok: false, fieldErrors: { lines: "Montant total trop élevé." } };

  const data: DraftPayload = {
    client_id: input.client_id,
    due_kind: input.due_kind,
    due_date: input.due_date,
    currency: input.currency,
    vat_rate: input.vat_rate,
    discount_type: input.discount?.type ?? null,
    discount_value: input.discount?.value ?? null,
    note: input.note,
    subtotal: totals.subtotal,
    discount_amount: totals.discountAmount,
    vat_amount: totals.vatAmount,
    total: totals.total,
  };
  const lines: LinePayload[] = input.lines.map((l, position) => ({ position, ...l, line_total: totals.lineTotals[position] }));

  const saved = await repo.saveDraft(id, data, lines);
  if (saved.error) {
    const message = known(saved.error);
    if (!message) return dbFail("enregistrement", saved.error);
    if (saved.error.message === "client_not_found") return { ok: false, fieldErrors: { clientId: message } };
    return { ok: false, message, redirectTo: id ? detail(id) : undefined };
  }
  const invoiceId = saved.id ?? id;
  if (!invoiceId) return dbFail("enregistrement", { message: "identifiant manquant" });
  if (!opts.issue) return { ok: true, redirectTo: `${detail(invoiceId)}?ok=brouillon` };

  const logoPath = await repo.copyLogo(invoiceId);
  const issued = await repo.issue(invoiceId, logoPath);
  if (issued.error) {
    const message = known(issued.error);
    if (!message) {
      console.error("[factures] émission :", issued.error.message);
      return { ok: false, message: GENERIC_ERROR, redirectTo: `${detail(invoiceId)}?erreur=technique` };
    }
    return { ok: false, message, redirectTo: `${detail(invoiceId)}?erreur=${issued.error.message}` };
  }
  return { ok: true, redirectTo: `${detail(invoiceId)}?ok=emise` };
}

async function transition(result: Promise<DbResult>, id: string, flash: string, where: string): Promise<FormState> {
  const { error } = await result;
  if (error) {
    const message = known(error);
    if (!message) return dbFail(where, error);
    return { ok: false, message, redirectTo: detail(id) };
  }
  return { ok: true, redirectTo: `${detail(id)}?ok=${flash}` };
}

export async function markInvoicePaid(repo: InvoicesRepo, id: string, raw: Record<string, unknown>, today: string): Promise<FormState> {
  const parsed = parseMarkPaid(raw, today);
  if (!parsed.success) return { ok: false, fieldErrors: parsed.fieldErrors };
  const { error } = await repo.markPaid(id, parsed.data.paid_at, parsed.data.payment_method);
  if (error?.message === "paid_at_invalid") return { ok: false, fieldErrors: { paidAt: PAID_AT_ERROR } };
  if (error) return transition(Promise.resolve({ error }), id, "payee", "paiement");
  return { ok: true, redirectTo: `${detail(id)}?ok=payee` };
}

export function unmarkInvoicePaid(repo: InvoicesRepo, id: string): Promise<FormState> {
  return transition(repo.unmarkPaid(id), id, "impayee", "annulation du paiement");
}

export function cancelInvoice(repo: InvoicesRepo, id: string): Promise<FormState> {
  return transition(repo.cancel(id), id, "annulee", "annulation");
}

export async function deleteDraft(repo: InvoicesRepo, id: string): Promise<FormState> {
  const { error, found } = await repo.deleteDraft(id);
  if (error) return dbFail("suppression", error);
  if (!found) return { ok: false, message: NOT_POSSIBLE, redirectTo: detail(id) };
  return { ok: true, redirectTo: "/app/factures?ok=supprime" };
}
```

- [ ] **Step 4: Vérifier** — `npx vitest run src/lib/invoices.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/invoices.ts src/lib/invoices.test.ts
git commit -m "feat(factures): logique d'enregistrement, d'émission et des changements de statut"
```

---

### Task 8: Tableau de bord, WhatsApp et vue de facture (logique pure)

**Files:**
- Create: `src/lib/dashboard.ts`, `src/lib/invoice-view.ts`
- Modify: `src/lib/whatsapp.ts`, `src/lib/profile.ts`
- Test: `src/lib/dashboard.test.ts`, `src/lib/invoice-view.test.ts`, `src/lib/whatsapp.test.ts` (ajout)

**Interfaces:**
- Produces:
  - `profile.ts` : `Profile` gagne `wave_number`, `orange_money_number`, `iban`, `payment_note: string | null` et `default_due_days: 0 | 15 | 30`.
  - `dashboard.ts` : `type DashboardRow = { status: InvoiceStatus; total: number; currency: Currency; due_date: string | null; paid_at: string | null }`, `type Stat = { amount: number; count: number }`, `type MonthBar = { month: string; label: string; amount: number }`, `type DashboardStats = { collected: Stat; pending: Stat; overdue: Stat; months: MonthBar[]; otherCurrencies: Currency[] }`, `dashboardStats(rows: DashboardRow[], currency: Currency, today: string): DashboardStats`
  - `whatsapp.ts` : `invoiceWhatsappMessage(p: { clientName: string; number: string; total: string; dueDate: string | null; url: string; companyName: string }): string`, `invoiceWhatsappLink(phone: string | null, message: string): string`
  - `invoice-view.ts` : `type InvoiceView = { id: string; status: InvoiceStatus; number: string | null; issueDate: string | null; dueKind: DueKind; dueDate: string | null; currency: Currency; vatRate: number; discountType: DiscountType | null; discountValue: number | null; note: string | null; subtotal: number; discountAmount: number; vatAmount: number; total: number; lines: InvoiceLine[]; seller: SellerSnapshot; buyer: BuyerSnapshot | null; paidAt: string | null; paymentMethod: PaymentMethod | null; publicToken: string }`, `sellerFromProfile(p: Profile): SellerSnapshot`, `buildInvoiceView(inv: InvoiceRecord, lines: InvoiceLine[], live: { profile: Profile; client: BuyerSnapshot | null } | null): InvoiceView`

- [ ] **Step 1: Étendre `Profile`** dans `src/lib/profile.ts` (après `vat_rate: number;`) :

```ts
  wave_number: string | null;
  orange_money_number: string | null;
  iban: string | null;
  payment_note: string | null;
  default_due_days: 0 | 15 | 30;
```

Dans `getProfile` (`src/lib/repos.ts`), ajouter la conversion : `return { ...data, vat_rate: Number(data.vat_rate), default_due_days: Number(data.default_due_days ?? 30) } as Profile;`

Les fixtures de tests existantes qui construisent un `Profile` complet (rechercher `onboarded_at:` dans `src/lib/*.test.ts`) doivent recevoir ces 5 champs (`null` et `30`) pour que `npx tsc --noEmit` passe.

- [ ] **Step 2: Écrire les tests qui échouent**

```ts
// src/lib/dashboard.test.ts
import { describe, expect, it } from "vitest";
import { dashboardStats, type DashboardRow } from "@/lib/dashboard";

const r = (over: Partial<DashboardRow>): DashboardRow => ({ status: "issued", total: 1000, currency: "XOF", due_date: "2026-10-30", paid_at: null, ...over });

describe("dashboardStats", () => {
  const today = "2026-10-15";
  const rows: DashboardRow[] = [
    r({ status: "paid", total: 100000, paid_at: "2026-10-02" }),
    r({ status: "paid", total: 50000, paid_at: "2026-09-30" }),
    r({ status: "paid", total: 70000, paid_at: "2026-04-10" }), // hors des 6 mois
    r({ status: "issued", total: 30000, due_date: "2026-10-15" }), // échéance aujourd'hui : en attente
    r({ status: "issued", total: 20000, due_date: "2026-10-01" }), // en retard
    r({ status: "draft", total: 999 }),
    r({ status: "cancelled", total: 888 }),
    r({ status: "paid", total: 5000, currency: "EUR", paid_at: "2026-10-03" }),
  ];
  const s = dashboardStats(rows, "XOF", today);

  it("encaissé ce mois, en attente, en retard", () => {
    expect(s.collected).toEqual({ amount: 100000, count: 1 });
    expect(s.pending).toEqual({ amount: 30000, count: 1 });
    expect(s.overdue).toEqual({ amount: 20000, count: 1 });
  });
  it("6 derniers mois, mois courant inclus, mois vides à 0", () => {
    expect(s.months.map((m) => m.month)).toEqual(["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"]);
    expect(s.months.map((m) => m.amount)).toEqual([0, 0, 0, 0, 50000, 100000]);
    expect(s.months.map((m) => m.label)).toEqual(["mai", "juin", "juil.", "août", "sept.", "oct."]);
  });
  it("signale les autres devises exclues", () => {
    expect(s.otherCurrencies).toEqual(["EUR"]);
  });
  it("passage d’année", () => {
    expect(dashboardStats([], "XOF", "2026-02-10").months.map((m) => m.month)).toEqual(["2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02"]);
  });
});
```

```ts
// ajouter à src/lib/whatsapp.test.ts (importer invoiceWhatsappLink, invoiceWhatsappMessage)
describe("message de facture", () => {
  it("avec échéance", () => {
    expect(
      invoiceWhatsappMessage({ clientName: "Awa", number: "FAC-2026-0001", total: "150 000 FCFA", dueDate: "14/11/2026", url: "https://factoo.app/f/abc", companyName: "COSENDIGITAL" }),
    ).toBe("Bonjour Awa, voici votre facture FAC-2026-0001 de 150 000 FCFA, à régler avant le 14/11/2026. Consultez-la et téléchargez-la ici : https://factoo.app/f/abc. Merci, COSENDIGITAL");
  });
  it("à réception", () => {
    expect(invoiceWhatsappMessage({ clientName: "Awa", number: "FAC-2026-0001", total: "1 €", dueDate: null, url: "u", companyName: "X" })).toContain("à régler à réception.");
  });
  it("lien avec ou sans numéro", () => {
    expect(invoiceWhatsappLink("+221771234567", "a b")).toBe("https://wa.me/221771234567?text=a%20b");
    expect(invoiceWhatsappLink(null, "a b")).toBe("https://wa.me/?text=a%20b");
  });
});
```

```ts
// src/lib/invoice-view.test.ts
import { describe, expect, it } from "vitest";
import type { InvoiceRecord } from "@/lib/invoice-types";
import { buildInvoiceView, sellerFromProfile } from "@/lib/invoice-view";
import type { Profile } from "@/lib/profile";

const profile: Profile = {
  id: "u1", full_name: null, company_name: "COSENDIGITAL", address: "Rue 10", city: "Dakar", country: "SN", phone: "+221771234567",
  business_email: null, rccm: "SN-DKR-1", nif: "123", logo_path: "u1/logo-1.webp", currency: "XOF", vat_rate: 18,
  onboarded_at: "2026-10-15", wave_number: "+221770000000", orange_money_number: null, iban: null, payment_note: null, default_due_days: 30,
};
const record: InvoiceRecord = {
  id: "inv1", client_id: "c1", status: "draft", number: null, issue_date: null, due_kind: "30", due_date: null, currency: "XOF",
  vat_rate: 18, discount_type: null, discount_value: null, note: null, subtotal: 1000, discount_amount: 0, vat_amount: 180, total: 1180,
  seller: null, buyer: null, public_token: "tok", paid_at: null, payment_method: null, updated_at: "2026-10-15T10:00:00Z",
};
const client = { name: "Awa", phone: null, email: null, address: null, city: null, country: null, tax_id: null };

describe("buildInvoiceView", () => {
  it("brouillon : données vivantes du profil et du client", () => {
    const v = buildInvoiceView(record, [], { profile, client });
    expect(v.seller).toEqual(sellerFromProfile(profile));
    expect(v.seller.wave_number).toBe("+221770000000");
    expect(v.buyer).toEqual(client);
  });
  it("facture émise : uniquement l’instantané", () => {
    const seller = { ...sellerFromProfile(profile), company_name: "Ancien nom" };
    const v = buildInvoiceView({ ...record, status: "issued", number: "FAC-2026-0001", seller, buyer: client }, [], { profile, client: null });
    expect(v.seller.company_name).toBe("Ancien nom");
    expect(v.buyer).toEqual(client);
  });
});
```

- [ ] **Step 3: Vérifier l’échec** — `npx vitest run src/lib/dashboard.test.ts src/lib/whatsapp.test.ts src/lib/invoice-view.test.ts` → FAIL.

- [ ] **Step 4: Implémenter**

```ts
// src/lib/dashboard.ts
import { displayStatus } from "@/lib/invoice-status";
import type { InvoiceStatus } from "@/lib/invoice-types";
import type { Currency } from "@/lib/site";

export type DashboardRow = { status: InvoiceStatus; total: number; currency: Currency; due_date: string | null; paid_at: string | null };
export type Stat = { amount: number; count: number };
export type MonthBar = { month: string; label: string; amount: number };
export type DashboardStats = { collected: Stat; pending: Stat; overdue: Stat; months: MonthBar[]; otherCurrencies: Currency[] };

const MONTH_LABELS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

function lastMonths(today: string, count: number): string[] {
  const [y, m] = today.split("-").map(Number);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - (count - 1 - i), 1));
    return d.toISOString().slice(0, 7);
  });
}

const add = (s: Stat, amount: number) => {
  s.amount += amount;
  s.count += 1;
};

export function dashboardStats(rows: DashboardRow[], currency: Currency, today: string): DashboardStats {
  const collected = { amount: 0, count: 0 };
  const pending = { amount: 0, count: 0 };
  const overdue = { amount: 0, count: 0 };
  const months = lastMonths(today, 6).map((month) => ({ month, label: MONTH_LABELS[Number(month.slice(5)) - 1], amount: 0 }));
  const others = new Set<Currency>();
  const currentMonth = today.slice(0, 7);

  for (const row of rows) {
    if (row.status === "draft" || row.status === "cancelled") continue;
    if (row.currency !== currency) {
      others.add(row.currency);
      continue;
    }
    const status = displayStatus(row, today);
    if (status === "pending") add(pending, row.total);
    if (status === "overdue") add(overdue, row.total);
    if (status === "paid" && row.paid_at) {
      const month = row.paid_at.slice(0, 7);
      if (month === currentMonth) add(collected, row.total);
      const bar = months.find((b) => b.month === month);
      if (bar) bar.amount += row.total;
    }
  }
  return { collected, pending, overdue, months, otherCurrencies: [...others] };
}
```

Ajouter à `src/lib/whatsapp.ts` :

```ts
export function invoiceWhatsappMessage(p: {
  clientName: string;
  number: string;
  total: string;
  dueDate: string | null;
  url: string;
  companyName: string;
}): string {
  const due = p.dueDate ? `avant le ${p.dueDate}` : "à réception";
  return `Bonjour ${p.clientName}, voici votre facture ${p.number} de ${p.total}, à régler ${due}. Consultez-la et téléchargez-la ici : ${p.url}. Merci, ${p.companyName}`;
}

// Sans numéro, WhatsApp demande à l'utilisateur de choisir le contact.
export function invoiceWhatsappLink(phone: string | null, message: string): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
```

```ts
// src/lib/invoice-view.ts
import type {
  BuyerSnapshot, DiscountType, DueKind, InvoiceLine, InvoiceRecord, InvoiceStatus, PaymentMethod, SellerSnapshot,
} from "@/lib/invoice-types";
import type { Profile } from "@/lib/profile";
import type { Currency } from "@/lib/site";

export type InvoiceView = {
  id: string;
  status: InvoiceStatus;
  number: string | null;
  issueDate: string | null;
  dueKind: DueKind;
  dueDate: string | null;
  currency: Currency;
  vatRate: number;
  discountType: DiscountType | null;
  discountValue: number | null;
  note: string | null;
  subtotal: number;
  discountAmount: number;
  vatAmount: number;
  total: number;
  lines: InvoiceLine[];
  seller: SellerSnapshot;
  buyer: BuyerSnapshot | null;
  paidAt: string | null;
  paymentMethod: PaymentMethod | null;
  publicToken: string;
};

// Même liste de champs que l'instantané construit par issue_invoice() (005_invoices.sql).
export function sellerFromProfile(p: Profile): SellerSnapshot {
  return {
    company_name: p.company_name, address: p.address, city: p.city, country: p.country, phone: p.phone,
    business_email: p.business_email, rccm: p.rccm, nif: p.nif, logo_path: p.logo_path, wave_number: p.wave_number,
    orange_money_number: p.orange_money_number, iban: p.iban, payment_note: p.payment_note,
  };
}

export function buildInvoiceView(
  inv: InvoiceRecord,
  lines: InvoiceLine[],
  live: { profile: Profile; client: BuyerSnapshot | null } | null,
): InvoiceView {
  const frozen = inv.status !== "draft" && inv.seller !== null;
  const seller = frozen ? (inv.seller as SellerSnapshot) : live ? sellerFromProfile(live.profile) : (inv.seller as SellerSnapshot);
  const buyer = frozen ? inv.buyer : (live?.client ?? null);
  return {
    id: inv.id, status: inv.status, number: inv.number, issueDate: inv.issue_date, dueKind: inv.due_kind, dueDate: inv.due_date,
    currency: inv.currency, vatRate: inv.vat_rate, discountType: inv.discount_type, discountValue: inv.discount_value,
    note: inv.note, subtotal: inv.subtotal, discountAmount: inv.discount_amount, vatAmount: inv.vat_amount, total: inv.total,
    lines: [...lines].sort((a, b) => a.position - b.position), seller, buyer, paidAt: inv.paid_at,
    paymentMethod: inv.payment_method, publicToken: inv.public_token,
  };
}
```

- [ ] **Step 5: Vérifier** — `npm test` → PASS ; `npx tsc --noEmit` → aucune erreur.

- [ ] **Step 6: Commit**

```bash
git add src/lib
git commit -m "feat(factures): agrégats du tableau de bord, message WhatsApp et vue de facture"
```

---

### Task 9: Accès aux données (repos)

**Files:**
- Modify: `src/lib/repos.ts`, `src/lib/clients.ts` (création qui renvoie l’id)
- Test: `src/lib/clients.test.ts` (ajout)

**Interfaces:**
- Consumes: `InvoicesRepo`, `DraftPayload`, `LinePayload` (Task 7) ; types (Task 2) ; `ListRow` (Task 5) ; `DashboardRow` (Task 8).
- Produces:
  - `invoicesRepo(supabase, userId: string, logoPath: string | null): InvoicesRepo`
  - `listInvoiceRows(supabase): Promise<ListRow[]>`
  - `getInvoice(supabase, id: string): Promise<{ record: InvoiceRecord; lines: InvoiceLine[]; client: (BuyerSnapshot & { id: string }) | null } | null>`
  - `getPublicInvoice(token: string): Promise<{ record: InvoiceRecord; lines: InvoiceLine[] } | null>` (client admin)
  - `dashboardRows(supabase): Promise<(DashboardRow & { id: string; number: string | null; updated_at: string; client_name: string | null; issued_at: string | null })[]>`
  - `listClientOptions(supabase): Promise<{ id: string; name: string; phone: string | null }[]>`
  - `clients.ts` : `ClientsRepo.create` renvoie `Promise<DbResult & { id?: string }>` ; `quickCreateClient(repo: ClientsRepo, raw): Promise<{ ok: true; client: { id: string; name: string } } | { ok: false; fieldErrors?: Partial<Record<ClientField, string>>; message?: string }>`

- [ ] **Step 1: Test qui échoue** (ajouter à `src/lib/clients.test.ts`, importer `quickCreateClient`)

```ts
describe("quickCreateClient", () => {
  it("crée et renvoie le client pour le sélectionner", async () => {
    const repo = fakeRepo({ create: vi.fn(async () => ({ error: null, id: "c9" })) });
    expect(await quickCreateClient(repo, { ...form, name: "Awa" })).toEqual({ ok: true, client: { id: "c9", name: "Awa" } });
  });
  it("erreurs de champ", async () => {
    expect(await quickCreateClient(fakeRepo(), { ...form, name: "" })).toEqual({ ok: false, fieldErrors: { name: "Le nom est obligatoire" } });
  });
});
```

- [ ] **Step 2: Vérifier l’échec** — `npx vitest run src/lib/clients.test.ts` → FAIL.

- [ ] **Step 3: Implémenter dans `clients.ts`**

Remplacer dans l’interface : `create(row: ClientInput): Promise<DbResult & { id?: string }>;` puis ajouter :

```ts
export async function quickCreateClient(
  repo: ClientsRepo,
  raw: Record<string, unknown>,
): Promise<{ ok: true; client: { id: string; name: string } } | { ok: false; fieldErrors?: Partial<Record<ClientField, string>>; message?: string }> {
  const parsed = parseClient(raw);
  if (!parsed.success) return { ok: false, fieldErrors: parsed.fieldErrors };
  const { error, id } = await repo.create(parsed.data);
  if (error || !id) {
    console.error("[clients] création rapide :", error?.message ?? "identifiant manquant");
    return { ok: false, message: GENERIC_ERROR };
  }
  return { ok: true, client: { id, name: parsed.data.name } };
}
```

- [ ] **Step 4: Implémenter dans `repos.ts`**

Remplacer `create` de `clientsRepo` :

```ts
    async create(row) {
      const { data, error } = await supabase.from("clients").insert({ ...row, user_id: userId }).select("id").single();
      return { error, id: data?.id };
    },
```

Ajouter (imports : `getSupabaseAdmin` depuis `@/lib/supabase/admin`, types depuis `@/lib/invoice-types`, `InvoicesRepo` depuis `@/lib/invoices`, `ListRow` depuis `@/lib/invoice-list`, `DashboardRow` depuis `@/lib/dashboard`) :

```ts
const INVOICE_COLUMNS =
  "id,client_id,status,number,issue_date,due_kind,due_date,currency,vat_rate,discount_type,discount_value,note,subtotal,discount_amount,vat_amount,total,seller,buyer,public_token,paid_at,payment_method,updated_at";
const LINE_COLUMNS = "position,description,quantity,unit_price,line_total";

// PostgREST renvoie numeric en chaîne : on normalise une fois ici.
function toRecord(row: Record<string, unknown>): InvoiceRecord {
  return {
    ...(row as unknown as InvoiceRecord),
    vat_rate: Number(row.vat_rate),
    discount_value: row.discount_value === null ? null : Number(row.discount_value),
    subtotal: Number(row.subtotal),
    discount_amount: Number(row.discount_amount),
    vat_amount: Number(row.vat_amount),
    total: Number(row.total),
  };
}

const toLines = (rows: Record<string, unknown>[] | null): InvoiceLine[] =>
  (rows ?? []).map((l) => ({
    position: Number(l.position),
    description: String(l.description),
    quantity: Number(l.quantity),
    unit_price: Number(l.unit_price),
    line_total: Number(l.line_total),
  }));

export function invoicesRepo(supabase: SupabaseClient, userId: string, logoPath: string | null): InvoicesRepo {
  const rpc = async (fn: string, args: Record<string, unknown>) => {
    const { data, error } = await supabase.rpc(fn, args);
    return { data, error: error ? { code: error.code, message: error.message } : null };
  };
  return {
    async saveDraft(id, data, lines) {
      const r = await rpc("save_invoice_draft", { p_id: id, p_data: data, p_lines: lines });
      return { error: r.error, id: (r.data as string | null) ?? undefined };
    },
    async copyLogo(invoiceId) {
      if (!logoPath) return null;
      const target = `${userId}/factures/${invoiceId}.webp`;
      await supabase.storage.from("logos").remove([target]);
      const { error } = await supabase.storage.from("logos").copy(logoPath, target);
      if (error) {
        console.error("[factures] copie du logo :", error.message);
        return null;
      }
      return target;
    },
    async issue(id, path) {
      const r = await rpc("issue_invoice", { p_id: id, p_logo_path: path });
      return { error: r.error, number: (r.data as string | null) ?? undefined };
    },
    markPaid: (id, paidAt, method) => rpc("mark_invoice_paid", { p_id: id, p_paid_at: paidAt, p_method: method }),
    unmarkPaid: (id) => rpc("unmark_invoice_paid", { p_id: id }),
    cancel: (id) => rpc("cancel_invoice", { p_id: id }),
    async deleteDraft(id) {
      const { data, error } = await supabase.from("invoices").delete().eq("id", id).eq("status", "draft").select("id");
      return { error, found: (data?.length ?? 0) > 0 };
    },
  };
}

type RowWithClient = Record<string, unknown> & { buyer: { name?: string } | null; clients: { name: string } | null };

export async function listInvoiceRows(supabase: SupabaseClient): Promise<ListRow[]> {
  const { data, error } = await supabase
    .from("invoices")
    .select("id,number,status,due_date,total,currency,updated_at,issued_at,paid_at,buyer,clients(name)")
    .limit(2000);
  if (error) throw new Error(`[factures] liste impossible : ${error.message}`);
  return ((data ?? []) as unknown as RowWithClient[]).map((r) => ({
    id: String(r.id),
    number: (r.number as string | null) ?? null,
    status: r.status as ListRow["status"],
    due_date: (r.due_date as string | null) ?? null,
    total: Number(r.total),
    currency: r.currency as ListRow["currency"],
    updated_at: String(r.updated_at),
    issued_at: (r.issued_at as string | null) ?? null,
    client_name: r.buyer?.name ?? r.clients?.name ?? null,
  }));
}

export async function dashboardRows(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("invoices")
    .select("id,number,status,due_date,total,currency,updated_at,issued_at,paid_at,buyer,clients(name)")
    .limit(5000);
  if (error) throw new Error(`[factures] tableau de bord impossible : ${error.message}`);
  return ((data ?? []) as unknown as RowWithClient[]).map((r) => ({
    id: String(r.id),
    number: (r.number as string | null) ?? null,
    status: r.status as DashboardRow["status"],
    due_date: (r.due_date as string | null) ?? null,
    paid_at: (r.paid_at as string | null) ?? null,
    total: Number(r.total),
    currency: r.currency as DashboardRow["currency"],
    updated_at: String(r.updated_at),
    issued_at: (r.issued_at as string | null) ?? null,
    client_name: r.buyer?.name ?? r.clients?.name ?? null,
  }));
}

export async function getInvoice(supabase: SupabaseClient, id: string) {
  const { data } = await supabase
    .from("invoices")
    .select(`${INVOICE_COLUMNS},invoice_lines(${LINE_COLUMNS}),clients(id,name,phone,email,address,city,country,tax_id)`)
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const row = data as Record<string, unknown>;
  return {
    record: toRecord(row),
    lines: toLines(row.invoice_lines as Record<string, unknown>[]),
    client: (row.clients as (BuyerSnapshot & { id: string }) | null) ?? null,
  };
}

// Page publique : client service_role, filtre strict sur le jeton, jamais de brouillon.
export async function getPublicInvoice(token: string) {
  if (!/^[A-Za-z0-9_-]{20,40}$/.test(token)) return null;
  const { data } = await getSupabaseAdmin()
    .from("invoices")
    .select(`${INVOICE_COLUMNS},invoice_lines(${LINE_COLUMNS})`)
    .eq("public_token", token)
    .neq("status", "draft")
    .maybeSingle();
  if (!data) return null;
  const row = data as Record<string, unknown>;
  return { record: toRecord(row), lines: toLines(row.invoice_lines as Record<string, unknown>[]) };
}

export async function listClientOptions(supabase: SupabaseClient) {
  const { data, error } = await supabase.from("clients").select("id,name,phone").is("archived_at", null).order("name");
  if (error) throw new Error(`[clients] liste impossible : ${error.message}`);
  return (data ?? []) as { id: string; name: string; phone: string | null }[];
}
```

Note : `INVOICE_COLUMNS` contient `client_id` et `public_token` ; la page publique ne doit **jamais** rendre `client_id` ni `id` (le composant de vue n’affiche que les champs de `InvoiceView` utiles ; ne pas sérialiser la vue entière vers un composant client sur la page publique).

- [ ] **Step 5: Vérifier** — `npm test` → PASS ; `npx tsc --noEmit` → aucune erreur.

- [ ] **Step 6: Commit**

```bash
git add src/lib/repos.ts src/lib/clients.ts src/lib/clients.test.ts
git commit -m "feat(factures): accès aux données des factures et création rapide de client"
```

---

### Task 10: Paramètres — paiement et échéance par défaut

**Files:**
- Modify: `src/lib/settings.ts`, `src/app/app/(main)/parametres/actions.ts`, `src/app/app/(main)/parametres/page.tsx`, `src/components/app/BillingForm.tsx`
- Create: `src/components/app/PaymentForm.tsx`
- Test: `src/lib/settings.test.ts` (ajout)

**Interfaces:**
- Consumes: `parsePayment`, `PaymentInput`, `BillingInput` (Task 6).
- Produces: `savePayment(repo: ProfileRepo, raw): Promise<FormState<PaymentField>>`, `savePaymentAction(prev, formData)`, `ProfilePatch` inclut `PaymentInput` et `default_due_days`.

- [ ] **Step 1: Test qui échoue** (ajouter à `src/lib/settings.test.ts`, en réutilisant la fabrique de repo simulé du fichier et en important `savePayment`)

```ts
describe("savePayment", () => {
  it("enregistre les coordonnées de paiement", async () => {
    const repo = fakeRepo();
    expect(await savePayment(repo, { waveCountryCode: "221", wavePhone: "771234567", omCountryCode: "221", omPhone: "", iban: "", paymentNote: "Virement sous 30 jours" })).toEqual({ ok: true, message: "Enregistré ✓" });
    expect(repo.update).toHaveBeenCalledWith({ wave_number: "+221771234567", orange_money_number: null, iban: null, payment_note: "Virement sous 30 jours" });
  });
  it("erreurs de champ sans écriture", async () => {
    const repo = fakeRepo();
    const state = await savePayment(repo, { waveCountryCode: "221", wavePhone: "12", omCountryCode: "221", omPhone: "", iban: "", paymentNote: "" });
    expect(state.fieldErrors?.wavePhone).toBe("Numéro invalide : 8 à 10 chiffres");
    expect(repo.update).not.toHaveBeenCalled();
  });
});
```

(Si la fabrique du fichier porte un autre nom que `fakeRepo`, utiliser celle existante.)

- [ ] **Step 2: Vérifier l’échec** — `npx vitest run src/lib/settings.test.ts` → FAIL.

- [ ] **Step 3: Implémenter `savePayment`** dans `settings.ts`

Modifier le type : `export type ProfilePatch = Partial<CompanyInput & BillingInput & PaymentInput & { logo_path: string | null; onboarded_at: string }>;` (importer `parsePayment, type PaymentField, type PaymentInput`). Ajouter :

```ts
export async function savePayment(repo: ProfileRepo, raw: Raw): Promise<FormState<PaymentField>> {
  const parsed = parsePayment(raw);
  if (!parsed.success) return { ok: false, fieldErrors: parsed.fieldErrors };
  const { error } = await repo.update(parsed.data);
  if (error) return dbFail("paiement", error);
  return { ok: true, message: SAVED };
}
```

- [ ] **Step 4: Action** — ajouter dans `parametres/actions.ts` (importer `savePayment`) :

```ts
export async function savePaymentAction(_prev: FormState, formData: FormData) {
  return withProfile(({ supabase, user }) => savePayment(profileRepo(supabase, user.id), entries(formData)));
}
```

- [ ] **Step 5: `PaymentForm`**

```tsx
// src/components/app/PaymentForm.tsx
"use client";

import { useActionState } from "react";
import { savePaymentAction } from "@/app/app/(main)/parametres/actions";
import { Field, FormMessage, inputClass } from "@/components/forms/Field";
import { PhoneFields } from "@/components/forms/PhoneFields";
import { SubmitButton } from "@/components/forms/SubmitButton";
import type { FormState } from "@/lib/form-state";
import { useFormValues } from "@/lib/use-form-values";

type Values = {
  waveCountryCode: string;
  wavePhone: string;
  omCountryCode: string;
  omPhone: string;
  iban: string;
  paymentNote: string;
};

export function PaymentForm({ initial }: { initial: Values }) {
  const [state, action] = useActionState(savePaymentAction, {} as FormState);
  const { bind } = useFormValues(initial);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} noValidate className="grid gap-5">
      <FormMessage state={state} />
      <PhoneFields id="wavePhone" label="Numéro Wave" optional code={bind("waveCountryCode")} phone={bind("wavePhone")} codeError={errors.waveCountryCode} phoneError={errors.wavePhone} />
      <PhoneFields id="omPhone" label="Numéro Orange Money" optional code={bind("omCountryCode")} phone={bind("omPhone")} codeError={errors.omCountryCode} phoneError={errors.omPhone} />
      <Field id="iban" label="IBAN" optional error={errors.iban}>
        <input id="iban" autoComplete="off" aria-invalid={Boolean(errors.iban)} aria-describedby="iban-msg" className={inputClass} {...bind("iban")} />
      </Field>
      <Field id="paymentNote" label="Autres instructions" optional hint="Ex. « Paiement à 30 jours par virement »." error={errors.paymentNote}>
        <textarea id="paymentNote" rows={3} maxLength={300} aria-describedby="paymentNote-msg" className={`${inputClass} h-auto py-3`} {...bind("paymentNote")} />
      </Field>
      <SubmitButton className="sm:justify-self-end">Enregistrer</SubmitButton>
    </form>
  );
}
```

`PhoneFields` affiche l’aide « Numéro WhatsApp de préférence » : acceptable ici (le numéro Wave est souvent le même).

- [ ] **Step 6: `BillingForm` — échéance par défaut**

Changer la signature en `initial: { currency: string; vatRate: string; dueDays: string }` et ajouter dans la grille, après le champ TVA :

```tsx
        <Field id="dueDays" label="Échéance par défaut" error={errors.dueDays}>
          <select id="dueDays" aria-describedby="dueDays-msg" className={inputClass} {...bind("dueDays")}>
            <option value="0">À réception</option>
            <option value="15">15 jours</option>
            <option value="30">30 jours</option>
          </select>
        </Field>
```

- [ ] **Step 7: Page Paramètres**

Dans `parametres/page.tsx` : passer `dueDays: String(profile.default_due_days)` à `BillingForm`, et ajouter après la section « Facturation » :

```tsx
      <Section title="Paiement" description="Affiché sur vos factures pour que vos clients sachent comment vous régler.">
        <PaymentForm
          initial={{
            waveCountryCode: splitPhone(profile.wave_number, dial).countryCode,
            wavePhone: splitPhone(profile.wave_number, dial).phone,
            omCountryCode: splitPhone(profile.orange_money_number, dial).countryCode,
            omPhone: splitPhone(profile.orange_money_number, dial).phone,
            iban: profile.iban ?? "",
            paymentNote: profile.payment_note ?? "",
          }}
        />
      </Section>
```

- [ ] **Step 8: Vérifier** — `npm test`, `npx tsc --noEmit`, `npm run lint` → OK.

- [ ] **Step 9: Commit**

```bash
git add src/lib/settings.ts src/lib/settings.test.ts src/components/app/PaymentForm.tsx src/components/app/BillingForm.tsx "src/app/app/(main)/parametres"
git commit -m "feat(parametres): coordonnées de paiement et échéance par défaut"
```

---

### Task 11: Formulaire de facture, création et brouillon

**Files:**
- Create: `src/app/app/(main)/factures/actions.ts`, `src/app/app/(main)/factures/nouvelle/page.tsx`, `src/components/app/InvoiceForm.tsx`, `src/components/app/InvoiceLines.tsx`, `src/components/app/ClientPicker.tsx`, `src/components/app/InvoiceTotals.tsx`
- Modify: `src/app/app/(main)/clients/actions.ts` (création rapide)

**Interfaces:**
- Consumes: `saveInvoice`, `deleteDraft`, `markInvoicePaid`, `unmarkInvoicePaid`, `cancelInvoice` (Task 7) ; `invoicesRepo`, `listClientOptions` (Task 9) ; `computeTotals` (Task 4) ; `parseAmount`, `formatMoney`, `minorToInput` (Task 2) ; `todayInDakar` (Task 5).
- Produces:
  - Actions : `saveInvoiceAction(id: string | null, prev: FormState, formData: FormData): Promise<FormState>` (lit `formData.get("intent")` : `"draft"` ou `"issue"`), `deleteDraftAction(id: string): Promise<FormState>`, `markPaidAction(id: string, prev: FormState, formData: FormData)`, `unmarkPaidAction(id: string)`, `cancelInvoiceAction(id: string)`
  - `quickCreateClientAction(formData: FormData)` (dans `clients/actions.ts`)
  - `type InvoiceFormValues = { clientId: string; dueKind: DueKind; dueDate: string; currency: Currency; vatRate: string; discountType: "" | DiscountType; discountValue: string; note: string; lines: { key: string; description: string; quantity: string; unitPrice: string }[] }`
  - `<InvoiceForm invoiceId={string | null} initial={InvoiceFormValues} clients={{ id; name; phone }[]} today={string} />`

- [ ] **Step 1: Actions**

```ts
// src/app/app/(main)/factures/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/lib/form-state";
import { todayInDakar } from "@/lib/invoice-status";
import { cancelInvoice, deleteDraft, markInvoicePaid, saveInvoice, unmarkInvoicePaid } from "@/lib/invoices";
import { invoicesRepo } from "@/lib/repos";
import { getSession } from "@/lib/session";

async function repo() {
  const { supabase, user, profile } = await getSession();
  return invoicesRepo(supabase, user.id, profile.logo_path);
}

function finish(result: FormState): FormState {
  revalidatePath("/app", "layout");
  if (result.redirectTo) redirect(result.redirectTo);
  return result;
}

export async function saveInvoiceAction(id: string | null, _prev: FormState, formData: FormData): Promise<FormState> {
  const issue = formData.get("intent") === "issue";
  return finish(await saveInvoice(await repo(), id, Object.fromEntries(formData), { issue, today: todayInDakar() }));
}

export async function deleteDraftAction(id: string): Promise<FormState> {
  return finish(await deleteDraft(await repo(), id));
}

export async function markPaidAction(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  return finish(await markInvoicePaid(await repo(), id, Object.fromEntries(formData), todayInDakar()));
}

export async function unmarkPaidAction(id: string): Promise<FormState> {
  return finish(await unmarkInvoicePaid(await repo(), id));
}

export async function cancelInvoiceAction(id: string): Promise<FormState> {
  return finish(await cancelInvoice(await repo(), id));
}
```

Ajouter à `src/app/app/(main)/clients/actions.ts` (importer `quickCreateClient`) :

```ts
export async function quickCreateClientAction(formData: FormData) {
  const { supabase, user } = await requireUser();
  return quickCreateClient(clientsRepo(supabase, user.id), Object.fromEntries(formData));
}
```

- [ ] **Step 2: `ClientPicker`** — sélecteur natif (la saisie au clavier y fait la recherche sur ordinateur ; liste native sur mobile) + fenêtre « Nouveau client »

```tsx
// src/components/app/ClientPicker.tsx
"use client";

import { Plus } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { quickCreateClientAction } from "@/app/app/(main)/clients/actions";
import { Field, inputClass } from "@/components/forms/Field";
import { PhoneFields } from "@/components/forms/PhoneFields";
import { buttonClass } from "@/components/ui/button";

type Option = { id: string; name: string; phone: string | null };

type Props = {
  value: string;
  onChange: (id: string) => void;
  clients: Option[];
  error?: string;
  defaultDial: string;
};

export function ClientPicker({ value, onChange, clients, error, defaultDial }: Props) {
  const [options, setOptions] = useState(clients);
  const dialog = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState({ name: "", countryCode: defaultDial, phone: "" });
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [pending, start] = useTransition();

  const create = () =>
    start(async () => {
      const fd = new FormData();
      Object.entries(draft).forEach(([k, v]) => fd.set(k, v));
      const result = await quickCreateClientAction(fd);
      if (!result.ok) {
        setErrors({ ...(result.fieldErrors ?? {}), form: result.message });
        return;
      }
      setOptions((list) => [...list, { ...result.client, phone: null }].sort((a, b) => a.name.localeCompare(b.name, "fr")));
      onChange(result.client.id);
      setDraft({ name: "", countryCode: defaultDial, phone: "" });
      setErrors({});
      dialog.current?.close();
    });

  return (
    <div>
      <Field id="clientId" label="Client" error={error}>
        <div className="flex gap-2">
          <select
            id="clientId"
            name="clientId"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby="clientId-msg"
            className={inputClass}
          >
            <option value="">Choisir un client…</option>
            {options.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => dialog.current?.showModal()} className={buttonClass("outline", "md", "shrink-0 px-4")} aria-label="Nouveau client">
            <Plus className="h-5 w-5" aria-hidden="true" />
            <span className="hidden sm:inline">Nouveau</span>
          </button>
        </div>
      </Field>

      <dialog ref={dialog} className="w-[min(28rem,calc(100vw-2rem))] rounded-2xl p-0 backdrop:bg-black/40">
        <div className="grid gap-4 p-5">
          <h2 className="text-lg font-bold">Nouveau client</h2>
          {errors.form && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{errors.form}</p>}
          <Field id="quickName" label="Nom ou raison sociale" error={errors.name}>
            <input id="quickName" aria-describedby="quickName-msg" className={inputClass} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </Field>
          <PhoneFields
            id="quickPhone"
            optional
            code={{ name: "countryCode", value: draft.countryCode, onChange: (e) => setDraft({ ...draft, countryCode: e.target.value }) }}
            phone={{ name: "phone", value: draft.phone, onChange: (e) => setDraft({ ...draft, phone: e.target.value }) }}
            codeError={errors.countryCode}
            phoneError={errors.phone}
          />
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => dialog.current?.close()} className={buttonClass("outline", "md")}>Annuler</button>
            <button type="button" onClick={create} disabled={pending} className={buttonClass("brand", "md")}>
              {pending ? "Création…" : "Ajouter"}
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
```

Le `<dialog>` est hors du `<form>` de la facture ? Non : `ClientPicker` est rendu dans le formulaire ; les champs de la fenêtre n’ont **pas** d’attribut `name` lié au formulaire de facture sauf `countryCode`/`phone` passés par `PhoneFields`. Pour éviter qu’ils soient envoyés avec la facture, `PhoneFields` reçoit des `name` (`countryCode`, `phone`) qui ne sont pas lus par `parseInvoice` : sans effet. Les boutons de la fenêtre sont `type="button"` : aucun envoi du formulaire.

- [ ] **Step 3: `InvoiceLines` et `InvoiceTotals`**

```tsx
// src/components/app/InvoiceLines.tsx
"use client";

import { Plus, Trash2 } from "lucide-react";
import { inputClass } from "@/components/forms/Field";
import { cn } from "@/lib/cn";

export type LineValues = { key: string; description: string; quantity: string; unitPrice: string };

type Props = {
  lines: LineValues[];
  onChange: (lines: LineValues[]) => void;
  errors: Record<string, string | undefined>;
  priceLabel: string;
};

export function newLine(): LineValues {
  return { key: crypto.randomUUID(), description: "", quantity: "1", unitPrice: "" };
}

export function InvoiceLines({ lines, onChange, errors, priceLabel }: Props) {
  const update = (index: number, patch: Partial<LineValues>) =>
    onChange(lines.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  const remove = (index: number) => onChange(lines.length === 1 ? [newLine()] : lines.filter((_, i) => i !== index));

  return (
    <fieldset className="grid gap-3">
      <legend className="mb-1.5 text-sm font-semibold text-slate-700">Lignes</legend>
      <div className="hidden grid-cols-[1fr_6rem_9rem_2.5rem] gap-2 px-1 text-xs font-semibold uppercase text-slate-500 md:grid">
        <span>Désignation</span><span>Qté</span><span>{priceLabel}</span><span />
      </div>
      {lines.map((line, i) => {
        const err = (f: string) => errors[`lines.${i}.${f}`];
        return (
          <div key={line.key} className="grid gap-2 rounded-xl border border-slate-200 p-3 md:grid-cols-[1fr_6rem_9rem_2.5rem] md:border-0 md:p-0">
            <div>
              <label className="text-xs font-semibold text-slate-500 md:sr-only" htmlFor={`d-${line.key}`}>Désignation</label>
              <input id={`d-${line.key}`} name={`lines.${i}.description`} value={line.description} maxLength={300}
                onChange={(e) => update(i, { description: e.target.value })} aria-invalid={Boolean(err("description"))}
                className={inputClass} placeholder="Ex. Création de logo" />
              {err("description") && <p className="mt-1 text-sm text-red-600">{err("description")}</p>}
            </div>
            <div className="grid grid-cols-[1fr_1fr_auto] gap-2 md:contents">
              <div>
                <label className="text-xs font-semibold text-slate-500 md:sr-only" htmlFor={`q-${line.key}`}>Quantité</label>
                <input id={`q-${line.key}`} name={`lines.${i}.quantity`} inputMode="decimal" value={line.quantity}
                  onChange={(e) => update(i, { quantity: e.target.value })} aria-invalid={Boolean(err("quantity"))} className={inputClass} />
                {err("quantity") && <p className="mt-1 text-sm text-red-600">{err("quantity")}</p>}
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 md:sr-only" htmlFor={`p-${line.key}`}>{priceLabel}</label>
                <input id={`p-${line.key}`} name={`lines.${i}.unitPrice`} inputMode="decimal" value={line.unitPrice}
                  onChange={(e) => update(i, { unitPrice: e.target.value })} aria-invalid={Boolean(err("unitPrice"))} className={inputClass} />
                {err("unitPrice") && <p className="mt-1 text-sm text-red-600">{err("unitPrice")}</p>}
              </div>
              <button type="button" onClick={() => remove(i)} aria-label={`Supprimer la ligne ${i + 1}`}
                className={cn("mt-5 flex h-12 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600 md:mt-0")}>
                <Trash2 className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        );
      })}
      {errors.lines && <p className="text-sm text-red-600">{errors.lines}</p>}
      {lines.length < 50 && (
        <button type="button" onClick={() => onChange([...lines, newLine()])} className="flex items-center gap-2 justify-self-start rounded-full px-3 py-2 text-sm font-semibold text-[#0F766E] hover:bg-teal-50">
          <Plus className="h-4 w-4" aria-hidden="true" /> Ajouter une ligne
        </button>
      )}
    </fieldset>
  );
}
```

```tsx
// src/components/app/InvoiceTotals.tsx
import type { Totals } from "@/lib/invoice-totals";
import { formatMoney } from "@/lib/money";
import type { Currency } from "@/lib/site";

export function InvoiceTotals({ totals, currency, vatRate, discountLabel }: { totals: Totals; currency: Currency; vatRate: number; discountLabel: string | null }) {
  const row = "flex justify-between gap-4 py-1";
  return (
    <dl className="ml-auto grid w-full max-w-sm text-sm">
      <div className={row}><dt className="text-slate-500">Total HT</dt><dd>{formatMoney(totals.subtotal, currency)}</dd></div>
      {totals.discountAmount > 0 && (
        <>
          <div className={row}><dt className="text-slate-500">Remise{discountLabel ? ` (${discountLabel})` : ""}</dt><dd>-{formatMoney(totals.discountAmount, currency)}</dd></div>
          <div className={row}><dt className="text-slate-500">Total HT après remise</dt><dd>{formatMoney(totals.net, currency)}</dd></div>
        </>
      )}
      <div className={row}>
        <dt className="text-slate-500">{vatRate === 0 ? "TVA non applicable" : `TVA (${String(vatRate).replace(".", ",")} %)`}</dt>
        <dd>{vatRate === 0 ? "—" : formatMoney(totals.vatAmount, currency)}</dd>
      </div>
      <div className={`${row} mt-1 border-t border-slate-200 pt-2 text-base font-extrabold`}><dt>Total TTC</dt><dd>{formatMoney(totals.total, currency)}</dd></div>
    </dl>
  );
}
```

- [ ] **Step 4: `InvoiceForm`**

```tsx
// src/components/app/InvoiceForm.tsx
"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { saveInvoiceAction } from "@/app/app/(main)/factures/actions";
import { ClientPicker } from "@/components/app/ClientPicker";
import { InvoiceLines, type LineValues } from "@/components/app/InvoiceLines";
import { InvoiceTotals } from "@/components/app/InvoiceTotals";
import { Field, FormMessage, inputClass } from "@/components/forms/Field";
import { buttonClass } from "@/components/ui/button";
import type { FormState } from "@/lib/form-state";
import { computeTotals } from "@/lib/invoice-totals";
import { DUE_KIND_LABELS, DUE_KINDS, type DiscountType, type DueKind } from "@/lib/invoice-types";
import { parseAmount } from "@/lib/money";
import { CURRENCIES, CURRENCY_LABELS, type Currency } from "@/lib/site";

export type InvoiceFormValues = {
  clientId: string;
  dueKind: DueKind;
  dueDate: string;
  currency: Currency;
  vatRate: string;
  discountType: "" | DiscountType;
  discountValue: string;
  note: string;
  lines: LineValues[];
};

type Props = {
  invoiceId: string | null;
  initial: InvoiceFormValues;
  clients: { id: string; name: string; phone: string | null }[];
  today: string;
  defaultDial: string;
};

const num = (s: string) => Number(s.replace(/\s/g, "").replace(",", "."));

export function InvoiceForm({ invoiceId, initial, clients, today, defaultDial }: Props) {
  const [state, action, pending] = useActionState(saveInvoiceAction.bind(null, invoiceId), {} as FormState);
  const [v, setV] = useState(initial);
  const set = <K extends keyof InvoiceFormValues>(key: K, value: InvoiceFormValues[K]) => setV((cur) => ({ ...cur, [key]: value }));
  const errors = (state.fieldErrors ?? {}) as Record<string, string | undefined>;
  const vatRate = Number.isFinite(num(v.vatRate)) ? num(v.vatRate) : 0;

  // Même fonction que le serveur ; les valeurs illisibles comptent pour 0 pendant la saisie.
  const totals = useMemo(() => {
    const lines = v.lines.map((l) => ({
      quantity: Number.isFinite(num(l.quantity)) && num(l.quantity) > 0 ? num(l.quantity) : 0,
      unitPrice: parseAmount(l.unitPrice, v.currency) ?? 0,
    }));
    const discount =
      v.discountType === "percent" && num(v.discountValue) > 0 ? { type: "percent" as const, value: Math.min(num(v.discountValue), 100) }
      : v.discountType === "amount" && (parseAmount(v.discountValue, v.currency) ?? 0) > 0 ? { type: "amount" as const, value: parseAmount(v.discountValue, v.currency) ?? 0 }
      : null;
    return computeTotals(lines, discount, vatRate);
  }, [v, vatRate]);

  const discountLabel = v.discountType === "percent" && v.discountValue ? `${v.discountValue} %` : null;

  return (
    <form action={action} noValidate className="grid gap-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <FormMessage state={state} />
      <ClientPicker value={v.clientId} onChange={(id) => set("clientId", id)} clients={clients} error={errors.clientId} defaultDial={defaultDial} />

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <p className="mb-1.5 text-sm font-semibold text-slate-700">Date d’émission</p>
          <p className="flex h-12 items-center rounded-xl bg-slate-50 px-4 text-slate-600">Aujourd’hui (fixée à l’émission)</p>
        </div>
        <Field id="dueKind" label="Échéance" error={errors.dueKind ?? errors.dueDate}>
          <div className="grid gap-2">
            <select id="dueKind" name="dueKind" value={v.dueKind} onChange={(e) => set("dueKind", e.target.value as DueKind)} aria-describedby="dueKind-msg" className={inputClass}>
              {DUE_KINDS.map((k) => <option key={k} value={k}>{DUE_KIND_LABELS[k]}</option>)}
            </select>
            {v.dueKind === "date" && (
              <input type="date" name="dueDate" min={today} value={v.dueDate} onChange={(e) => set("dueDate", e.target.value)} aria-label="Date d’échéance" aria-invalid={Boolean(errors.dueDate)} className={inputClass} />
            )}
          </div>
        </Field>
      </div>

      <InvoiceLines lines={v.lines} onChange={(lines) => set("lines", lines)} errors={errors} priceLabel={v.currency === "EUR" ? "Prix HT (€)" : "Prix HT (FCFA)"} />

      <details className="rounded-xl border border-slate-200 p-4" open={Boolean(v.discountType)}>
        <summary className="cursor-pointer text-sm font-semibold text-slate-700">Remise (facultative)</summary>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <select name="discountType" value={v.discountType} onChange={(e) => set("discountType", e.target.value as "" | DiscountType)} aria-label="Type de remise" className={inputClass}>
            <option value="">Aucune remise</option>
            <option value="percent">En pourcentage (%)</option>
            <option value="amount">En montant</option>
          </select>
          {v.discountType && (
            <Field id="discountValue" label={v.discountType === "percent" ? "Remise (%)" : "Montant de la remise"} error={errors.discountValue}>
              <input id="discountValue" name="discountValue" inputMode="decimal" value={v.discountValue} onChange={(e) => set("discountValue", e.target.value)} aria-describedby="discountValue-msg" aria-invalid={Boolean(errors.discountValue)} className={inputClass} />
            </Field>
          )}
        </div>
      </details>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="currency" label="Devise" error={errors.currency}>
          <select id="currency" name="currency" value={v.currency} onChange={(e) => set("currency", e.target.value as Currency)} aria-describedby="currency-msg" className={inputClass}>
            {CURRENCIES.map((c) => <option key={c} value={c}>{CURRENCY_LABELS[c]}</option>)}
          </select>
        </Field>
        <Field id="vatRate" label="TVA (%)" hint="0 % = TVA non applicable" error={errors.vatRate}>
          <input id="vatRate" name="vatRate" inputMode="decimal" value={v.vatRate} onChange={(e) => set("vatRate", e.target.value)} aria-describedby="vatRate-msg" aria-invalid={Boolean(errors.vatRate)} className={inputClass} />
        </Field>
      </div>

      <Field id="note" label="Note" optional hint="Ex. « Merci pour votre confiance »." error={errors.note}>
        <textarea id="note" name="note" rows={2} maxLength={500} value={v.note} onChange={(e) => set("note", e.target.value)} aria-describedby="note-msg" className={`${inputClass} h-auto py-3`} />
      </Field>

      <InvoiceTotals totals={totals} currency={v.currency} vatRate={vatRate} discountLabel={discountLabel} />

      <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
        <Link href="/app/factures" className={buttonClass("outline", "md")}>Annuler</Link>
        <button type="submit" name="intent" value="draft" disabled={pending} className={buttonClass("outline", "md")}>
          Enregistrer le brouillon
        </button>
        <button
          type="submit" name="intent" value="issue" disabled={pending} className={buttonClass("brand", "md")}
          onClick={(e) => { if (!window.confirm("Une fois émise, la facture ne pourra plus être modifiée. Émettre maintenant ?")) e.preventDefault(); }}
        >
          {pending ? "Enregistrement…" : "Émettre la facture"}
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 5: Page « Nouvelle facture »**

```tsx
// src/app/app/(main)/factures/nouvelle/page.tsx
import { InvoiceForm } from "@/components/app/InvoiceForm";
import { newLine } from "@/components/app/InvoiceLines";
import { todayInDakar } from "@/lib/invoice-status";
import type { DueKind } from "@/lib/invoice-types";
import { listClientOptions } from "@/lib/repos";
import { getSession } from "@/lib/session";
import { COUNTRIES } from "@/lib/site";

export default async function NewInvoicePage({ searchParams }: { searchParams: Promise<{ client?: string }> }) {
  const { client } = await searchParams;
  const { supabase, profile } = await getSession();
  const clients = await listClientOptions(supabase);
  const dial = COUNTRIES.find((c) => c.code === profile.country)?.dial || "221";

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold sm:text-3xl">Nouvelle facture</h1>
      <InvoiceForm
        invoiceId={null}
        today={todayInDakar()}
        defaultDial={dial}
        clients={clients}
        initial={{
          clientId: clients.some((c) => c.id === client) ? (client as string) : "",
          dueKind: String(profile.default_due_days) as DueKind,
          dueDate: "",
          currency: profile.currency,
          vatRate: String(profile.vat_rate).replace(".", ","),
          discountType: "",
          discountValue: "",
          note: "",
          lines: [newLine()],
        }}
      />
    </div>
  );
}
```

`newLine` est exporté d’un module `"use client"` : l’appeler côté serveur est interdit. Le déplacer dans `src/lib/invoice-form.ts` (module neutre) : `export function newLine(): LineValues { return { key: crypto.randomUUID(), description: "", quantity: "1", unitPrice: "" }; }` avec `export type LineValues = …`, et l’importer depuis là dans `InvoiceLines.tsx`, `InvoiceForm.tsx` et les pages.

- [ ] **Step 6: Vérifier** — `npx tsc --noEmit`, `npm run lint`, `npm test` → OK. Lancer `npm run dev`, se connecter avec un compte de test, ouvrir `/app/factures/nouvelle` : le formulaire s’affiche, les totaux se recalculent, « Enregistrer le brouillon » redirige vers `/app/factures/{id}?ok=brouillon` (404 attendu tant que la Task 12 n’est pas faite).

- [ ] **Step 7: Commit**

```bash
git add src/lib/invoice-form.ts src/components/app "src/app/app/(main)/factures" "src/app/app/(main)/clients/actions.ts"
git commit -m "feat(factures): formulaire de facture, sélection et création rapide de client, brouillon"
```

---

### Task 12: Liste, détail, actions et navigation

**Files:**
- Create: `src/app/app/(main)/factures/page.tsx`, `src/app/app/(main)/factures/[id]/page.tsx`, `src/components/app/StatusBadge.tsx`, `src/components/app/InvoiceView.tsx`, `src/components/app/InvoiceActions.tsx`, `src/components/app/MarkPaidDialog.tsx`
- Modify: `src/components/app/NavLinks.tsx`, `src/app/app/(main)/clients/[id]/page.tsx`

**Interfaces:**
- Consumes: Tasks 5, 7, 8, 9, 11.
- Produces: `<StatusBadge status={DisplayStatus} />`, `<InvoiceView view={InvoiceView} today={string} />` (composant serveur, réutilisé par la page publique), `<InvoiceActions … />`, fonction `invoiceToFormValues(record, lines): InvoiceFormValues` dans `src/lib/invoice-form.ts`, `publicInvoiceUrl(token: string): string` dans `src/lib/invoice-form.ts`.

- [ ] **Step 1: Helpers du formulaire** — ajouter à `src/lib/invoice-form.ts` + test `src/lib/invoice-form.test.ts`

```ts
// src/lib/invoice-form.test.ts
import { describe, expect, it } from "vitest";
import { invoiceToFormValues, publicInvoiceUrl } from "@/lib/invoice-form";

describe("invoiceToFormValues", () => {
  it("prépare un brouillon pour l’édition", () => {
    const v = invoiceToFormValues(
      { client_id: "c1", due_kind: "date", due_date: "2026-12-01", currency: "EUR", vat_rate: 19.25, discount_type: "amount", discount_value: 500, note: null },
      [{ position: 0, description: "Logo", quantity: 1.5, unit_price: 125050, line_total: 187575 }],
    );
    expect(v).toMatchObject({ clientId: "c1", dueKind: "date", dueDate: "2026-12-01", currency: "EUR", vatRate: "19,25", discountType: "amount", discountValue: "5", note: "" });
    expect(v.lines[0]).toMatchObject({ description: "Logo", quantity: "1,5", unitPrice: "1250,50" });
  });
});

describe("publicInvoiceUrl", () => {
  it("utilise l’URL du site", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://factoo-wine.vercel.app/";
    expect(publicInvoiceUrl("abc")).toBe("https://factoo-wine.vercel.app/f/abc");
  });
});
```

```ts
// à ajouter dans src/lib/invoice-form.ts
import type { InvoiceFormValues } from "@/components/app/InvoiceForm";
import type { InvoiceLine, InvoiceRecord } from "@/lib/invoice-types";
import { minorToInput } from "@/lib/money";

export function invoiceToFormValues(
  r: Pick<InvoiceRecord, "client_id" | "due_kind" | "due_date" | "currency" | "vat_rate" | "discount_type" | "discount_value" | "note">,
  lines: InvoiceLine[],
): InvoiceFormValues {
  const decimal = (n: number) => String(n).replace(".", ",");
  return {
    clientId: r.client_id ?? "",
    dueKind: r.due_kind,
    dueDate: r.due_date ?? "",
    currency: r.currency,
    vatRate: decimal(r.vat_rate),
    discountType: r.discount_type ?? "",
    discountValue:
      r.discount_value === null ? "" : r.discount_type === "amount" ? minorToInput(r.discount_value, r.currency) : decimal(r.discount_value),
    note: r.note ?? "",
    lines: lines.length
      ? lines.map((l) => ({ key: crypto.randomUUID(), description: l.description, quantity: decimal(l.quantity), unitPrice: minorToInput(l.unit_price, r.currency) }))
      : [newLine()],
  };
}

export function publicInvoiceUrl(token: string): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  return `${base}/f/${token}`;
}
```

Pour éviter un import de type depuis un composant client vers `lib`, déplacer le type `InvoiceFormValues` dans `src/lib/invoice-form.ts` et le ré-importer dans `InvoiceForm.tsx`.

Vérifier : `npx vitest run src/lib/invoice-form.test.ts` → PASS.

- [ ] **Step 2: `StatusBadge`**

```tsx
// src/components/app/StatusBadge.tsx
import { cn } from "@/lib/cn";
import { STATUS_LABELS, type DisplayStatus } from "@/lib/invoice-status";

const STYLES: Record<DisplayStatus, string> = {
  draft: "bg-slate-100 text-slate-600",
  pending: "bg-amber-100 text-amber-800",
  overdue: "bg-red-100 text-red-700",
  paid: "bg-green-100 text-green-800",
  cancelled: "bg-slate-100 text-slate-500 line-through",
};

export function StatusBadge({ status }: { status: DisplayStatus }) {
  return <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold", STYLES[status])}>{STATUS_LABELS[status]}</span>;
}
```

- [ ] **Step 3: `InvoiceView`** (aperçu HTML partagé, même contenu que le PDF)

```tsx
// src/components/app/InvoiceView.tsx
import { amountInWords } from "@/lib/amount-words";
import { displayStatus, formatDateFr } from "@/lib/invoice-status";
import { PAYMENT_METHOD_LABELS } from "@/lib/invoice-types";
import type { InvoiceView as View } from "@/lib/invoice-view";
import { formatMoney } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { logoUrl } from "@/lib/profile";
import { COUNTRIES } from "@/lib/site";

const countryName = (code: string | null) => COUNTRIES.find((c) => c.code === code && c.code !== "OTHER")?.name ?? "";
const join = (...parts: (string | null | undefined)[]) => parts.filter(Boolean).join(", ");

export function InvoiceView({ view, today }: { view: View; today: string }) {
  const s = view.seller;
  const b = view.buyer;
  const status = displayStatus({ status: view.status, due_date: view.dueDate }, today);
  const logo = logoUrl(s.logo_path);
  const money = (n: number) => formatMoney(n, view.currency);
  const payment = [
    s.wave_number && `Wave : ${formatPhone(s.wave_number)}`,
    s.orange_money_number && `Orange Money : ${formatPhone(s.orange_money_number)}`,
    s.iban && `IBAN : ${s.iban}`,
    s.payment_note,
  ].filter(Boolean) as string[];

  return (
    <article className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 text-sm sm:p-8">
      {status === "paid" && <p className="mb-4 rounded-xl bg-green-50 px-4 py-3 font-semibold text-green-800">Payée le {formatDateFr(view.paidAt as string)}{view.paymentMethod ? ` par ${PAYMENT_METHOD_LABELS[view.paymentMethod]}` : ""}</p>}
      {status === "cancelled" && <p className="mb-4 rounded-xl bg-slate-100 px-4 py-3 font-semibold text-slate-600">Facture annulée</p>}
      {status === "overdue" && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 font-semibold text-red-700">En retard depuis le {formatDateFr(view.dueDate as string)}</p>}

      <header className="flex flex-col gap-6 sm:flex-row sm:justify-between">
        <div className="space-y-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {logo && <img src={logo} alt="" className="mb-3 h-14 w-auto max-w-[10rem] object-contain" />}
          <p className="text-base font-extrabold">{s.company_name ?? "—"}</p>
          <p className="text-slate-600">{join(s.address, s.city, countryName(s.country))}</p>
          <p className="text-slate-600">{join(formatPhone(s.phone), s.business_email)}</p>
          <p className="text-slate-500">{join(s.rccm && `RCCM : ${s.rccm}`, s.nif && `NIF/NINEA : ${s.nif}`)}</p>
        </div>
        <div className="sm:text-right">
          <p className="text-2xl font-extrabold tracking-wide text-[#0F766E]">FACTURE</p>
          <p className="font-bold">{view.number ?? "Brouillon"}</p>
          {view.issueDate && <p className="text-slate-600">Émise le {formatDateFr(view.issueDate)}</p>}
          <p className="text-slate-600">
            Échéance : {view.dueKind === "0" ? "À réception" : view.dueDate ? formatDateFr(view.dueDate) : `${view.dueKind} jours`}
          </p>
        </div>
      </header>

      <section className="mt-6 rounded-xl bg-slate-50 p-4">
        <p className="text-xs font-bold uppercase text-slate-500">Facturé à</p>
        {b ? (
          <>
            <p className="font-bold">{b.name}</p>
            <p className="text-slate-600">{join(b.address, b.city, countryName(b.country))}</p>
            <p className="text-slate-600">{join(formatPhone(b.phone), b.email)}</p>
            {b.tax_id && <p className="text-slate-500">Identifiant fiscal : {b.tax_id}</p>}
          </>
        ) : (
          <p className="text-slate-500">Aucun client choisi</p>
        )}
      </section>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[30rem] text-left">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
            <tr><th className="py-2 font-semibold">Désignation</th><th className="py-2 text-right font-semibold">Qté</th><th className="py-2 text-right font-semibold">Prix unitaire HT</th><th className="py-2 text-right font-semibold">Total HT</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {view.lines.map((l) => (
              <tr key={l.position}>
                <td className="py-2 pr-3">{l.description}</td>
                <td className="py-2 text-right">{String(l.quantity).replace(".", ",")}</td>
                <td className="py-2 text-right whitespace-nowrap">{money(l.unit_price)}</td>
                <td className="py-2 text-right whitespace-nowrap">{money(l.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="ml-auto mt-4 grid max-w-sm gap-1">
        <div className="flex justify-between"><dt className="text-slate-500">Total HT</dt><dd>{money(view.subtotal)}</dd></div>
        {view.discountAmount > 0 && (
          <>
            <div className="flex justify-between"><dt className="text-slate-500">Remise{view.discountType === "percent" ? ` (${String(view.discountValue).replace(".", ",")} %)` : ""}</dt><dd>-{money(view.discountAmount)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Total HT après remise</dt><dd>{money(view.subtotal - view.discountAmount)}</dd></div>
          </>
        )}
        {view.vatRate === 0 ? (
          <div className="flex justify-between"><dt className="text-slate-500">TVA non applicable</dt><dd>—</dd></div>
        ) : (
          <div className="flex justify-between"><dt className="text-slate-500">TVA ({String(view.vatRate).replace(".", ",")} %)</dt><dd>{money(view.vatAmount)}</dd></div>
        )}
        <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-extrabold"><dt>Total TTC</dt><dd>{money(view.total)}</dd></div>
      </dl>

      <p className="mt-6 italic text-slate-600">Arrêtée la présente facture à la somme de {amountInWords(view.total, view.currency)}.</p>
      {view.note && <p className="mt-4 text-slate-700">{view.note}</p>}
      {payment.length > 0 && (
        <section className="mt-6 border-t border-slate-100 pt-4">
          <p className="text-xs font-bold uppercase text-slate-500">Paiement</p>
          <ul className="mt-1 space-y-0.5 text-slate-700">{payment.map((p) => <li key={p}>{p}</li>)}</ul>
        </section>
      )}
    </article>
  );
}
```

- [ ] **Step 4: `MarkPaidDialog` et `InvoiceActions`**

```tsx
// src/components/app/MarkPaidDialog.tsx
"use client";

import { useActionState, useRef } from "react";
import { Field, FormMessage, inputClass } from "@/components/forms/Field";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { buttonClass } from "@/components/ui/button";
import type { FormState } from "@/lib/form-state";
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from "@/lib/invoice-types";

type Props = { action: (prev: FormState, formData: FormData) => Promise<FormState>; today: string; minDate: string };

export function MarkPaidDialog({ action, today, minDate }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, formAction] = useActionState(action, {} as FormState);
  const errors = state.fieldErrors ?? {};
  return (
    <>
      <button type="button" onClick={() => dialog.current?.showModal()} className={buttonClass("brand", "md")}>Marquer comme payée</button>
      <dialog ref={dialog} className="w-[min(26rem,calc(100vw-2rem))] rounded-2xl p-0 backdrop:bg-black/40">
        <form action={formAction} noValidate className="grid gap-4 p-5">
          <h2 className="text-lg font-bold">Paiement reçu</h2>
          <FormMessage state={state} />
          <Field id="paidAt" label="Date du paiement" error={errors.paidAt}>
            <input id="paidAt" name="paidAt" type="date" defaultValue={today} min={minDate} max={today} aria-describedby="paidAt-msg" className={inputClass} />
          </Field>
          <Field id="method" label="Moyen de paiement" error={errors.method}>
            <select id="method" name="method" defaultValue="wave" aria-describedby="method-msg" className={inputClass}>
              {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>)}
            </select>
          </Field>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => dialog.current?.close()} className={buttonClass("outline", "md")}>Annuler</button>
            <SubmitButton>Confirmer</SubmitButton>
          </div>
        </form>
      </dialog>
    </>
  );
}
```

`defaultValue` est acceptable ici : la fenêtre se ferme par redirection en cas de succès, et une erreur affiche le message sans perdre de saisie significative (deux champs pré-remplis).

```tsx
// src/components/app/InvoiceActions.tsx
"use client";

import { Copy, Download, MessageCircle } from "lucide-react";
import { useActionState, useState } from "react";
import { MarkPaidDialog } from "@/components/app/MarkPaidDialog";
import { FormMessage } from "@/components/forms/Field";
import { buttonClass } from "@/components/ui/button";
import type { FormState } from "@/lib/form-state";
import type { InvoiceStatus } from "@/lib/invoice-types";

type Props = {
  status: InvoiceStatus;
  pdfUrl: string;
  publicUrl: string;
  whatsappUrl: string;
  today: string;
  issueDate: string;
  markPaid: (prev: FormState, formData: FormData) => Promise<FormState>;
  unmarkPaid: () => Promise<FormState>;
  cancel: () => Promise<FormState>;
};

function ConfirmButton({ action, label, confirm, danger }: { action: () => Promise<FormState>; label: string; confirm: string; danger?: boolean }) {
  const [state, formAction, pending] = useActionState(action, {} as FormState);
  return (
    <form action={formAction} onSubmit={(e) => { if (!window.confirm(confirm)) e.preventDefault(); }} className="grid gap-2">
      <FormMessage state={state} />
      <button type="submit" disabled={pending} className={danger ? "justify-self-start rounded-full px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60" : buttonClass("outline", "md")}>
        {pending ? "…" : label}
      </button>
    </form>
  );
}

export function InvoiceActions(p: Props) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(p.publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const live = p.status === "issued" || p.status === "paid";

  return (
    <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap gap-3">
        {live && (
          <a href={p.whatsappUrl} target="_blank" rel="noopener noreferrer" className={buttonClass("brand", "md")}>
            <MessageCircle className="h-4 w-4" aria-hidden="true" /> Envoyer par WhatsApp
          </a>
        )}
        <a href={p.pdfUrl} target="_blank" rel="noopener noreferrer" className={buttonClass("outline", "md")}>
          <Download className="h-4 w-4" aria-hidden="true" /> Télécharger le PDF
        </a>
        {live && (
          <button type="button" onClick={copy} className={buttonClass("outline", "md")}>
            <Copy className="h-4 w-4" aria-hidden="true" /> {copied ? "Lien copié ✓" : "Copier le lien"}
          </button>
        )}
      </div>
      {p.status === "issued" && (
        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
          <MarkPaidDialog action={p.markPaid} today={p.today} minDate={p.issueDate} />
          <ConfirmButton action={p.cancel} danger label="Annuler la facture" confirm="Le numéro restera utilisé. Cette action est définitive. Annuler la facture ?" />
        </div>
      )}
      {p.status === "paid" && (
        <div className="border-t border-slate-100 pt-4">
          <ConfirmButton action={p.unmarkPaid} label="Annuler le paiement" confirm="La facture repassera « En attente ». Continuer ?" />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Page de détail**

```tsx
// src/app/app/(main)/factures/[id]/page.tsx
import { Trash2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InvoiceActions } from "@/components/app/InvoiceActions";
import { InvoiceForm } from "@/components/app/InvoiceForm";
import { InvoiceView } from "@/components/app/InvoiceView";
import { StatusBadge } from "@/components/app/StatusBadge";
import { buttonClass } from "@/components/ui/button";
import { invoiceToFormValues, publicInvoiceUrl } from "@/lib/invoice-form";
import { displayStatus, formatDateFr, todayInDakar } from "@/lib/invoice-status";
import { buildInvoiceView } from "@/lib/invoice-view";
import { INVOICE_ERRORS, INVOICE_FLASH } from "@/lib/invoices";
import { formatMoney } from "@/lib/money";
import { getInvoice, listClientOptions } from "@/lib/repos";
import { getSession } from "@/lib/session";
import { COUNTRIES } from "@/lib/site";
import { invoiceWhatsappLink, invoiceWhatsappMessage } from "@/lib/whatsapp";
import { cancelInvoiceAction, deleteDraftAction, markPaidAction, unmarkPaidAction } from "../actions";
import { DeleteDraftButton } from "./DeleteDraftButton";

export default async function InvoicePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  const { id } = await params;
  const { ok, erreur } = await searchParams;
  const { supabase, profile } = await getSession();
  const data = await getInvoice(supabase, id);
  if (!data) notFound();
  const { record, lines, client } = data;
  const today = todayInDakar();
  const view = buildInvoiceView(record, lines, { profile, client });
  const flash = ok ? INVOICE_FLASH[ok]?.replace("{numero}", record.number ?? "") : undefined;
  const error = erreur ? (INVOICE_ERRORS[erreur] ?? "Un souci technique, réessayez.") : undefined;
  const banner = (flash || error) && (
    <p role={error ? "alert" : "status"} className={error ? "rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700" : "rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-800"}>
      {error ?? flash}
    </p>
  );

  if (record.status === "draft") {
    const clients = await listClientOptions(supabase);
    const dial = COUNTRIES.find((c) => c.code === profile.country)?.dial || "221";
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="flex items-center gap-3 text-2xl font-extrabold sm:text-3xl">Brouillon <StatusBadge status="draft" /></h1>
          <a href={`/app/factures/${id}/pdf`} target="_blank" rel="noopener noreferrer" className={buttonClass("outline", "sm")}>Aperçu PDF</a>
        </div>
        {banner}
        <InvoiceForm invoiceId={id} initial={invoiceToFormValues(record, lines)} clients={clients} today={today} defaultDial={dial} />
        <DeleteDraftButton action={deleteDraftAction.bind(null, id)} />
      </div>
    );
  }

  const url = publicInvoiceUrl(record.public_token);
  const message = invoiceWhatsappMessage({
    clientName: view.buyer?.name ?? "",
    number: record.number as string,
    total: formatMoney(record.total, record.currency),
    dueDate: record.due_kind === "0" || !record.due_date ? null : formatDateFr(record.due_date),
    url,
    companyName: view.seller.company_name ?? "",
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-3 text-2xl font-extrabold sm:text-3xl">
          {record.number} <StatusBadge status={displayStatus(record, today)} />
        </h1>
        <Link href="/app/factures" className="text-sm font-semibold text-slate-500 hover:text-slate-800">← Toutes les factures</Link>
      </div>
      {banner}
      <InvoiceActions
        status={record.status}
        pdfUrl={`/app/factures/${id}/pdf`}
        publicUrl={url}
        whatsappUrl={invoiceWhatsappLink(view.buyer?.phone ?? null, message)}
        today={today}
        issueDate={record.issue_date as string}
        markPaid={markPaidAction.bind(null, id)}
        unmarkPaid={unmarkPaidAction.bind(null, id)}
        cancel={cancelInvoiceAction.bind(null, id)}
      />
      <InvoiceView view={view} today={today} />
    </div>
  );
}
```

```tsx
// src/app/app/(main)/factures/[id]/DeleteDraftButton.tsx
"use client";

import { Trash2 } from "lucide-react";
import { useActionState } from "react";
import { FormMessage } from "@/components/forms/Field";
import type { FormState } from "@/lib/form-state";

export function DeleteDraftButton({ action }: { action: (prev: FormState) => Promise<FormState> }) {
  const [state, formAction, pending] = useActionState(action, {} as FormState);
  return (
    <form action={formAction} onSubmit={(e) => { if (!window.confirm("Supprimer ce brouillon ? Cette action est définitive.")) e.preventDefault(); }} className="grid gap-3">
      <FormMessage state={state} />
      <button type="submit" disabled={pending} className="flex items-center gap-2 justify-self-start rounded-full px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60">
        <Trash2 className="h-4 w-4" aria-hidden="true" /> {pending ? "Suppression…" : "Supprimer le brouillon"}
      </button>
    </form>
  );
}
```

Retirer l’import inutilisé `Trash2` de `page.tsx`. `deleteDraftAction` a la signature `(id) => Promise<FormState>` ; lié par `bind`, il devient `() => …` : adapter `deleteDraftAction` en `(id: string, _prev?: FormState)` pour satisfaire `useActionState` (comme `archiveClientAction`). Faire de même pour `unmarkPaidAction` et `cancelInvoiceAction` (`(id: string, _prev?: FormState)`), et typer les props `unmarkPaid`/`cancel` de `InvoiceActions` en `(prev: FormState) => Promise<FormState>`.

- [ ] **Step 6: Liste des factures**

```tsx
// src/app/app/(main)/factures/page.tsx
import { ChevronRight, FileText, Plus, Search } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/app/StatusBadge";
import { inputClass } from "@/components/forms/Field";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { filterInvoices, LIST_FILTERS, parseListFilter } from "@/lib/invoice-list";
import { displayStatus, formatDateFr, todayInDakar } from "@/lib/invoice-status";
import { INVOICE_FLASH } from "@/lib/invoices";
import { formatMoney } from "@/lib/money";
import { listInvoiceRows } from "@/lib/repos";
import { getSession } from "@/lib/session";

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ q?: string; statut?: string; ok?: string }> }) {
  const { q = "", statut, ok } = await searchParams;
  const filter = parseListFilter(statut);
  const { supabase } = await getSession();
  const today = todayInDakar();
  const all = await listInvoiceRows(supabase);
  const rows = filterInvoices(all, filter, q, today);
  const flash = ok ? INVOICE_FLASH[ok] : undefined;
  const href = (f: string) => `/app/factures?${new URLSearchParams({ ...(f !== "toutes" && { statut: f }), ...(q && { q }) })}`;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold sm:text-3xl">Factures</h1>
        <Link href="/app/factures/nouvelle" className={buttonClass("brand", "sm", "hidden sm:inline-flex")}>
          <Plus className="h-4 w-4" aria-hidden="true" /> Nouvelle facture
        </Link>
      </div>
      {flash && <p role="status" className="rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-800">{flash}</p>}

      <nav aria-label="Filtrer les factures" className="-mx-4 overflow-x-auto px-4">
        <ul className="flex gap-2">
          {LIST_FILTERS.map((f) => (
            <li key={f.value}>
              <Link href={href(f.value)} aria-current={filter === f.value ? "page" : undefined}
                className={cn("block whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold", filter === f.value ? "bg-[#04201D] text-white" : "bg-white text-slate-600 ring-1 ring-slate-200")}>
                {f.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <form role="search" className="relative">
        {filter !== "toutes" && <input type="hidden" name="statut" value={filter} />}
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input name="q" defaultValue={q} placeholder="Rechercher par numéro ou client" aria-label="Rechercher une facture" className={cn(inputClass, "pl-12")} />
      </form>

      {all.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <FileText className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
          <h2 className="mt-2 font-bold">Aucune facture pour l’instant</h2>
          <Link href="/app/factures/nouvelle" className={buttonClass("brand", "md", "mt-4")}>Créer ma première facture</Link>
        </div>
      ) : rows.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-500">Aucune facture ne correspond.</p>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {rows.map((r) => (
            <li key={r.id}>
              <Link href={`/app/factures/${r.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 truncate font-semibold">{r.number ?? "Brouillon"} <StatusBadge status={displayStatus(r, today)} /></p>
                  <p className="truncate text-sm text-slate-500">{[r.client_name ?? "Sans client", r.due_date && r.status !== "draft" ? `échéance ${formatDateFr(r.due_date)}` : null].filter(Boolean).join(" · ")}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-bold">{formatMoney(r.total, r.currency)}</span>
                  <ChevronRight className="h-5 w-5 text-slate-400" aria-hidden="true" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Link href="/app/factures/nouvelle" aria-label="Nouvelle facture" className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#00C853] text-black shadow-lg sm:hidden">
        <Plus className="h-6 w-6" aria-hidden="true" />
      </Link>
    </div>
  );
}
```

- [ ] **Step 7: Navigation et fiche client**

Dans `NavLinks.tsx`, remplacer `{ href: null, label: "Factures", … }` par `{ href: "/app/factures", label: "Factures", short: "Factures", icon: FileText, exact: false }`. Supprimer la branche `href === null` (badge « Bientôt » et `<span aria-disabled>`), devenue inutile, et le type `href: null`.

Dans `clients/[id]/page.tsx`, ajouter sous le titre :

```tsx
      <Link href={`/app/factures/nouvelle?client=${id}`} className={buttonClass("brand", "sm")}>
        <FileText className="h-4 w-4" aria-hidden="true" /> Facturer ce client
      </Link>
```

(imports `Link`, `FileText`, `buttonClass`).

- [ ] **Step 8: Vérifier** — `npm test`, `npx tsc --noEmit`, `npm run lint`. En local (`npm run dev`) : créer un brouillon, le modifier, l’émettre (numéro `FAC-AAAA-0001`), marquer payée puis annuler le paiement, annuler une autre facture, supprimer un brouillon ; la liste filtre correctement ; à 360 px aucun débordement horizontal.

- [ ] **Step 9: Commit**

```bash
git add src "src/app/app/(main)"
git commit -m "feat(factures): liste, détail, émission, paiement, annulation et navigation"
```

---

### Task 13: PDF

**Files:**
- Create: `src/pdf/InvoiceDocument.tsx`, `src/pdf/render.tsx`, `src/app/app/(main)/factures/[id]/pdf/route.ts`
- Modify: `package.json` (dépendance), `next.config.ts`
- Test: `src/pdf/render.test.ts`

**Interfaces:**
- Consumes: `InvoiceView` (Task 8), `formatMoney`, `amountInWords`, `formatDateFr`, `PAYMENT_METHOD_LABELS`, `formatPhone`, `logoUrl`.
- Produces: `renderInvoicePdf(view: InvoiceView, opts: { draft: boolean }): Promise<Buffer>`, `pdfResponse(buffer: Buffer, filename: string): Response`.

- [ ] **Step 1: Installer** — `npm install @react-pdf/renderer@4` ; noter la version exacte installée dans le message de commit.

- [ ] **Step 2: Configuration** — dans `next.config.ts`, ajouter `serverExternalPackages: ["@react-pdf/renderer"],` et étendre `outputFileTracingIncludes` :

```ts
  outputFileTracingIncludes: {
    "/app/**/*": ["./node_modules/@img/**/*"],
    "/f/**/*": ["./node_modules/@img/**/*"],
  },
```

- [ ] **Step 3: Test qui échoue**

```ts
// src/pdf/render.test.ts
import { describe, expect, it } from "vitest";
import type { InvoiceView } from "@/lib/invoice-view";
import { renderInvoicePdf } from "@/pdf/render";

const view: InvoiceView = {
  id: "inv1", status: "issued", number: "FAC-2026-0001", issueDate: "2026-10-15", dueKind: "30", dueDate: "2026-11-14",
  currency: "XOF", vatRate: 18, discountType: null, discountValue: null, note: "Merci pour votre confiance",
  subtotal: 150000, discountAmount: 0, vatAmount: 27000, total: 177000,
  lines: Array.from({ length: 40 }, (_, i) => ({ position: i, description: `Prestation n° ${i + 1} — conception`, quantity: 1, unit_price: 3750, line_total: 3750 })),
  seller: { company_name: "COSENDIGITAL", address: "Rue 10", city: "Dakar", country: "SN", phone: "+221771234567", business_email: "contact@cosen.sn", rccm: "SN-DKR-1", nif: "123", logo_path: null, wave_number: "+221770000000", orange_money_number: null, iban: null, payment_note: "Paiement à 30 jours" },
  buyer: { name: "Awa Couture", phone: "+221781112233", email: null, address: null, city: "Thiès", country: "SN", tax_id: null },
  paidAt: null, paymentMethod: null, publicToken: "tok",
};

describe("renderInvoicePdf", () => {
  it("produit un PDF multi-pages", async () => {
    const pdf = await renderInvoicePdf(view, { draft: false });
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(2000);
  }, 20000);
  it("brouillon avec filigrane et facture TVA 0 %", async () => {
    const pdf = await renderInvoicePdf({ ...view, status: "draft", number: null, vatRate: 0, vatAmount: 0, total: 150000 }, { draft: true });
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  }, 20000);
});
```

Ajouter `"src/**/*.test.tsx"` n’est pas nécessaire (fichier `.ts`). Si Vitest ne transforme pas le JSX de `render.tsx`, ajouter `esbuild: { jsx: "automatic" }` à `vitest.config.ts`.

- [ ] **Step 4: Vérifier l’échec** — `npx vitest run src/pdf/render.test.ts` → FAIL.

- [ ] **Step 5: Implémenter le document**

```tsx
// src/pdf/InvoiceDocument.tsx
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { amountInWords } from "@/lib/amount-words";
import { formatDateFr } from "@/lib/invoice-status";
import { PAYMENT_METHOD_LABELS } from "@/lib/invoice-types";
import type { InvoiceView } from "@/lib/invoice-view";
import { formatMoney } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { COUNTRIES } from "@/lib/site";

const TEAL = "#0F766E";
const s = StyleSheet.create({
  page: { padding: 40, paddingBottom: 60, fontSize: 9.5, fontFamily: "Helvetica", color: "#0f172a" },
  row: { flexDirection: "row" },
  between: { flexDirection: "row", justifyContent: "space-between" },
  muted: { color: "#475569" },
  bold: { fontFamily: "Helvetica-Bold" },
  title: { fontSize: 22, fontFamily: "Helvetica-Bold", color: TEAL, textAlign: "right" },
  box: { marginTop: 18, padding: 10, backgroundColor: "#f1f5f9", borderRadius: 4 },
  label: { fontSize: 7.5, color: "#64748b", fontFamily: "Helvetica-Bold", textTransform: "uppercase", marginBottom: 3 },
  th: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: TEAL, paddingVertical: 5, marginTop: 18, fontFamily: "Helvetica-Bold", color: TEAL, fontSize: 8 },
  tr: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#e2e8f0", paddingVertical: 5 },
  cDesc: { flex: 1, paddingRight: 8 },
  cQty: { width: 40, textAlign: "right" },
  cPrice: { width: 85, textAlign: "right" },
  cTotal: { width: 85, textAlign: "right" },
  totals: { marginTop: 10, marginLeft: "auto", width: 230 },
  totalLine: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  grand: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#0f172a", marginTop: 4, paddingTop: 5, fontFamily: "Helvetica-Bold", fontSize: 11 },
  footer: { position: "absolute", bottom: 25, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: "#94a3b8" },
  stamp: { position: "absolute", top: 300, left: 120, fontSize: 64, fontFamily: "Helvetica-Bold", opacity: 0.15, transform: "rotate(-30deg)" },
});

const countryName = (code: string | null) => COUNTRIES.find((c) => c.code === code && c.code !== "OTHER")?.name ?? "";
const join = (...parts: (string | null | undefined)[]) => parts.filter(Boolean).join(", ");
const dec = (n: number) => String(n).replace(".", ",");

export function InvoiceDocument({ view, logo, draft }: { view: InvoiceView; logo: Buffer | null; draft: boolean }) {
  const money = (n: number) => formatMoney(n, view.currency);
  const sel = view.seller;
  const b = view.buyer;
  const payment = [
    sel.wave_number && `Wave : ${formatPhone(sel.wave_number)}`,
    sel.orange_money_number && `Orange Money : ${formatPhone(sel.orange_money_number)}`,
    sel.iban && `IBAN : ${sel.iban}`,
    sel.payment_note,
  ].filter(Boolean) as string[];
  const stamp = draft ? { text: "BROUILLON", color: "#64748b" } : view.status === "paid" ? { text: "PAYÉE", color: "#15803d" } : view.status === "cancelled" ? { text: "ANNULÉE", color: "#b91c1c" } : null;

  return (
    <Document title={view.number ?? "Brouillon"} author={sel.company_name ?? "Factoo"} creator="Factoo" producer="Factoo">
      <Page size="A4" style={s.page}>
        {stamp && <Text fixed style={[s.stamp, { color: stamp.color }]}>{stamp.text}</Text>}

        <View style={s.between}>
          <View style={{ maxWidth: 270 }}>
            {logo && <Image src={logo} style={{ height: 50, maxWidth: 160, objectFit: "contain", marginBottom: 8 }} />}
            <Text style={[s.bold, { fontSize: 12 }]}>{sel.company_name ?? ""}</Text>
            <Text style={s.muted}>{join(sel.address, sel.city, countryName(sel.country))}</Text>
            <Text style={s.muted}>{join(formatPhone(sel.phone), sel.business_email)}</Text>
            <Text style={s.muted}>{join(sel.rccm && `RCCM : ${sel.rccm}`, sel.nif && `NIF/NINEA : ${sel.nif}`)}</Text>
          </View>
          <View>
            <Text style={s.title}>FACTURE</Text>
            <Text style={[s.bold, { textAlign: "right", fontSize: 11 }]}>{view.number ?? "Brouillon"}</Text>
            {view.issueDate && <Text style={[s.muted, { textAlign: "right" }]}>Date : {formatDateFr(view.issueDate)}</Text>}
            <Text style={[s.muted, { textAlign: "right" }]}>
              Échéance : {view.dueKind === "0" ? "À réception" : view.dueDate ? formatDateFr(view.dueDate) : `${view.dueKind} jours`}
            </Text>
          </View>
        </View>

        <View style={s.box}>
          <Text style={s.label}>Facturé à</Text>
          {b ? (
            <>
              <Text style={s.bold}>{b.name}</Text>
              {join(b.address, b.city, countryName(b.country)) !== "" && <Text style={s.muted}>{join(b.address, b.city, countryName(b.country))}</Text>}
              {join(formatPhone(b.phone), b.email) !== "" && <Text style={s.muted}>{join(formatPhone(b.phone), b.email)}</Text>}
              {b.tax_id && <Text style={s.muted}>Identifiant fiscal : {b.tax_id}</Text>}
            </>
          ) : (
            <Text style={s.muted}>Aucun client choisi</Text>
          )}
        </View>

        <View style={s.th} fixed>
          <Text style={s.cDesc}>DÉSIGNATION</Text><Text style={s.cQty}>QTÉ</Text><Text style={s.cPrice}>PRIX UNIT. HT</Text><Text style={s.cTotal}>TOTAL HT</Text>
        </View>
        {view.lines.map((l) => (
          <View key={l.position} style={s.tr} wrap={false}>
            <Text style={s.cDesc}>{l.description}</Text>
            <Text style={s.cQty}>{dec(l.quantity)}</Text>
            <Text style={s.cPrice}>{money(l.unit_price)}</Text>
            <Text style={s.cTotal}>{money(l.line_total)}</Text>
          </View>
        ))}

        <View style={s.totals} wrap={false}>
          <View style={s.totalLine}><Text style={s.muted}>Total HT</Text><Text>{money(view.subtotal)}</Text></View>
          {view.discountAmount > 0 && (
            <>
              <View style={s.totalLine}><Text style={s.muted}>Remise{view.discountType === "percent" ? ` (${dec(view.discountValue ?? 0)} %)` : ""}</Text><Text>-{money(view.discountAmount)}</Text></View>
              <View style={s.totalLine}><Text style={s.muted}>Total HT après remise</Text><Text>{money(view.subtotal - view.discountAmount)}</Text></View>
            </>
          )}
          {view.vatRate === 0 ? (
            <View style={s.totalLine}><Text style={s.muted}>TVA non applicable</Text><Text>—</Text></View>
          ) : (
            <View style={s.totalLine}><Text style={s.muted}>TVA ({dec(view.vatRate)} %)</Text><Text>{money(view.vatAmount)}</Text></View>
          )}
          <View style={s.grand}><Text>Total TTC</Text><Text>{money(view.total)}</Text></View>
        </View>

        <View wrap={false} style={{ marginTop: 16 }}>
          <Text style={{ fontFamily: "Helvetica-Oblique" }}>Arrêtée la présente facture à la somme de {amountInWords(view.total, view.currency)}.</Text>
          {view.note && <Text style={{ marginTop: 8 }}>{view.note}</Text>}
          {view.status === "paid" && view.paidAt && (
            <Text style={{ marginTop: 8, color: "#15803d" }}>Payée le {formatDateFr(view.paidAt)}{view.paymentMethod ? ` par ${PAYMENT_METHOD_LABELS[view.paymentMethod]}` : ""}.</Text>
          )}
        </View>

        {payment.length > 0 && (
          <View wrap={false} style={[s.box, { backgroundColor: "#f0fdfa" }]}>
            <Text style={[s.label, { color: TEAL }]}>Paiement</Text>
            {payment.map((p) => <Text key={p}>{p}</Text>)}
          </View>
        )}

        <View style={s.footer} fixed>
          <Text>Facture créée avec Factoo</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber}/${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
```

- [ ] **Step 6: Rendu et réponse HTTP**

```tsx
// src/pdf/render.tsx
import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import sharp from "sharp";
import type { InvoiceView } from "@/lib/invoice-view";
import { logoUrl } from "@/lib/profile";
import { InvoiceDocument } from "@/pdf/InvoiceDocument";

// @react-pdf ne lit pas le WebP : on convertit le logo en PNG. Un logo illisible n'empêche pas le PDF.
async function loadLogo(path: string | null): Promise<Buffer | null> {
  const url = logoUrl(path);
  if (!url) return null;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return await sharp(Buffer.from(await res.arrayBuffer())).png().toBuffer();
  } catch (error) {
    console.error("[pdf] logo :", error instanceof Error ? error.message : error);
    return null;
  }
}

export async function renderInvoicePdf(view: InvoiceView, opts: { draft: boolean }): Promise<Buffer> {
  const logo = await loadLogo(view.seller.logo_path);
  return renderToBuffer(<InvoiceDocument view={view} logo={logo} draft={opts.draft} />);
}

export function pdfResponse(buffer: Buffer, filename: string): Response {
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
```

Le test Vitest importe `server-only` : si l’import échoue sous Vitest, ajouter dans `vitest.config.ts` `resolve.alias["server-only"] = fileURLToPath(new URL("./src/test/empty.ts", import.meta.url))` avec un fichier `src/test/empty.ts` contenant `export {};`.

- [ ] **Step 7: Route PDF connectée**

```ts
// src/app/app/(main)/factures/[id]/pdf/route.ts
import { buildInvoiceView } from "@/lib/invoice-view";
import { getInvoice } from "@/lib/repos";
import { getSession } from "@/lib/session";
import { pdfResponse, renderInvoicePdf } from "@/pdf/render";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await getSession();
  const data = await getInvoice(supabase, id);
  if (!data) return new Response("Facture introuvable", { status: 404 });
  try {
    const view = buildInvoiceView(data.record, data.lines, { profile, client: data.client });
    const draft = data.record.status === "draft";
    const pdf = await renderInvoicePdf(view, { draft });
    return pdfResponse(pdf, draft ? "brouillon.pdf" : `${data.record.number}.pdf`);
  } catch (error) {
    console.error("[pdf] génération :", error instanceof Error ? error.message : error);
    return new Response("Le PDF n’a pas pu être généré, réessayez.", { status: 500, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
}
```

Note : `getSession()` appelle `redirect("/connexion")` si l’utilisateur n’est pas connecté ; le middleware protège déjà `/app/*`.

- [ ] **Step 8: Vérifier** — `npx vitest run src/pdf/render.test.ts` → PASS ; `npm run build` → OK ; en local, ouvrir `/app/factures/{id}/pdf` d’une facture émise de 40 lignes : 2 pages, en-tête de tableau répété, « Page 1/2 », accents et « € » corrects, logo présent.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json next.config.ts vitest.config.ts src/pdf "src/app/app/(main)/factures/[id]/pdf"
git commit -m "feat(factures): génération du PDF (@react-pdf/renderer)"
```

---

### Task 14: Page publique et PDF public

**Files:**
- Create: `src/app/f/[token]/page.tsx`, `src/app/f/[token]/pdf/route.ts`, `src/app/f/[token]/not-found.tsx`

**Interfaces:**
- Consumes: `getPublicInvoice` (Task 9), `buildInvoiceView` (Task 8), `InvoiceView` composant (Task 12), `renderInvoicePdf`, `pdfResponse` (Task 13).

- [ ] **Step 1: Page**

```tsx
// src/app/f/[token]/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InvoiceView } from "@/components/app/InvoiceView";
import { buttonClass } from "@/components/ui/button";
import { Logo } from "@/components/ui/Logo";
import { formatDateFr, todayInDakar, displayStatus } from "@/lib/invoice-status";
import { buildInvoiceView } from "@/lib/invoice-view";
import { formatMoney } from "@/lib/money";
import { getPublicInvoice } from "@/lib/repos";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Facture", robots: { index: false, follow: false } };

export default async function PublicInvoicePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await getPublicInvoice(token);
  if (!data) notFound();
  const view = buildInvoiceView(data.record, data.lines, null);
  const today = todayInDakar();
  const status = displayStatus({ status: view.status, due_date: view.dueDate }, today);

  return (
    <div className="min-h-screen bg-[#F8FAFC] px-4 py-8 text-slate-900">
      <main className="mx-auto grid max-w-3xl gap-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">{view.seller.company_name} vous a envoyé une facture</p>
          <p className="mt-1 text-2xl font-extrabold">{formatMoney(view.total, view.currency)}</p>
          <p className="mt-1 text-sm font-semibold text-slate-600">
            {status === "pending" && (view.dueKind === "0" ? "À régler à réception" : `À régler avant le ${formatDateFr(view.dueDate as string)}`)}
            {status === "overdue" && <span className="text-red-700">En retard depuis le {formatDateFr(view.dueDate as string)}</span>}
            {status === "paid" && <span className="text-green-700">Payée le {formatDateFr(view.paidAt as string)}</span>}
            {status === "cancelled" && "Facture annulée"}
          </p>
          <a href={`/f/${token}/pdf`} className={buttonClass("brand", "md", "mt-4 w-full sm:w-auto")}>Télécharger le PDF</a>
        </div>
        <InvoiceView view={view} today={today} />
        <Link href="/" className="mx-auto flex items-center gap-2 text-xs text-slate-400">
          Facture créée avec <Logo />
        </Link>
      </main>
    </div>
  );
}
```

Vérifier la signature de `Logo` (`src/components/ui/Logo.tsx`) ; s’il n’accepte pas de taille, remplacer par le texte « Factoo » en gras.

```tsx
// src/app/f/[token]/not-found.tsx
export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4 text-center text-slate-900">
      <div>
        <h1 className="text-xl font-extrabold">Facture introuvable</h1>
        <p className="mt-2 text-slate-500">Le lien est peut-être incomplet. Demandez-le à nouveau à votre fournisseur.</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: PDF public**

```ts
// src/app/f/[token]/pdf/route.ts
import { buildInvoiceView } from "@/lib/invoice-view";
import { getPublicInvoice } from "@/lib/repos";
import { pdfResponse, renderInvoicePdf } from "@/pdf/render";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await getPublicInvoice(token);
  if (!data) return new Response("Facture introuvable", { status: 404 });
  try {
    const pdf = await renderInvoicePdf(buildInvoiceView(data.record, data.lines, null), { draft: false });
    return pdfResponse(pdf, `${data.record.number}.pdf`);
  } catch (error) {
    console.error("[pdf] public :", error instanceof Error ? error.message : error);
    return new Response("Le PDF n’a pas pu être généré, réessayez.", { status: 500, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
}
```

- [ ] **Step 3: Contrôles de sécurité de la page publique** — ajouter à `scripts/check-rls.mjs` (dans le bloc factures, après l’émission ; `SITE` = `process.env.NEXT_PUBLIC_SITE_URL`, à ne lancer que si la variable est définie et le site déployé) :

```js
  const site = process.env.CHECK_SITE_URL;
  if (site) {
    const { data: draftForPage } = await a.client.rpc("save_invoice_draft", { p_id: null, p_data: draftData(clientId), p_lines: [line(0)] });
    const { data: tokens } = await a.client.from("invoices").select("id,public_token,status").in("id", [draftId, draftForPage]);
    const issuedToken = tokens.find((t) => t.id === draftId).public_token;
    const draftToken = tokens.find((t) => t.id === draftForPage).public_token;
    check("page publique : facture émise visible", (await fetch(`${site}/f/${issuedToken}`)).status === 200);
    check("page publique : brouillon introuvable", (await fetch(`${site}/f/${draftToken}`)).status === 404);
    check("page publique : faux jeton introuvable", (await fetch(`${site}/f/AAAAAAAAAAAAAAAAAAAAAAAA`)).status === 404);
    const pdf = await fetch(`${site}/f/${issuedToken}/pdf`);
    check("PDF public : application/pdf", pdf.headers.get("content-type") === "application/pdf");
  }
```

Usage : `CHECK_SITE_URL=http://localhost:3000 npm run check:rls` (serveur local lancé) puis avec l’URL de production après déploiement.

- [ ] **Step 4: Vérifier** — `npm run build` ; `npm run dev` puis `CHECK_SITE_URL=http://localhost:3000 npm run check:rls` → tout `PASS`. Ouvrir `/f/{jeton}` à 360 px : lisible, aucun débordement (le tableau défile horizontalement dans sa carte).

- [ ] **Step 5: Commit**

```bash
git add src/app/f scripts/check-rls.mjs
git commit -m "feat(factures): page publique de la facture et PDF public"
```

---

### Task 15: Tableau de bord

**Files:**
- Modify: `src/app/app/(main)/page.tsx`
- Create: `src/components/app/StatCard.tsx`, `src/components/app/RevenueChart.tsx`

**Interfaces:**
- Consumes: `dashboardRows` (Task 9), `dashboardStats` (Task 8), `formatMoney`, `formatCompact` (Task 2), `StatusBadge`, `displayStatus`.

- [ ] **Step 1: Lire la skill `dataviz`** (Skill tool) avant d’écrire `RevenueChart` ; appliquer ses règles (couleur unique teal, axe à zéro, étiquettes lisibles, valeur au survol/au toucher, contraste en thème clair). Le code ci-dessous est la base ; l’ajuster si la skill l’exige.

- [ ] **Step 2: `StatCard`**

```tsx
// src/components/app/StatCard.tsx
import Link from "next/link";
import { cn } from "@/lib/cn";

type Props = { label: string; amount: string; count: number; tone: "green" | "amber" | "red"; href: string };

const TONES = { green: "text-green-700", amber: "text-amber-700", red: "text-red-700" };

export function StatCard({ label, amount, count, tone, href }: Props) {
  return (
    <Link href={href} className={cn("rounded-2xl border bg-white p-5 transition hover:border-[#0F766E]", tone === "red" && count > 0 ? "border-red-200" : "border-slate-200")}>
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className={cn("mt-1 text-2xl font-extrabold", TONES[tone])}>{amount}</p>
      <p className="text-sm text-slate-500">{count} {count > 1 ? "factures" : "facture"}</p>
    </Link>
  );
}
```

- [ ] **Step 3: `RevenueChart`** (SVG maison, composant client pour l’interaction)

```tsx
// src/components/app/RevenueChart.tsx
"use client";

import { useState } from "react";
import type { MonthBar } from "@/lib/dashboard";
import { formatCompact, formatMoney } from "@/lib/money";
import type { Currency } from "@/lib/site";

export function RevenueChart({ months, currency }: { months: MonthBar[]; currency: Currency }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(...months.map((m) => m.amount), 1);
  const W = 600;
  const H = 180;
  const gap = 16;
  const barW = (W - gap * (months.length - 1)) / months.length;
  const shown = active ?? months.length - 1;

  return (
    <figure className="rounded-2xl border border-slate-200 bg-white p-5">
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="font-bold">Encaissé sur 6 mois</span>
        <span className="text-sm text-slate-500">
          {months[shown].label} : <span className="font-bold text-slate-900">{formatMoney(months[shown].amount, currency)}</span>
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H + 24}`} className="mt-4 w-full" role="img" aria-label={months.map((m) => `${m.label} ${formatMoney(m.amount, currency)}`).join(", ")}>
        <line x1={0} x2={W} y1={H} y2={H} stroke="#e2e8f0" />
        {months.map((m, i) => {
          const h = m.amount === 0 ? 2 : Math.max((m.amount / max) * (H - 20), 4);
          const x = i * (barW + gap);
          return (
            <g key={m.month} onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)} onClick={() => setActive(i)} className="cursor-pointer">
              <rect x={x} y={0} width={barW} height={H} fill="transparent" />
              <rect x={x} y={H - h} width={barW} height={h} rx={6} fill="#0F766E" opacity={shown === i ? 1 : 0.55} />
              {m.amount > 0 && <text x={x + barW / 2} y={H - h - 6} textAnchor="middle" fontSize={13} fill="#334155">{formatCompact(m.amount, currency)}</text>}
              <text x={x + barW / 2} y={H + 18} textAnchor="middle" fontSize={13} fill="#64748b">{m.label}</text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
```

- [ ] **Step 4: Page tableau de bord**

Remplacer le contenu de `src/app/app/(main)/page.tsx` :

```tsx
import { Building2, ChevronRight, FilePlus2, FileText, UserPlus } from "lucide-react";
import Link from "next/link";
import { RevenueChart } from "@/components/app/RevenueChart";
import { StatCard } from "@/components/app/StatCard";
import { StatusBadge } from "@/components/app/StatusBadge";
import { buttonClass } from "@/components/ui/button";
import { dashboardStats } from "@/lib/dashboard";
import { displayStatus, todayInDakar } from "@/lib/invoice-status";
import { formatMoney } from "@/lib/money";
import { displayName, profileCompletion } from "@/lib/profile";
import { dashboardRows } from "@/lib/repos";
import { getSession } from "@/lib/session";

const card = "flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 font-semibold transition hover:border-[#00C853]";

export default async function DashboardPage() {
  const { supabase, user, profile } = await getSession();
  const completion = profileCompletion(profile);
  const today = todayInDakar();
  const rows = await dashboardRows(supabase);
  const stats = dashboardStats(rows, profile.currency, today);
  const recent = [...rows].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 5);
  const money = (n: number) => formatMoney(n, profile.currency);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">Bonjour {displayName(profile, user.email)} 👋</h1>
          <p className="mt-1 text-slate-500">Voici où en sont vos factures.</p>
        </div>
        <Link href="/app/factures/nouvelle" className={buttonClass("brand", "md")}>
          <FilePlus2 className="h-5 w-5" aria-hidden="true" /> Nouvelle facture
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Encaissé ce mois-ci" amount={money(stats.collected.amount)} count={stats.collected.count} tone="green" href="/app/factures?statut=payees" />
        <StatCard label="En attente" amount={money(stats.pending.amount)} count={stats.pending.count} tone="amber" href="/app/factures?statut=attente" />
        <StatCard label="En retard" amount={money(stats.overdue.amount)} count={stats.overdue.count} tone="red" href="/app/factures?statut=retard" />
      </div>
      {stats.otherCurrencies.length > 0 && <p className="text-xs text-slate-500">Hors factures en {stats.otherCurrencies.join(", ")}.</p>}

      <RevenueChart months={stats.months} currency={profile.currency} />

      <section className="rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between px-5 pt-5">
          <h2 className="font-bold">Dernières factures</h2>
          {rows.length > 0 && <Link href="/app/factures" className="text-sm font-semibold text-[#0F766E]">Voir toutes les factures</Link>}
        </div>
        {recent.length === 0 ? (
          <div className="p-6 text-center">
            <FileText className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
            <p className="mt-2 font-bold">Créez votre première facture en 2 minutes</p>
            <Link href="/app/factures/nouvelle" className={buttonClass("brand", "md", "mt-4")}>Nouvelle facture</Link>
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {recent.map((r) => (
              <li key={r.id}>
                <Link href={`/app/factures/${r.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 truncate font-semibold">{r.number ?? "Brouillon"} <StatusBadge status={displayStatus(r, today)} /></p>
                    <p className="truncate text-sm text-slate-500">{r.client_name ?? "Sans client"}</p>
                  </div>
                  <span className="flex shrink-0 items-center gap-2 font-bold">{formatMoney(r.total, r.currency)}<ChevronRight className="h-5 w-5 text-slate-400" aria-hidden="true" /></span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {completion < 100 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Profil complété</h2>
            <span className="font-bold text-[#007A33]">{completion} %</span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-slate-100" role="progressbar" aria-label="Profil complété" aria-valuenow={completion} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-2 rounded-full bg-[#00C853]" style={{ width: `${completion}%` }} />
          </div>
          <p className="mt-3 text-sm text-slate-500">Ces informations apparaîtront sur vos factures.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Link href="/app/clients/nouveau" className={card}><UserPlus className="h-5 w-5 text-[#007A33]" aria-hidden="true" /> Ajouter un client</Link>
            <Link href="/app/parametres" className={card}><Building2 className="h-5 w-5 text-[#007A33]" aria-hidden="true" /> Compléter mon profil</Link>
          </div>
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Vérifier** — `npx tsc --noEmit`, `npm run lint`, `npm run build`. En local : chiffres cohérents avec les factures de test ; graphique lisible à 360 px (étiquettes sans chevauchement) ; clic sur une barre affiche sa valeur.

- [ ] **Step 6: Commit**

```bash
git add "src/app/app/(main)/page.tsx" src/components/app/StatCard.tsx src/components/app/RevenueChart.tsx
git commit -m "feat(tableau-de-bord): encaissé, en attente, en retard, graphique sur 6 mois et dernières factures"
```

---

### Task 16: Landing basculée vers l’inscription

**Files:**
- Modify: `src/components/landing/Hero.tsx`, `src/components/landing/Navbar.tsx`, `src/components/landing/Pricing.tsx`

- [ ] **Step 1: Modifier les liens**

- `Hero.tsx` : `<a href="#waitlist" …>Commencer gratuitement …` → `<Link href="/inscription" …>Créer mon compte gratuit <ArrowRight …/></Link>` (importer `Link` de `next/link`).
- `Navbar.tsx` : le bouton `href="#waitlist"` → `href="/inscription"` avec le libellé « Créer mon compte » (garder la variante courte `max-[374px]:hidden` sur « gratuit » si présente) ; ajouter juste avant un lien texte `<Link href="/connexion" className="text-sm font-semibold …">Se connecter</Link>` (reprendre la classe des liens de navigation existants).
- `Pricing.tsx` : `href="#waitlist"` → `href="/inscription"`.
- `FinalCta.tsx` (section liste d’attente) : inchangé, conformément à la spec.

- [ ] **Step 2: Vérifier** — `npm run build` ; en local, les trois boutons mènent à `/inscription`, « Se connecter » à `/connexion` ; à 360 px la barre de navigation tient sur une ligne.

- [ ] **Step 3: Commit**

```bash
git add src/components/landing
git commit -m "feat(landing): les boutons mènent à l'inscription, lien « Se connecter »"
```

---

### Task 17: Vérification finale et déploiement

- [ ] **Step 1:** `npm test && npx tsc --noEmit && npm run lint && npm run build` → tout vert.
- [ ] **Step 2:** `npm run check:rls` → tout `PASS`.
- [ ] **Step 3:** `git push origin main` ; attendre le déploiement Vercel (vérifier que `/f/x` répond 404 et non 500).
- [ ] **Step 4:** `CHECK_SITE_URL=https://factoo-wine.vercel.app npm run check:rls` → tout `PASS`.
- [ ] **Step 5: Parcours Playwright en production** (script hors projet dans le scratchpad, compte de test créé via l’API admin puis supprimé) : connexion → Paramètres › Paiement (numéro Wave) → nouvelle facture (nouveau client depuis la fenêtre, 3 lignes, remise 10 %, TVA 18 %) → brouillon → émission → `/app/factures/{id}/pdf` renvoie `application/pdf` non vide → page publique `/f/{jeton}` affiche le total et « Télécharger le PDF » → marquer payée → tableau de bord « Encaissé ce mois-ci » égal au TTC ; captures à 360 px et 1440 px sans débordement horizontal (`document.documentElement.scrollWidth <= innerWidth`).
- [ ] **Step 6:** Mettre à jour la mémoire projet (bloc 2b livré) et demander à l’utilisateur le test manuel : envoi WhatsApp réel depuis son téléphone, ouverture du lien par un tiers, lecture du PDF sur mobile.
