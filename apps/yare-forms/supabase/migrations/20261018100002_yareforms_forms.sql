-- Yare Forms · migration 20261018100002 · forms, screens, responses, images
--
-- A form is a sequence of screens shown one at a time, like a conversation. Each screen is a
-- block: a welcome, a question of some type, or the closing thanks. A respondent produces one
-- response row whose answers live in one JSON object keyed by block id, so a form with 25
-- questions does not need a 25-column table; the Responses tab builds its columns from the blocks.
--
-- Access in short:
--   owner       everything on their own forms, blocks and responses (row-level security)
--   anonymous   may read a published form and its blocks by slug, and may create and fill in
--               ONE response through two functions that check a per-response token. Visitors
--               never write to tables directly.
--
-- Images (a logo, a welcome picture) live in the shared bucket "yare-images" under the folder
-- yare-forms/<form id>/. The bucket is public to read, owner-only to write.

-- ---------------------------------------------------------------- forms
create table if not exists public.yareforms_forms (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title         text not null default 'Untitled form' check (char_length(title) between 1 and 120),
  -- The public address is /f/<slug>. Lowercase letters, digits and hyphens.
  slug          text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 60),
  status        text not null default 'draft' check (status in ('draft', 'published')),
  theme         text not null default 'paper',
  -- Path inside the yare-images bucket, e.g. yare-forms/<id>/logo.png
  logo_path     text,
  settings      jsonb not null default '{}'::jsonb,
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
comment on table public.yareforms_forms is 'Yare Forms: one row per form. Published forms are readable by anyone who has the slug.';
create index if not exists yareforms_forms_owner_idx on public.yareforms_forms (owner_id, updated_at desc);

