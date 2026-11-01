-- Yare Sign · migration 20261018110003 · envelopes, documents, participants, fields, events, settings
--
-- An envelope is a set of PDF documents sent to people for signature, like a form is a set of
-- screens. Each participant is a signer or a viewer; each signer gets a secret link. Fields are
-- the boxes placed on the pages (signature, name, date, text), each assigned to one participant.
-- A signature is a response: the signer fills their fields and the envelope records it.
--
-- Access in short:
--   owner       everything on their own envelopes (row-level security)
--   anonymous   nothing on the tables. A signer reads and writes through two functions that
--               check their secret token: yaresign_open(token) and yaresign_sign(token, values).
--
-- Documents and nothing else go in the PRIVATE bucket "yare-sign", under <envelope id>/. Only the
-- owner reads and writes there directly; signers get a short-lived link from the yaresign-file
-- Edge Function after their token is checked. Signature images are kept in the field values as
-- PNG data URLs, so the final PDF can be composed without another round of storage access.

-- ---------------------------------------------------------------- envelopes
create table if not exists public.yaresign_envelopes (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title         text not null default 'Untitled document' check (char_length(title) between 1 and 160),
  -- draft: being prepared. sent: links are live. completed: every signer signed. voided: cancelled by the owner.
  status        text not null default 'draft' check (status in ('draft', 'sent', 'completed', 'voided')),
  -- When true, signers sign one after the other in their position order; otherwise all at once.
  ordered       boolean not null default false,
  -- A few lines shown in the email and above the document.
  message       text not null default '' check (char_length(message) <= 2000),
  settings      jsonb not null default '{}'::jsonb,
  sent_at       timestamptz,
  completed_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
comment on table public.yaresign_envelopes is 'Yare Sign: one row per document set sent for signature.';
create index if not exists yaresign_envelopes_owner_idx on public.yaresign_envelopes (owner_id, updated_at desc);

-- ---------------------------------------------------------------- documents
create table if not exists public.yaresign_documents (
  id            uuid primary key default gen_random_uuid(),
  envelope_id   uuid not null references public.yaresign_envelopes (id) on delete cascade,
  position      integer not null default 0,
  name          text not null check (char_length(name) between 1 and 200),
  -- Path inside the yare-sign bucket: <envelope id>/<document id>.pdf
  storage_path  text not null,
  page_count    integer not null check (page_count between 1 and 500),
  -- [{ "w": points, "h": points }] per page, so fields can be placed before the PDF is loaded.
  page_sizes    jsonb not null default '[]'::jsonb,
  size_bytes    integer not null default 0,
  created_at    timestamptz not null default now()
);
comment on table public.yaresign_documents is 'Yare Sign: the PDF files of an envelope, in order.';
create index if not exists yaresign_documents_envelope_idx on public.yaresign_documents (envelope_id, position);

-- ---------------------------------------------------------------- participants
create table if not exists public.yaresign_participants (
  id              uuid primary key default gen_random_uuid(),
  envelope_id     uuid not null references public.yaresign_envelopes (id) on delete cascade,
  position        integer not null default 0,
  role            text not null default 'signer' check (role in ('signer', 'viewer')),
  first_name      text not null default '' check (char_length(first_name) <= 80),
  last_name       text not null default '' check (char_length(last_name) <= 80),
  email           text not null default '' check (char_length(email) <= 200),
  company         text not null default '' check (char_length(company) <= 120),
  job_title       text not null default '' check (char_length(job_title) <= 120),
  -- Known only to this participant: their link is /s/<token>.
  token           uuid not null unique default gen_random_uuid(),
  -- pending: not yet reached. sent: emailed or link handed over. viewed: opened the link. signed: done.
  status          text not null default 'pending' check (status in ('pending', 'sent', 'viewed', 'signed')),
  typed_name      text not null default '' check (char_length(typed_name) <= 200),
  sent_at         timestamptz,
  viewed_at       timestamptz,
  signed_at       timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
comment on table public.yaresign_participants is 'Yare Sign: the people on an envelope. Signers sign; viewers get the result.';
create index if not exists yaresign_participants_envelope_idx on public.yaresign_participants (envelope_id, position);

-- ---------------------------------------------------------------- fields
create table if not exists public.yaresign_fields (
  id              uuid primary key default gen_random_uuid(),
  envelope_id     uuid not null references public.yaresign_envelopes (id) on delete cascade,
  document_id     uuid not null references public.yaresign_documents (id) on delete cascade,
  participant_id  uuid not null references public.yaresign_participants (id) on delete cascade,
  page            integer not null check (page >= 1),
  type            text not null check (type in ('signature', 'name', 'date', 'text')),
  -- Position and size as fractions of the page (0 to 1), so they survive any zoom.
  x               double precision not null check (x >= 0 and x <= 1),
  y               double precision not null check (y >= 0 and y <= 1),
  w               double precision not null check (w > 0 and w <= 1),
  h               double precision not null check (h > 0 and h <= 1),
  required        boolean not null default true,
  label           text not null default '' check (char_length(label) <= 80),
  -- Filled at signing: a PNG data URL for signatures, text otherwise.
  value           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
comment on table public.yaresign_fields is 'Yare Sign: the boxes placed on the pages, each for one participant.';
create index if not exists yaresign_fields_envelope_idx on public.yaresign_fields (envelope_id);
create index if not exists yaresign_fields_document_idx on public.yaresign_fields (document_id, page);

-- ---------------------------------------------------------------- events (the audit trail)
create table if not exists public.yaresign_events (
  id              uuid primary key default gen_random_uuid(),
  envelope_id     uuid not null references public.yaresign_envelopes (id) on delete cascade,
  participant_id  uuid references public.yaresign_participants (id) on delete set null,
  type            text not null check (type in ('created', 'sent', 'emailed', 'viewed', 'signed', 'completed', 'voided', 'email_failed')),
  detail          jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);
comment on table public.yaresign_events is 'Yare Sign: what happened to an envelope, in order.';
create index if not exists yaresign_events_envelope_idx on public.yaresign_events (envelope_id, created_at);

-- ---------------------------------------------------------------- settings (one row per owner)
create table if not exists public.yaresign_settings (
  owner_id      uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  -- The From address of the emails. Must be on a domain verified with the email provider.
  from_email    text not null default '' check (char_length(from_email) <= 200),
  sender_name   text not null default '' check (char_length(sender_name) <= 120),
  -- The public address of this deployment; links in emails start with it.
  app_url       text not null default '' check (char_length(app_url) <= 300),
  updated_at    timestamptz not null default now()
);
comment on table public.yaresign_settings is 'Yare Sign: the owner''s email settings. The provider key is a Supabase secret, never a row.';

-- ---------------------------------------------------------------- updated_at
create or replace function public.yaresign_set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists yaresign_envelopes_set_updated_at on public.yaresign_envelopes;
create trigger yaresign_envelopes_set_updated_at before update on public.yaresign_envelopes
  for each row execute function public.yaresign_set_updated_at();
drop trigger if exists yaresign_participants_set_updated_at on public.yaresign_participants;
create trigger yaresign_participants_set_updated_at before update on public.yaresign_participants
  for each row execute function public.yaresign_set_updated_at();
drop trigger if exists yaresign_fields_set_updated_at on public.yaresign_fields;
create trigger yaresign_fields_set_updated_at before update on public.yaresign_fields
  for each row execute function public.yaresign_set_updated_at();
drop trigger if exists yaresign_settings_set_updated_at on public.yaresign_settings;
create trigger yaresign_settings_set_updated_at before update on public.yaresign_settings
  for each row execute function public.yaresign_set_updated_at();

-- ---------------------------------------------------------------- row-level security
alter table public.yaresign_envelopes enable row level security;
alter table public.yaresign_documents enable row level security;
alter table public.yaresign_participants enable row level security;
alter table public.yaresign_fields enable row level security;
alter table public.yaresign_events enable row level security;
alter table public.yaresign_settings enable row level security;

revoke all on public.yaresign_envelopes, public.yaresign_documents, public.yaresign_participants, public.yaresign_fields, public.yaresign_events, public.yaresign_settings from anon;
grant select, insert, update, delete on public.yaresign_envelopes, public.yaresign_documents, public.yaresign_participants, public.yaresign_fields, public.yaresign_settings to authenticated;
grant select, insert on public.yaresign_events to authenticated;

drop policy if exists "yaresign_envelopes: owner all" on public.yaresign_envelopes;
create policy "yaresign_envelopes: owner all" on public.yaresign_envelopes
  for all to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

drop policy if exists "yaresign_documents: owner all" on public.yaresign_documents;
create policy "yaresign_documents: owner all" on public.yaresign_documents
  for all to authenticated
  using (exists (select 1 from public.yaresign_envelopes e where e.id = envelope_id and e.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.yaresign_envelopes e where e.id = envelope_id and e.owner_id = (select auth.uid())));

drop policy if exists "yaresign_participants: owner all" on public.yaresign_participants;
create policy "yaresign_participants: owner all" on public.yaresign_participants
  for all to authenticated
  using (exists (select 1 from public.yaresign_envelopes e where e.id = envelope_id and e.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.yaresign_envelopes e where e.id = envelope_id and e.owner_id = (select auth.uid())));

drop policy if exists "yaresign_fields: owner all" on public.yaresign_fields;
create policy "yaresign_fields: owner all" on public.yaresign_fields
  for all to authenticated
  using (exists (select 1 from public.yaresign_envelopes e where e.id = envelope_id and e.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.yaresign_envelopes e where e.id = envelope_id and e.owner_id = (select auth.uid())));

drop policy if exists "yaresign_events: owner reads" on public.yaresign_events;
create policy "yaresign_events: owner reads" on public.yaresign_events
  for select to authenticated
  using (exists (select 1 from public.yaresign_envelopes e where e.id = envelope_id and e.owner_id = (select auth.uid())));
drop policy if exists "yaresign_events: owner adds" on public.yaresign_events;
create policy "yaresign_events: owner adds" on public.yaresign_events
  for insert to authenticated
  with check (exists (select 1 from public.yaresign_envelopes e where e.id = envelope_id and e.owner_id = (select auth.uid())));

drop policy if exists "yaresign_settings: owner all" on public.yaresign_settings;
create policy "yaresign_settings: owner all" on public.yaresign_settings
  for all to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

-- ---------------------------------------------------------------- owner function: publish
-- Checks the envelope is ready, then opens it: status sent, every signer pending, an event.
-- Emails, if the deployment can send them, are the Edge Function's job afterwards.
create or replace function public.yaresign_publish(p_envelope_id uuid)
returns void
language plpgsql security invoker set search_path = '' as $$
declare v_status text;
begin
  select status into v_status from public.yaresign_envelopes where id = p_envelope_id and owner_id = (select auth.uid());
  if v_status is null then raise exception 'Envelope not found.' using errcode = 'P0002'; end if;
  if v_status <> 'draft' then raise exception 'This envelope was already sent.' using errcode = 'P0001'; end if;
  if not exists (select 1 from public.yaresign_documents d where d.envelope_id = p_envelope_id) then
    raise exception 'Add at least one document first.' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.yaresign_participants p where p.envelope_id = p_envelope_id and p.role = 'signer') then
    raise exception 'Add at least one signer first.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.yaresign_participants p where p.envelope_id = p_envelope_id and (p.email = '' or p.first_name = '')) then
    raise exception 'Every participant needs a first name and an email.' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.yaresign_participants p
     where p.envelope_id = p_envelope_id and p.role = 'signer'
       and not exists (select 1 from public.yaresign_fields f where f.participant_id = p.id and f.type = 'signature')
  ) then
    raise exception 'Every signer needs at least one signature field.' using errcode = 'P0001';
  end if;
  update public.yaresign_envelopes set status = 'sent', sent_at = now() where id = p_envelope_id;
  update public.yaresign_participants set status = 'pending' where envelope_id = p_envelope_id;
  insert into public.yaresign_events (envelope_id, type) values (p_envelope_id, 'sent');
end; $$;

-- ---------------------------------------------------------------- signer functions
-- Whether this participant may sign now: the envelope is open, they are a signer who has not
-- signed, and, when the envelope is ordered, every signer before them has signed.
create or replace function public.yaresign_turn(p_participant_id uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select p.role = 'signer' and p.status <> 'signed' and e.status = 'sent'
     and (not e.ordered or not exists (
           select 1 from public.yaresign_participants q
            where q.envelope_id = p.envelope_id and q.role = 'signer' and q.position < p.position and q.status <> 'signed'))
    from public.yaresign_participants p
    join public.yaresign_envelopes e on e.id = p.envelope_id
   where p.id = p_participant_id;
$$;

-- Everything a participant's page needs, keyed by their token. Marks the link as viewed.
-- Other participants appear by name and status only; their emails stay with the owner.
create or replace function public.yaresign_open(p_token uuid)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_p public.yaresign_participants%rowtype; v_e public.yaresign_envelopes%rowtype; v_turn boolean; v_sender text;
begin
  select * into v_p from public.yaresign_participants where token = p_token;
  if v_p.id is null then raise exception 'This link is not valid.' using errcode = 'P0002'; end if;
  select * into v_e from public.yaresign_envelopes where id = v_p.envelope_id;
  if v_e.status = 'draft' then raise exception 'This document has not been sent yet.' using errcode = 'P0002'; end if;
  if v_p.status in ('pending', 'sent') then
    update public.yaresign_participants set status = 'viewed', viewed_at = now() where id = v_p.id;
    insert into public.yaresign_events (envelope_id, participant_id, type) values (v_e.id, v_p.id, 'viewed');
    v_p.status := 'viewed';
  end if;
  v_turn := public.yaresign_turn(v_p.id);
  select coalesce(nullif(s.sender_name, ''), split_part(u.email, '@', 1)) into v_sender
    from auth.users u left join public.yaresign_settings s on s.owner_id = u.id where u.id = v_e.owner_id;
  return jsonb_build_object(
    'envelope', jsonb_build_object('id', v_e.id, 'title', v_e.title, 'status', v_e.status, 'ordered', v_e.ordered, 'message', v_e.message, 'sent_at', v_e.sent_at, 'completed_at', v_e.completed_at, 'sender', v_sender),
    'me', jsonb_build_object('id', v_p.id, 'role', v_p.role, 'first_name', v_p.first_name, 'last_name', v_p.last_name, 'email', v_p.email, 'status', v_p.status, 'position', v_p.position, 'typed_name', v_p.typed_name, 'signed_at', v_p.signed_at, 'can_sign', v_turn),
    'documents', coalesce((select jsonb_agg(jsonb_build_object('id', d.id, 'name', d.name, 'page_count', d.page_count, 'page_sizes', d.page_sizes, 'position', d.position) order by d.position) from public.yaresign_documents d where d.envelope_id = v_e.id), '[]'::jsonb),
    'participants', coalesce((select jsonb_agg(jsonb_build_object('id', q.id, 'role', q.role, 'first_name', q.first_name, 'last_name', q.last_name, 'status', q.status, 'position', q.position, 'signed_at', q.signed_at) order by q.position) from public.yaresign_participants q where q.envelope_id = v_e.id), '[]'::jsonb),
    'fields', coalesce((select jsonb_agg(jsonb_build_object('id', f.id, 'document_id', f.document_id, 'participant_id', f.participant_id, 'page', f.page, 'type', f.type, 'x', f.x, 'y', f.y, 'w', f.w, 'h', f.h, 'required', f.required, 'label', f.label, 'value', f.value)) from public.yaresign_fields f where f.envelope_id = v_e.id), '[]'::jsonb)
  );
end; $$;

-- Records a participant's signature: the values of their fields, their typed name, the time.
-- Completes the envelope when the last signer signs. Returns what the page shows next.
create or replace function public.yaresign_sign(p_token uuid, p_values jsonb, p_typed_name text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_p public.yaresign_participants%rowtype; v_f record; v_val text; v_missing text; v_completed boolean := false;
begin
  select * into v_p from public.yaresign_participants where token = p_token;
  if v_p.id is null then raise exception 'This link is not valid.' using errcode = 'P0002'; end if;
  if not public.yaresign_turn(v_p.id) then raise exception 'It is not your turn to sign, or this document is closed.' using errcode = 'P0001'; end if;
  if coalesce(trim(p_typed_name), '') = '' then raise exception 'Type your name to confirm.' using errcode = 'P0001'; end if;
  if pg_column_size(p_values) > 2000000 then raise exception 'The signature images are too large.' using errcode = '22001'; end if;
  for v_f in select * from public.yaresign_fields where participant_id = v_p.id loop
    v_val := p_values ->> v_f.id::text;
    if v_f.type = 'date' and coalesce(v_val, '') = '' then v_val := to_char(now(), 'YYYY-MM-DD'); end if;
    if v_f.type = 'name' and coalesce(v_val, '') = '' then v_val := trim(v_p.first_name || ' ' || v_p.last_name); end if;
    if v_f.required and coalesce(v_val, '') = '' then v_missing := coalesce(nullif(v_f.label, ''), v_f.type); exit; end if;
    if v_f.type = 'signature' and v_val is not null and v_val not like 'data:image/png;base64,%' then
      raise exception 'A signature must be a PNG image.' using errcode = '22023';
    end if;
    update public.yaresign_fields set value = v_val where id = v_f.id;
  end loop;
  if v_missing is not null then raise exception 'Please fill in every required field (%).', v_missing using errcode = 'P0001'; end if;
  update public.yaresign_participants set status = 'signed', signed_at = now(), typed_name = trim(p_typed_name) where id = v_p.id;
  insert into public.yaresign_events (envelope_id, participant_id, type) values (v_p.envelope_id, v_p.id, 'signed');
  if not exists (select 1 from public.yaresign_participants q where q.envelope_id = v_p.envelope_id and q.role = 'signer' and q.status <> 'signed') then
    update public.yaresign_envelopes set status = 'completed', completed_at = now() where id = v_p.envelope_id;
    insert into public.yaresign_events (envelope_id, type) values (v_p.envelope_id, 'completed');
    v_completed := true;
  end if;
  return jsonb_build_object('completed', v_completed);
end; $$;

revoke all on function public.yaresign_turn(uuid) from public;
revoke all on function public.yaresign_open(uuid) from public;
revoke all on function public.yaresign_sign(uuid, jsonb, text) from public;
revoke all on function public.yaresign_publish(uuid) from public;
grant execute on function public.yaresign_turn(uuid) to anon, authenticated;
grant execute on function public.yaresign_open(uuid) to anon, authenticated;
grant execute on function public.yaresign_sign(uuid, jsonb, text) to anon, authenticated;
grant execute on function public.yaresign_publish(uuid) to authenticated;

-- ---------------------------------------------------------------- documents bucket (private)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('yare-sign', 'yare-sign', false, 20971520, array['application/pdf'])
on conflict (id) do nothing;

drop policy if exists "yare-sign: owner reads" on storage.objects;
create policy "yare-sign: owner reads" on storage.objects
  for select to authenticated
  using (bucket_id = 'yare-sign' and exists (select 1 from public.yaresign_envelopes e where e.id::text = (storage.foldername(name))[1] and e.owner_id = (select auth.uid())));
drop policy if exists "yare-sign: owner writes" on storage.objects;
create policy "yare-sign: owner writes" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'yare-sign' and exists (select 1 from public.yaresign_envelopes e where e.id::text = (storage.foldername(name))[1] and e.owner_id = (select auth.uid())));
drop policy if exists "yare-sign: owner updates" on storage.objects;
create policy "yare-sign: owner updates" on storage.objects
  for update to authenticated
  using (bucket_id = 'yare-sign' and exists (select 1 from public.yaresign_envelopes e where e.id::text = (storage.foldername(name))[1] and e.owner_id = (select auth.uid())));
drop policy if exists "yare-sign: owner deletes" on storage.objects;
create policy "yare-sign: owner deletes" on storage.objects
  for delete to authenticated
  using (bucket_id = 'yare-sign' and exists (select 1 from public.yaresign_envelopes e where e.id::text = (storage.foldername(name))[1] and e.owner_id = (select auth.uid())));
