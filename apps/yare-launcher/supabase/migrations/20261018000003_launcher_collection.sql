-- Yare Launcher · migration 20261018000003 · the collection and the connections
--
-- The launcher is the place to set up the whole collection, so it stops being a list of
-- addresses. Every Yare Monster app has at most one row per owner, with a status the operator sets
-- themselves (the launcher does not probe deployments) and an optional address once it exists.
-- launcher_settings keeps the operator's own repository address for the generated setup guide.

-- One row per app per owner; the address is optional now.
alter table public.launcher_apps alter column url drop not null;
alter table public.launcher_apps alter column name drop not null;
alter table public.launcher_apps
  add column if not exists status text not null default 'not_set_up'
  check (status in ('not_set_up', 'set_up'));
create unique index if not exists launcher_apps_owner_slug_idx on public.launcher_apps (owner_id, slug);

comment on column public.launcher_apps.status is 'Set by the operator. The launcher does not check deployments.';

-- The operator's connections. One row per owner.
create table if not exists public.launcher_settings (
  owner_id         uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  -- The operator's own copy of the repository (a fork or a mirror), used in the setup guide.
  github_repo_url  text check (github_repo_url is null or github_repo_url ~* '^https://github\.com/'),
  updated_at       timestamptz not null default now()
);

comment on table public.launcher_settings is 'Yare Launcher: the operator''s connections (their repository address).';

drop trigger if exists launcher_settings_set_updated_at on public.launcher_settings;
create trigger launcher_settings_set_updated_at
  before update on public.launcher_settings
  for each row execute function public.launcher_set_updated_at();

alter table public.launcher_settings enable row level security;
revoke all on public.launcher_settings from anon;
grant select, insert, update, delete on public.launcher_settings to authenticated;

drop policy if exists "launcher_settings: owner reads" on public.launcher_settings;
create policy "launcher_settings: owner reads" on public.launcher_settings
  for select to authenticated using ((select auth.uid()) = owner_id);
drop policy if exists "launcher_settings: owner inserts" on public.launcher_settings;
create policy "launcher_settings: owner inserts" on public.launcher_settings
  for insert to authenticated with check ((select auth.uid()) = owner_id);
drop policy if exists "launcher_settings: owner updates" on public.launcher_settings;
create policy "launcher_settings: owner updates" on public.launcher_settings
  for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
drop policy if exists "launcher_settings: owner deletes" on public.launcher_settings;
create policy "launcher_settings: owner deletes" on public.launcher_settings
  for delete to authenticated using ((select auth.uid()) = owner_id);
