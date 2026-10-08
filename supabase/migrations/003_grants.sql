-- Droits d'accès aux tables. Les projets Supabase récents ne les accordent plus automatiquement.
-- Les règles RLS (migration 002) restent la barrière qui limite chaque utilisateur à ses propres lignes.

grant usage on schema public to anon, authenticated, service_role;

-- Serveur (clé secrète) : liste d'attente, scripts d'administration.
grant all on public.waitlist, public.profiles, public.clients to service_role;

-- Utilisateurs connectés : leur profil (créé par trigger, jamais inséré directement) et leurs clients (archivés, jamais supprimés).
grant select, update on public.profiles to authenticated;
grant select, insert, update on public.clients to authenticated;

-- Visiteurs non connectés : aucun accès aux tables.
revoke all on public.waitlist, public.profiles, public.clients from anon;
