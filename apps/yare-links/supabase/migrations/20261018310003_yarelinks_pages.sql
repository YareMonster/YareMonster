-- Yare Links · migration 20261018310003 · pages, blocks, events, entries
--
-- A page is one public address with the owner's picture, a title, a bio, social icons and a list
-- of blocks: links, headers, text, embeds (YouTube, Spotify, SoundCloud), a video, a contact form,
-- an email sign-up, a contact card, a map. Each block can carry a thumbnail, be featured (a big
-- card), be highlighted, show only between two dates, be locked behind a code or an age check, or
-- be archived. The owner can send every visitor to one block for a while.
--
-- Visitors never read tables directly: yarelinks_open(slug) returns what the page shows right now,
-- yarelinks_track counts a view or a click (referrer host, country, device; nothing about who),
-- yarelinks_unlock opens a code-locked block, yarelinks_submit stores a form or sign-up entry.

-- ---------------------------------------------------------------- pages
create table if not exists public.yarelinks_pages (
  id                 uuid primary key default gen_random_uuid(),
  owner_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title              text not null default 'My links' check (char_length(title) between 1 and 80),
  bio                text not null default '' check (char_length(bio) <= 160),
  -- The public address is /<slug>. A few words are kept for the app itself.
  slug               text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 2 and 40
                       and slug not in ('pages', 'connections', 'reset', 'login', 'signin', 'api', 'assets', 'yare', 'admin', 'manage', 'settings', 'new')),
  status             text not null default 'draft' check (status in ('draft', 'published')),
  theme              text not null default 'paper',
  -- Pictures live in the public yare-images bucket (folder yare-links/<page id>/); the wallpaper and videos in the public yare-links bucket.
  avatar_path        text,
  logo_path          text,
  wallpaper_path     text,
  wallpaper_kind     text not null default 'none' check (wallpaper_kind in ('none', 'image', 'video')),
  layout             text not null default 'classic' check (layout in ('classic', 'hero')),
  button_shape       text not null default 'rounded' check (button_shape in ('rounded', 'pill', 'square')),
  button_fill        text not null default 'solid' check (button_fill in ('solid', 'outline', 'soft')),
  font               text not null default 'sans' check (font in ('sans', 'display', 'serif', 'mono')),
  -- [{ "network": "instagram", "url": "https://..." }, ...]
  socials            jsonb not null default '[]'::jsonb,
  socials_position   text not null default 'top' check (socials_position in ('top', 'bottom')),
  seo_title          text not null default '' check (char_length(seo_title) <= 70),
  seo_description    text not null default '' check (char_length(seo_description) <= 160),
  share_image_path   text,
  -- Send every visitor straight to one block until a time.
  redirect_block_id  uuid,
  redirect_until     timestamptz,
  views              integer not null default 0,
  clicks             integer not null default 0,
  published_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
comment on table public.yarelinks_pages is 'Yare Links: one row per page. A published page is readable by anyone through yarelinks_open.';
create index if not exists yarelinks_pages_owner_idx on public.yarelinks_pages (owner_id, updated_at desc);

