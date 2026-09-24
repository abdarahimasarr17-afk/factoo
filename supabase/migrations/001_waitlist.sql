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
