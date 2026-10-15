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
