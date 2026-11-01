-- Yare Transfer · migration 20261018140003 · transfers, files, downloads, settings
--
-- A transfer is a link that hands out files, like a form is a link that collects answers. The
-- owner uploads files to a PRIVATE bucket, writes a title and a few lines, picks a look, sets how
-- many days the link lives (seven at most) and, if they like, a password. Publishing makes the
-- link live. Nobody downloads from the bucket directly: the yaretransfer-file Edge Function checks
-- the link, the expiry and the password, counts the download, and hands out a short-lived address.
--
-- Access in short: owner everything on their own rows (row-level security); anonymous may read
-- what a published, unexpired transfer shows (title, text, picture, file names and sizes) through
-- yaretransfer_open(slug). Expired files are removed by the function when the transfer is next
-- touched or the owner opens the app.

-- ---------------------------------------------------------------- transfers
create table if not exists public.yaretransfer_transfers (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title           text not null default 'Untitled transfer' check (char_length(title) between 1 and 120),
  body            text not null default '' check (char_length(body) <= 2000),
  -- The public address is /t/<slug>.
  slug            text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 60),
  status          text not null default 'draft' check (status in ('draft', 'published')),
  theme           text not null default 'paper',
  -- Paths inside the public yare-images bucket, folder yare-transfer/<id>/.
  logo_path       text,
  image_path      text,
  -- How many days the link lives after publishing. Seven at most.
  expiry_days     integer not null default 7 check (expiry_days between 1 and 7),
  expires_at      timestamptz,
  -- A salted SHA-256 of the password, or null for no password.
  password_hash   text,
  password_salt   text,
  button_label    text not null default 'Download' check (char_length(button_label) <= 40),
  opens           integer not null default 0,
  downloads       integer not null default 0,
  -- True once the function removed the files after expiry.
  files_removed   boolean not null default false,
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
comment on table public.yaretransfer_transfers is 'Yare Transfer: one row per transfer link.';
create index if not exists yaretransfer_transfers_owner_idx on public.yaretransfer_transfers (owner_id, updated_at desc);

-- ---------------------------------------------------------------- files
create table if not exists public.yaretransfer_files (
  id            uuid primary key default gen_random_uuid(),
  transfer_id   uuid not null references public.yaretransfer_transfers (id) on delete cascade,
  position      integer not null default 0,
  name          text not null check (char_length(name) between 1 and 255),
  size_bytes    bigint not null default 0,
  content_type  text not null default '',
  -- <transfer id>/<file id>/<name> inside the private yare-transfer bucket.
  storage_path  text not null,
  downloads     integer not null default 0,
  created_at    timestamptz not null default now()
);
comment on table public.yaretransfer_files is 'Yare Transfer: the files of a transfer, in order.';
create index if not exists yaretransfer_files_transfer_idx on public.yaretransfer_files (transfer_id, position);

-- ---------------------------------------------------------------- downloads (one row per hand-out)
create table if not exists public.yaretransfer_downloads (
  id            uuid primary key default gen_random_uuid(),
  transfer_id   uuid not null references public.yaretransfer_transfers (id) on delete cascade,
  file_id       uuid references public.yaretransfer_files (id) on delete set null,
  created_at    timestamptz not null default now()
);
comment on table public.yaretransfer_downloads is 'Yare Transfer: when a file was handed out. No addresses, no names.';
create index if not exists yaretransfer_downloads_transfer_idx on public.yaretransfer_downloads (transfer_id, created_at desc);

-- ---------------------------------------------------------------- settings (one row per owner)
create table if not exists public.yaretransfer_settings (
  owner_id      uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  -- The largest file the app accepts, in megabytes. Your Supabase plan has its own ceiling.
  max_file_mb   integer not null default 20 check (max_file_mb between 1 and 1024),
  updated_at    timestamptz not null default now()
);
comment on table public.yaretransfer_settings is 'Yare Transfer: the owner''s limits.';

