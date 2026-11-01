-- Yare Launcher · migration 0001 · the launcher_apps table
--
-- One row per tile on the launcher. Every table of this app is prefixed launcher_ so it can share
-- a Supabase project with other Yare Monster apps without colliding. Row-level security limits each row
-- to the account that created it; with sign-ups disabled that is the operator alone.
--
-- Apply with the Supabase SQL editor (paste and run) or the Supabase CLI (supabase db push).
-- Safe to re-run: every statement is idempotent.

create table if not exists public.launcher_apps (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Which Yare Monster app this tile points at, or 'custom' for anything else.
  slug        text not null default 'custom'
              check (slug in ('forms', 'sign', 'pages', 'contacts', 'meet', 'transfer', 'bill', 'book', 'looks', 'custom')),
  name        text not null check (char_length(name) between 1 and 80),
  -- https only, except localhost while testing.
  url         text not null check (url ~* '^(https://|http://localhost)'),
  note        text check (char_length(note) <= 280),
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.launcher_apps is 'Yare Launcher: tiles pointing at the apps the operator has deployed.';

create index if not exists launcher_apps_owner_idx on public.launcher_apps (owner_id, position, created_at);

-- Keep updated_at current.
create or replace function public.launcher_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists launcher_apps_set_updated_at on public.launcher_apps;
create trigger launcher_apps_set_updated_at
  before update on public.launcher_apps
  for each row execute function public.launcher_set_updated_at();

-- Access: signed-in owner only. Anonymous visitors get nothing.
alter table public.launcher_apps enable row level security;

revoke all on public.launcher_apps from anon;
grant select, insert, update, delete on public.launcher_apps to authenticated;

drop policy if exists "launcher_apps: owner reads" on public.launcher_apps;
create policy "launcher_apps: owner reads" on public.launcher_apps
  for select to authenticated
  using ((select auth.uid()) = owner_id);

drop policy if exists "launcher_apps: owner inserts" on public.launcher_apps;
create policy "launcher_apps: owner inserts" on public.launcher_apps
  for insert to authenticated
  with check ((select auth.uid()) = owner_id);

drop policy if exists "launcher_apps: owner updates" on public.launcher_apps;
create policy "launcher_apps: owner updates" on public.launcher_apps
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

drop policy if exists "launcher_apps: owner deletes" on public.launcher_apps;
create policy "launcher_apps: owner deletes" on public.launcher_apps
  for delete to authenticated
  using ((select auth.uid()) = owner_id);
