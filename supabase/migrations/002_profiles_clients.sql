-- Bloc 2a : profils d'entreprise, clients, stockage des logos.

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

-- RLS : chaque utilisateur ne voit et ne modifie que ses propres lignes
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