-- ---------------------------------------------------------------- updated_at
create or replace function public.yaretransfer_set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists yaretransfer_transfers_set_updated_at on public.yaretransfer_transfers;
create trigger yaretransfer_transfers_set_updated_at before update on public.yaretransfer_transfers
  for each row execute function public.yaretransfer_set_updated_at();
drop trigger if exists yaretransfer_settings_set_updated_at on public.yaretransfer_settings;
create trigger yaretransfer_settings_set_updated_at before update on public.yaretransfer_settings
  for each row execute function public.yaretransfer_set_updated_at();

-- ---------------------------------------------------------------- row-level security
alter table public.yaretransfer_transfers enable row level security;
alter table public.yaretransfer_files enable row level security;
alter table public.yaretransfer_downloads enable row level security;
alter table public.yaretransfer_settings enable row level security;
revoke all on public.yaretransfer_transfers, public.yaretransfer_files, public.yaretransfer_downloads, public.yaretransfer_settings from anon;
grant select, insert, update, delete on public.yaretransfer_transfers, public.yaretransfer_files, public.yaretransfer_settings to authenticated;
grant select, delete on public.yaretransfer_downloads to authenticated;

drop policy if exists "yaretransfer_transfers: owner all" on public.yaretransfer_transfers;
create policy "yaretransfer_transfers: owner all" on public.yaretransfer_transfers
  for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
drop policy if exists "yaretransfer_files: owner all" on public.yaretransfer_files;
create policy "yaretransfer_files: owner all" on public.yaretransfer_files
  for all to authenticated
  using (exists (select 1 from public.yaretransfer_transfers t where t.id = transfer_id and t.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.yaretransfer_transfers t where t.id = transfer_id and t.owner_id = (select auth.uid())));
drop policy if exists "yaretransfer_downloads: owner reads" on public.yaretransfer_downloads;
create policy "yaretransfer_downloads: owner reads" on public.yaretransfer_downloads
  for select to authenticated
  using (exists (select 1 from public.yaretransfer_transfers t where t.id = transfer_id and t.owner_id = (select auth.uid())));
drop policy if exists "yaretransfer_downloads: owner deletes" on public.yaretransfer_downloads;
create policy "yaretransfer_downloads: owner deletes" on public.yaretransfer_downloads
  for delete to authenticated
  using (exists (select 1 from public.yaretransfer_transfers t where t.id = transfer_id and t.owner_id = (select auth.uid())));
drop policy if exists "yaretransfer_settings: owner all" on public.yaretransfer_settings;
create policy "yaretransfer_settings: owner all" on public.yaretransfer_settings
  for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

-- ---------------------------------------------------------------- owner function: publish
-- Starts the clock: the link lives expiry_days from now.
create or replace function public.yaretransfer_publish(p_id uuid)
returns void
language plpgsql security invoker set search_path = '' as $$
declare v_days integer;
begin
  select expiry_days into v_days from public.yaretransfer_transfers where id = p_id and owner_id = (select auth.uid());
  if v_days is null then raise exception 'Transfer not found.' using errcode = 'P0002'; end if;
  if not exists (select 1 from public.yaretransfer_files f where f.transfer_id = p_id) then
    raise exception 'Add at least one file first.' using errcode = 'P0001';
  end if;
  update public.yaretransfer_transfers
     set status = 'published', published_at = now(), expires_at = now() + make_interval(days => v_days), files_removed = false
   where id = p_id;
end; $$;

