-- Yare Pages · migration 20261018180003 · websites, their visitors, the Cloudflare token
--
-- A website is an address the person owns: one they are building with the guide, or one they
-- already have. The yarepages-sync Edge Function reads its visitors from Cloudflare through the
-- person's own API token (analytics read only) and fills the tables below. The app only reads.
--
-- Access in short: owner everything on their own rows (row-level security); anonymous nothing.
-- Preview pictures the person uploads go to the shared public bucket "yare-images", folder
-- yare-pages/<site id>/; the social image of the site itself is just a link.

-- ---------------------------------------------------------------- sites
create table if not exists public.yarepages_sites (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name            text not null check (char_length(name) between 1 and 80),
  -- https://yourname.com, or empty while a new site has no address yet.
  url             text not null default '' check (url = '' or url ~ '^https?://'),
  -- Lowercase host taken from the url, the key for Cloudflare lookups.
  host            text not null default '',
  -- new: being built with the guide. existing: brought in as it is.
  kind            text not null default 'new' check (kind in ('new', 'existing')),
  status          text not null default 'building' check (status in ('building', 'live')),
  -- Where the visitors come from: zone (the domain is on Cloudflare), beacon (Cloudflare Web Analytics on the page), none.
  source          text not null default 'none' check (source in ('zone', 'beacon', 'none')),
  zone_id         text,
  site_tag        text,
  repo_url        text not null default '' check (repo_url = '' or repo_url ~ '^https?://'),
  -- The site's own social image, found by the sync.
  preview_url     text,
  -- A picture the person uploaded to the bucket; wins over preview_url.
  preview_path    text,
  page_title      text not null default '',
  -- The build checklist: { "<step id>": true }.
  checklist       jsonb not null default '{}'::jsonb,
  notes           text not null default '' check (char_length(notes) <= 2000),
  position        integer not null default 0,
  sync_status     text not null default 'new' check (sync_status in ('new', 'syncing', 'ready', 'error')),
  sync_error      text,
  last_synced_at  timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
comment on table public.yarepages_sites is 'Yare Pages: one row per website the person builds or brings.';
create index if not exists yarepages_sites_owner_idx on public.yarepages_sites (owner_id, position);

-- ---------------------------------------------------------------- visitors, by day
create table if not exists public.yarepages_days (
  site_id     uuid not null references public.yarepages_sites (id) on delete cascade,
  day         date not null,
  visits      integer not null default 0,
  page_views  integer not null default 0,
  uniques     integer not null default 0,
  primary key (site_id, day)
);
comment on table public.yarepages_days is 'Yare Pages: visits, page views and unique visitors per day, from Cloudflare.';

-- ---------------------------------------------------------------- top pages, countries, referrers (last 30 days)
create table if not exists public.yarepages_tops (
  id        uuid primary key default gen_random_uuid(),
  site_id   uuid not null references public.yarepages_sites (id) on delete cascade,
  kind      text not null check (kind in ('page', 'country', 'referrer')),
  label     text not null,
  visits    integer not null default 0,
  position  integer not null default 0
);
comment on table public.yarepages_tops is 'Yare Pages: the top pages, countries and referrers of the last thirty days, rebuilt by every sync.';
create index if not exists yarepages_tops_site_idx on public.yarepages_tops (site_id, kind, position);

-- ---------------------------------------------------------------- the Cloudflare token, pasted in the app
create table if not exists public.yarepages_keys (
  owner_id    uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  cloudflare  text,
  updated_at  timestamptz not null default now()
);
comment on table public.yarepages_keys is 'Yare Pages: the owner''s Cloudflare API token (analytics read). Written through yarepages_set_key, read only by the sync function.';

alter table public.yarepages_keys enable row level security;
revoke all on public.yarepages_keys from anon, authenticated;

create or replace function public.yarepages_set_key(p_service text, p_value text)
returns void
language plpgsql security definer set search_path = '' as $$
declare v_owner uuid := auth.uid(); v_value text := nullif(trim(p_value), '');
begin
  if v_owner is null then raise exception 'Sign in first.' using errcode = '28000'; end if;
  if p_service <> 'cloudflare' then raise exception 'Unknown service.' using errcode = '22023'; end if;
  if v_value is not null and char_length(v_value) > 200 then raise exception 'That does not look like a token.' using errcode = '22023'; end if;
  insert into public.yarepages_keys (owner_id) values (v_owner) on conflict (owner_id) do nothing;
  update public.yarepages_keys set cloudflare = v_value, updated_at = now() where owner_id = v_owner;
end; $$;

create or replace function public.yarepages_key_status()
returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('cloudflare', coalesce((select k.cloudflare is not null from public.yarepages_keys k where k.owner_id = auth.uid()), false));
$$;

revoke all on function public.yarepages_set_key(text, text) from public;
revoke all on function public.yarepages_key_status() from public;
grant execute on function public.yarepages_set_key(text, text) to authenticated;
grant execute on function public.yarepages_key_status() to authenticated;

-- ---------------------------------------------------------------- updated_at
create or replace function public.yarepages_set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists yarepages_sites_set_updated_at on public.yarepages_sites;
create trigger yarepages_sites_set_updated_at before update on public.yarepages_sites
  for each row execute function public.yarepages_set_updated_at();

-- ---------------------------------------------------------------- row-level security
alter table public.yarepages_sites enable row level security;
alter table public.yarepages_days enable row level security;
alter table public.yarepages_tops enable row level security;
revoke all on public.yarepages_sites, public.yarepages_days, public.yarepages_tops from anon;
grant select, insert, update, delete on public.yarepages_sites to authenticated;
grant select on public.yarepages_days, public.yarepages_tops to authenticated;

drop policy if exists "yarepages_sites: owner all" on public.yarepages_sites;
create policy "yarepages_sites: owner all" on public.yarepages_sites
  for all to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
drop policy if exists "yarepages_days: owner reads" on public.yarepages_days;
create policy "yarepages_days: owner reads" on public.yarepages_days
  for select to authenticated
  using (exists (select 1 from public.yarepages_sites s where s.id = site_id and s.owner_id = (select auth.uid())));
drop policy if exists "yarepages_tops: owner reads" on public.yarepages_tops;
create policy "yarepages_tops: owner reads" on public.yarepages_tops
  for select to authenticated
  using (exists (select 1 from public.yarepages_sites s where s.id = site_id and s.owner_id = (select auth.uid())));

-- ---------------------------------------------------------------- preview pictures (shared public bucket, own folder)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('yare-images', 'yare-images', true, 2097152, array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'])
on conflict (id) do nothing;

drop policy if exists "yare-images: public reads" on storage.objects;
create policy "yare-images: public reads" on storage.objects
  for select to anon, authenticated using (bucket_id = 'yare-images');
drop policy if exists "yare-images: yare-pages owner writes" on storage.objects;
create policy "yare-images: yare-pages owner writes" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'yare-images' and (storage.foldername(name))[1] = 'yare-pages' and owner_id = (select auth.uid())::text);
drop policy if exists "yare-images: yare-pages owner updates" on storage.objects;
create policy "yare-images: yare-pages owner updates" on storage.objects
  for update to authenticated
  using (bucket_id = 'yare-images' and (storage.foldername(name))[1] = 'yare-pages' and owner_id = (select auth.uid())::text);
drop policy if exists "yare-images: yare-pages owner deletes" on storage.objects;
create policy "yare-images: yare-pages owner deletes" on storage.objects
  for delete to authenticated
  using (bucket_id = 'yare-images' and (storage.foldername(name))[1] = 'yare-pages' and owner_id = (select auth.uid())::text);