-- ---------------------------------------------------------------- blocks
create table if not exists public.yarelinks_blocks (
  id              uuid primary key default gen_random_uuid(),
  page_id         uuid not null references public.yarelinks_pages (id) on delete cascade,
  position        integer not null default 0,
  type            text not null check (type in ('link', 'header', 'text', 'youtube', 'spotify', 'soundcloud', 'video', 'form', 'signup', 'contact', 'map')),
  title           text not null default '' check (char_length(title) <= 120),
  url             text not null default '' check (char_length(url) <= 2000),
  description     text not null default '' check (char_length(description) <= 500),
  thumbnail_path  text,
  -- Type-specific settings: videoPath, buttonLabel, fields for a form or a contact card, a map query.
  options         jsonb not null default '{}'::jsonb,
  featured        boolean not null default false,
  highlight       text not null default 'none' check (highlight in ('none', 'shake', 'pulse')),
  starts_at       timestamptz,
  ends_at         timestamptz,
  archived        boolean not null default false,
  lock_kind       text not null default 'none' check (lock_kind in ('none', 'code', 'age')),
  -- A salted SHA-256 of the code, never the code.
  lock_hash       text,
  lock_salt       text,
  min_age         integer check (min_age is null or min_age between 13 and 25),
  clicks          integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
comment on table public.yarelinks_blocks is 'Yare Links: the blocks of a page, in order.';
create index if not exists yarelinks_blocks_page_idx on public.yarelinks_blocks (page_id, position);
alter table public.yarelinks_pages drop constraint if exists yarelinks_pages_redirect_fk;
alter table public.yarelinks_pages add constraint yarelinks_pages_redirect_fk foreign key (redirect_block_id) references public.yarelinks_blocks (id) on delete set null;

-- ---------------------------------------------------------------- events (one row per view or click)
create table if not exists public.yarelinks_events (
  id          uuid primary key default gen_random_uuid(),
  page_id     uuid not null references public.yarelinks_pages (id) on delete cascade,
  block_id    uuid references public.yarelinks_blocks (id) on delete set null,
  kind        text not null check (kind in ('view', 'click')),
  -- Where the visitor came from (the host only), the country Cloudflare reports, the kind of device. Nothing about who.
  ref_host    text,
  country     text,
  device      text,
  created_at  timestamptz not null default now()
);
comment on table public.yarelinks_events is 'Yare Links: views and clicks. Referrer host, country and device, never a person.';
create index if not exists yarelinks_events_page_idx on public.yarelinks_events (page_id, created_at desc);

-- ---------------------------------------------------------------- entries (forms and sign-ups)
create table if not exists public.yarelinks_entries (
  id          uuid primary key default gen_random_uuid(),
  page_id     uuid not null references public.yarelinks_pages (id) on delete cascade,
  block_id    uuid references public.yarelinks_blocks (id) on delete set null,
  kind        text not null check (kind in ('form', 'signup')),
  -- name, email, phone, message: whatever the block asked for.
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
comment on table public.yarelinks_entries is 'Yare Links: what visitors typed into a form or a sign-up block.';
create index if not exists yarelinks_entries_page_idx on public.yarelinks_entries (page_id, created_at desc);

-- ---------------------------------------------------------------- updated_at
create or replace function public.yarelinks_set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists yarelinks_pages_set_updated_at on public.yarelinks_pages;
create trigger yarelinks_pages_set_updated_at before update on public.yarelinks_pages for each row execute function public.yarelinks_set_updated_at();
drop trigger if exists yarelinks_blocks_set_updated_at on public.yarelinks_blocks;
create trigger yarelinks_blocks_set_updated_at before update on public.yarelinks_blocks for each row execute function public.yarelinks_set_updated_at();

-- ---------------------------------------------------------------- row-level security (owner only; visitors go through the functions)
alter table public.yarelinks_pages enable row level security;
alter table public.yarelinks_blocks enable row level security;
alter table public.yarelinks_events enable row level security;
alter table public.yarelinks_entries enable row level security;
revoke all on public.yarelinks_pages, public.yarelinks_blocks, public.yarelinks_events, public.yarelinks_entries from anon;
grant select, insert, update, delete on public.yarelinks_pages, public.yarelinks_blocks to authenticated;
grant select, delete on public.yarelinks_events, public.yarelinks_entries to authenticated;

drop policy if exists "yarelinks_pages: owner all" on public.yarelinks_pages;
create policy "yarelinks_pages: owner all" on public.yarelinks_pages for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
drop policy if exists "yarelinks_blocks: owner all" on public.yarelinks_blocks;
create policy "yarelinks_blocks: owner all" on public.yarelinks_blocks for all to authenticated
  using (exists (select 1 from public.yarelinks_pages p where p.id = page_id and p.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.yarelinks_pages p where p.id = page_id and p.owner_id = (select auth.uid())));
drop policy if exists "yarelinks_events: owner reads" on public.yarelinks_events;
create policy "yarelinks_events: owner reads" on public.yarelinks_events for select to authenticated
  using (exists (select 1 from public.yarelinks_pages p where p.id = page_id and p.owner_id = (select auth.uid())));
drop policy if exists "yarelinks_events: owner deletes" on public.yarelinks_events;
create policy "yarelinks_events: owner deletes" on public.yarelinks_events for delete to authenticated
  using (exists (select 1 from public.yarelinks_pages p where p.id = page_id and p.owner_id = (select auth.uid())));
drop policy if exists "yarelinks_entries: owner reads" on public.yarelinks_entries;
create policy "yarelinks_entries: owner reads" on public.yarelinks_entries for select to authenticated
  using (exists (select 1 from public.yarelinks_pages p where p.id = page_id and p.owner_id = (select auth.uid())));
drop policy if exists "yarelinks_entries: owner deletes" on public.yarelinks_entries;
create policy "yarelinks_entries: owner deletes" on public.yarelinks_entries for delete to authenticated
  using (exists (select 1 from public.yarelinks_pages p where p.id = page_id and p.owner_id = (select auth.uid())));

-- ---------------------------------------------------------------- what a block shows a visitor
-- A code-locked block keeps its address and settings until yarelinks_unlock; everything else goes out as is.
create or replace function public.yarelinks_block_json(b public.yarelinks_blocks)
returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_build_object(
    'id', b.id, 'type', b.type, 'title', b.title, 'description', b.description, 'thumbnail_path', b.thumbnail_path,
    'featured', b.featured, 'highlight', b.highlight, 'lock_kind', b.lock_kind, 'min_age', b.min_age,
    'url', case when b.lock_kind = 'code' then '' else b.url end,
    'options', case when b.lock_kind = 'code' then '{}'::jsonb else b.options end);
$$;

-- ---------------------------------------------------------------- public: the page as it is right now
create or replace function public.yarelinks_open(p_slug text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare p public.yarelinks_pages%rowtype; v_redirect text;
begin
  select * into p from public.yarelinks_pages where slug = p_slug;
  if p.id is null or p.status <> 'published' then raise exception 'This page is not open.' using errcode = 'P0002'; end if;
  if p.redirect_block_id is not null and (p.redirect_until is null or p.redirect_until > now()) then
    select b.url into v_redirect from public.yarelinks_blocks b where b.id = p.redirect_block_id and b.type = 'link' and not b.archived and b.lock_kind = 'none';
  end if;
  return jsonb_build_object(
    'id', p.id, 'title', p.title, 'bio', p.bio, 'theme', p.theme, 'avatar_path', p.avatar_path, 'logo_path', p.logo_path,
    'wallpaper_path', p.wallpaper_path, 'wallpaper_kind', p.wallpaper_kind, 'layout', p.layout, 'button_shape', p.button_shape,
    'button_fill', p.button_fill, 'font', p.font, 'socials', p.socials, 'socials_position', p.socials_position,
    'seo_title', p.seo_title, 'seo_description', p.seo_description, 'share_image_path', p.share_image_path,
    'redirect_url', v_redirect,
    'blocks', coalesce((select jsonb_agg(public.yarelinks_block_json(b) order by b.position)
                          from public.yarelinks_blocks b
                         where b.page_id = p.id and not b.archived
                           and (b.starts_at is null or b.starts_at <= now()) and (b.ends_at is null or b.ends_at > now())), '[]'::jsonb));
end; $$;

-- ---------------------------------------------------------------- public: count a view or a click
create or replace function public.yarelinks_track(p_page_id uuid, p_block_id uuid, p_kind text, p_ref text, p_country text, p_device text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_kind not in ('view', 'click') then return; end if;
  if not exists (select 1 from public.yarelinks_pages where id = p_page_id and status = 'published') then return; end if;
  insert into public.yarelinks_events (page_id, block_id, kind, ref_host, country, device)
  values (p_page_id, case when p_kind = 'click' then p_block_id end, p_kind, left(p_ref, 120), left(upper(p_country), 2), left(p_device, 10));
  if p_kind = 'view' then update public.yarelinks_pages set views = views + 1 where id = p_page_id;
  else
    update public.yarelinks_pages set clicks = clicks + 1 where id = p_page_id;
    update public.yarelinks_blocks set clicks = clicks + 1 where id = p_block_id and page_id = p_page_id;
  end if;
end; $$;

-- ---------------------------------------------------------------- public: open a code-locked block
create or replace function public.yarelinks_unlock(p_block_id uuid, p_code text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare b public.yarelinks_blocks%rowtype;
begin
  select * into b from public.yarelinks_blocks where id = p_block_id;
  if b.id is null or b.lock_kind <> 'code' then raise exception 'Nothing to unlock.' using errcode = 'P0002'; end if;
  if encode(extensions.digest(coalesce(b.lock_salt, '') || ':' || coalesce(p_code, ''), 'sha256'), 'hex') <> coalesce(b.lock_hash, '') then
    raise exception 'That is not the code.' using errcode = 'P0001';
  end if;
  return jsonb_build_object('url', b.url, 'options', b.options);
end; $$;

-- ---------------------------------------------------------------- public: a form or sign-up entry
create or replace function public.yarelinks_submit(p_block_id uuid, p_data jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare b public.yarelinks_blocks%rowtype; v_data jsonb;
begin
  select * into b from public.yarelinks_blocks where id = p_block_id and not archived and type in ('form', 'signup');
  if b.id is null then raise exception 'This form is not open.' using errcode = 'P0002'; end if;
  if not exists (select 1 from public.yarelinks_pages where id = b.page_id and status = 'published') then raise exception 'This form is not open.' using errcode = 'P0002'; end if;
  -- Only the fields a block can ask for, each trimmed to a sane length.
  select jsonb_object_agg(k, left(v, 2000)) into v_data
    from jsonb_each_text(coalesce(p_data, '{}'::jsonb)) as t(k, v)
   where k in ('name', 'email', 'phone', 'message') and v <> '';
  if v_data is null or (b.type = 'signup' and v_data->>'email' is null) then raise exception 'Fill in the form first.' using errcode = 'P0001'; end if;
  insert into public.yarelinks_entries (page_id, block_id, kind, data) values (b.page_id, b.id, b.type, v_data);
end; $$;

revoke all on function public.yarelinks_open(text), public.yarelinks_track(uuid, uuid, text, text, text, text), public.yarelinks_unlock(uuid, text), public.yarelinks_submit(uuid, jsonb), public.yarelinks_block_json(public.yarelinks_blocks) from public;
grant execute on function public.yarelinks_open(text), public.yarelinks_track(uuid, uuid, text, text, text, text), public.yarelinks_unlock(uuid, text), public.yarelinks_submit(uuid, jsonb) to anon, authenticated;

-- ---------------------------------------------------------------- pictures (shared public bucket, own folder)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('yare-images', 'yare-images', true, 2097152, array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'])
on conflict (id) do nothing;
drop policy if exists "yare-images: public reads" on storage.objects;
create policy "yare-images: public reads" on storage.objects for select to anon, authenticated using (bucket_id = 'yare-images');
drop policy if exists "yare-images: yare-links owner writes" on storage.objects;
create policy "yare-images: yare-links owner writes" on storage.objects for insert to authenticated
  with check (bucket_id = 'yare-images' and (storage.foldername(name))[1] = 'yare-links' and owner_id = (select auth.uid())::text);
drop policy if exists "yare-images: yare-links owner deletes" on storage.objects;
create policy "yare-images: yare-links owner deletes" on storage.objects for delete to authenticated
  using (bucket_id = 'yare-images' and (storage.foldername(name))[1] = 'yare-links' and owner_id = (select auth.uid())::text);

-- ---------------------------------------------------------------- wallpapers and videos (public bucket, 50 MB per file; your plan may allow less)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('yare-links', 'yare-links', true, 52428800, array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime'])
on conflict (id) do nothing;
drop policy if exists "yare-links: public reads" on storage.objects;
create policy "yare-links: public reads" on storage.objects for select to anon, authenticated using (bucket_id = 'yare-links');
drop policy if exists "yare-links: owner writes" on storage.objects;
create policy "yare-links: owner writes" on storage.objects for insert to authenticated
  with check (bucket_id = 'yare-links' and exists (select 1 from public.yarelinks_pages p where p.id::text = (storage.foldername(name))[1] and p.owner_id = (select auth.uid())));
drop policy if exists "yare-links: owner deletes" on storage.objects;
create policy "yare-links: owner deletes" on storage.objects for delete to authenticated
  using (bucket_id = 'yare-links' and exists (select 1 from public.yarelinks_pages p where p.id::text = (storage.foldername(name))[1] and p.owner_id = (select auth.uid())));

create extension if not exists pgcrypto with schema extensions;
notify pgrst, 'reload schema';