-- ---------------------------------------------------------------- public function: what the link shows
-- Title, text, picture, look, the files' names and sizes, whether a password is needed, and whether it
-- is still open. Never a storage path. Counts the open.
create or replace function public.yaretransfer_open(p_slug text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v public.yaretransfer_transfers%rowtype; v_open boolean;
begin
  select * into v from public.yaretransfer_transfers where slug = p_slug;
  if v.id is null or v.status <> 'published' then raise exception 'This link is not open.' using errcode = 'P0002'; end if;
  v_open := v.expires_at is not null and v.expires_at > now();
  if v_open then update public.yaretransfer_transfers set opens = opens + 1 where id = v.id; end if;
  return jsonb_build_object(
    'id', v.id, 'title', v.title, 'body', v.body, 'theme', v.theme, 'logo_path', v.logo_path, 'image_path', v.image_path,
    'button_label', v.button_label, 'expires_at', v.expires_at, 'open', v_open, 'needs_password', v.password_hash is not null,
    'files', case when v_open then coalesce((select jsonb_agg(jsonb_build_object('id', f.id, 'name', f.name, 'size_bytes', f.size_bytes, 'content_type', f.content_type) order by f.position) from public.yaretransfer_files f where f.transfer_id = v.id), '[]'::jsonb) else '[]'::jsonb end
  );
end; $$;

revoke all on function public.yaretransfer_publish(uuid) from public;
revoke all on function public.yaretransfer_open(text) from public;
grant execute on function public.yaretransfer_publish(uuid) to authenticated;
grant execute on function public.yaretransfer_open(text) to anon, authenticated;

-- ---------------------------------------------------------------- the files bucket (private, 1 GB per file at most; your plan may allow less)
insert into storage.buckets (id, name, public, file_size_limit)
values ('yare-transfer', 'yare-transfer', false, 1073741824)
on conflict (id) do nothing;

drop policy if exists "yare-transfer: owner reads" on storage.objects;
create policy "yare-transfer: owner reads" on storage.objects
  for select to authenticated
  using (bucket_id = 'yare-transfer' and exists (select 1 from public.yaretransfer_transfers t where t.id::text = (storage.foldername(name))[1] and t.owner_id = (select auth.uid())));
drop policy if exists "yare-transfer: owner writes" on storage.objects;
create policy "yare-transfer: owner writes" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'yare-transfer' and exists (select 1 from public.yaretransfer_transfers t where t.id::text = (storage.foldername(name))[1] and t.owner_id = (select auth.uid())));
drop policy if exists "yare-transfer: owner deletes" on storage.objects;
create policy "yare-transfer: owner deletes" on storage.objects
  for delete to authenticated
  using (bucket_id = 'yare-transfer' and exists (select 1 from public.yaretransfer_transfers t where t.id::text = (storage.foldername(name))[1] and t.owner_id = (select auth.uid())));

-- ---------------------------------------------------------------- pictures (shared public bucket, own folder)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('yare-images', 'yare-images', true, 2097152, array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'])
on conflict (id) do nothing;
drop policy if exists "yare-images: public reads" on storage.objects;
create policy "yare-images: public reads" on storage.objects
  for select to anon, authenticated using (bucket_id = 'yare-images');
drop policy if exists "yare-images: yare-transfer owner writes" on storage.objects;
create policy "yare-images: yare-transfer owner writes" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'yare-images' and (storage.foldername(name))[1] = 'yare-transfer' and owner_id = (select auth.uid())::text);
drop policy if exists "yare-images: yare-transfer owner deletes" on storage.objects;
create policy "yare-images: yare-transfer owner deletes" on storage.objects
  for delete to authenticated
  using (bucket_id = 'yare-images' and (storage.foldername(name))[1] = 'yare-transfer' and owner_id = (select auth.uid())::text);

-- ---------------------------------------------------------------- counting, for the function
create or replace function public.yaretransfer_count_download(p_transfer_id uuid, p_file_id uuid)
returns void language sql security definer set search_path = '' as $$
  update public.yaretransfer_transfers set downloads = downloads + 1 where id = p_transfer_id;
  update public.yaretransfer_files set downloads = downloads + 1 where id = p_file_id;
$$;
revoke all on function public.yaretransfer_count_download(uuid, uuid) from public;