-- ---------------------------------------------------------------- blocks (screens)
create table if not exists public.yareforms_blocks (
  id          uuid primary key default gen_random_uuid(),
  form_id     uuid not null references public.yareforms_forms (id) on delete cascade,
  position    integer not null default 0,
  type        text not null check (type in (
                'welcome', 'end',
                'short_text', 'long_text', 'email', 'number', 'date',
                'multiple_choice', 'checkboxes', 'dropdown', 'yes_no'
              )),
  title       text not null default '' check (char_length(title) <= 300),
  description text not null default '' check (char_length(description) <= 1000),
  required    boolean not null default false,
  -- Type-specific settings: choices, maxLength, placeholder, buttonLabel, imagePath.
  options     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.yareforms_blocks is 'Yare Forms: the screens of a form, in order. One screen holds one question.';
create index if not exists yareforms_blocks_form_idx on public.yareforms_blocks (form_id, position);

-- ---------------------------------------------------------------- responses
create table if not exists public.yareforms_responses (
  id             uuid primary key default gen_random_uuid(),
  form_id        uuid not null references public.yareforms_forms (id) on delete cascade,
  -- Known only to the respondent's browser; required to add answers to this response.
  token          uuid not null default gen_random_uuid(),
  status         text not null default 'started' check (status in ('started', 'completed')),
  -- { "<block id>": <answer> } with strings, numbers, booleans or arrays of strings.
  answers        jsonb not null default '{}'::jsonb,
  -- The last screen the respondent reached; shows where people drop off.
  last_block_id  uuid references public.yareforms_blocks (id) on delete set null,
  started_at     timestamptz not null default now(),
  completed_at   timestamptz,
  updated_at     timestamptz not null default now()
);
comment on table public.yareforms_responses is 'Yare Forms: one row per respondent, answers as one JSON object keyed by block id.';
create index if not exists yareforms_responses_form_idx on public.yareforms_responses (form_id, started_at desc);

-- ---------------------------------------------------------------- updated_at
create or replace function public.yareforms_set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists yareforms_forms_set_updated_at on public.yareforms_forms;
create trigger yareforms_forms_set_updated_at before update on public.yareforms_forms
  for each row execute function public.yareforms_set_updated_at();
drop trigger if exists yareforms_blocks_set_updated_at on public.yareforms_blocks;
create trigger yareforms_blocks_set_updated_at before update on public.yareforms_blocks
  for each row execute function public.yareforms_set_updated_at();
drop trigger if exists yareforms_responses_set_updated_at on public.yareforms_responses;
create trigger yareforms_responses_set_updated_at before update on public.yareforms_responses
  for each row execute function public.yareforms_set_updated_at();

-- ---------------------------------------------------------------- row-level security
alter table public.yareforms_forms enable row level security;
alter table public.yareforms_blocks enable row level security;
alter table public.yareforms_responses enable row level security;

revoke all on public.yareforms_forms from anon;
revoke all on public.yareforms_blocks from anon;
revoke all on public.yareforms_responses from anon;
grant select on public.yareforms_forms to anon;
grant select on public.yareforms_blocks to anon;
grant select, insert, update, delete on public.yareforms_forms to authenticated;
grant select, insert, update, delete on public.yareforms_blocks to authenticated;
grant select, insert, update, delete on public.yareforms_responses to authenticated;

-- Owner: full access to own forms.
drop policy if exists "yareforms_forms: owner all" on public.yareforms_forms;
create policy "yareforms_forms: owner all" on public.yareforms_forms
  for all to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

-- Anyone: read a published form (by slug) and its blocks. Only the columns the runner needs
-- are harmless to expose; owner_id and settings are not secret but the client only selects what it shows.
drop policy if exists "yareforms_forms: public reads published" on public.yareforms_forms;
create policy "yareforms_forms: public reads published" on public.yareforms_forms
  for select to anon, authenticated
  using (status = 'published');

drop policy if exists "yareforms_blocks: owner all" on public.yareforms_blocks;
create policy "yareforms_blocks: owner all" on public.yareforms_blocks
  for all to authenticated
  using (exists (select 1 from public.yareforms_forms f where f.id = form_id and f.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.yareforms_forms f where f.id = form_id and f.owner_id = (select auth.uid())));

drop policy if exists "yareforms_blocks: public reads published" on public.yareforms_blocks;
create policy "yareforms_blocks: public reads published" on public.yareforms_blocks
  for select to anon, authenticated
  using (exists (select 1 from public.yareforms_forms f where f.id = form_id and f.status = 'published'));

-- Responses: the owner reads and deletes; nobody inserts or updates them directly (the functions below do).
drop policy if exists "yareforms_responses: owner reads" on public.yareforms_responses;
create policy "yareforms_responses: owner reads" on public.yareforms_responses
  for select to authenticated
  using (exists (select 1 from public.yareforms_forms f where f.id = form_id and f.owner_id = (select auth.uid())));
drop policy if exists "yareforms_responses: owner deletes" on public.yareforms_responses;
create policy "yareforms_responses: owner deletes" on public.yareforms_responses
  for delete to authenticated
  using (exists (select 1 from public.yareforms_forms f where f.id = form_id and f.owner_id = (select auth.uid())));

-- ---------------------------------------------------------------- respondent functions
-- Start a response for a published form. Returns the response id and its token.
create or replace function public.yareforms_start_response(p_slug text)
returns table (response_id uuid, token uuid)
language plpgsql security definer set search_path = '' as $$
declare v_form_id uuid;
begin
  select id into v_form_id from public.yareforms_forms where slug = p_slug and status = 'published';
  if v_form_id is null then raise exception 'This form is not available.' using errcode = 'P0002'; end if;
  return query
    insert into public.yareforms_responses (form_id) values (v_form_id)
    returning public.yareforms_responses.id, public.yareforms_responses.token;
end; $$;

-- Save one answer (or mark complete). The token proves the caller started this response.
create or replace function public.yareforms_save_answer(
  p_response_id uuid, p_token uuid, p_block_id uuid, p_value jsonb, p_complete boolean default false
) returns void
language plpgsql security definer set search_path = '' as $$
declare v_form_id uuid;
begin
  select r.form_id into v_form_id
    from public.yareforms_responses r
    join public.yareforms_forms f on f.id = r.form_id
   where r.id = p_response_id and r.token = p_token and f.status = 'published' and r.status = 'started';
  if v_form_id is null then raise exception 'This response cannot be changed.' using errcode = 'P0002'; end if;
  if p_block_id is not null and not exists (select 1 from public.yareforms_blocks b where b.id = p_block_id and b.form_id = v_form_id) then
    raise exception 'Unknown question.' using errcode = 'P0002';
  end if;
  if p_value is not null and pg_column_size(p_value) > 8000 then
    raise exception 'That answer is too long.' using errcode = '22001';
  end if;
  update public.yareforms_responses
     set answers = case when p_block_id is null or p_value is null then answers else answers || jsonb_build_object(p_block_id::text, p_value) end,
         last_block_id = coalesce(p_block_id, last_block_id),
         status = case when p_complete then 'completed' else status end,
         completed_at = case when p_complete then now() else completed_at end
   where id = p_response_id;
end; $$;

revoke all on function public.yareforms_start_response(text) from public;
revoke all on function public.yareforms_save_answer(uuid, uuid, uuid, jsonb, boolean) from public;
grant execute on function public.yareforms_start_response(text) to anon, authenticated;
grant execute on function public.yareforms_save_answer(uuid, uuid, uuid, jsonb, boolean) to anon, authenticated;

-- ---------------------------------------------------------------- images
-- One shared bucket for every Yare Monster app; each app keeps to its own folder. Public read, 2 MB files.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('yare-images', 'yare-images', true, 2097152, array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'])
on conflict (id) do nothing;

drop policy if exists "yare-images: public reads" on storage.objects;
create policy "yare-images: public reads" on storage.objects
  for select to anon, authenticated using (bucket_id = 'yare-images');

drop policy if exists "yare-images: yare-forms owner writes" on storage.objects;
create policy "yare-images: yare-forms owner writes" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'yare-images' and (storage.foldername(name))[1] = 'yare-forms' and owner_id = (select auth.uid())::text);
drop policy if exists "yare-images: yare-forms owner updates" on storage.objects;
create policy "yare-images: yare-forms owner updates" on storage.objects
  for update to authenticated
  using (bucket_id = 'yare-images' and (storage.foldername(name))[1] = 'yare-forms' and owner_id = (select auth.uid())::text);
drop policy if exists "yare-images: yare-forms owner deletes" on storage.objects;
create policy "yare-images: yare-forms owner deletes" on storage.objects
  for delete to authenticated
  using (bucket_id = 'yare-images' and (storage.foldername(name))[1] = 'yare-forms' and owner_id = (select auth.uid())::text);
