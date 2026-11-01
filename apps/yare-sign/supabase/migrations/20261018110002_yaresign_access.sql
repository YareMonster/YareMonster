-- Yare Sign · migration 20261018110002 · who may create an account
--
-- Before anyone can create an account in this deployment, their email has to be on the allow list.
-- Whoever sets the deployment up adds it, usually by asking their assistant:
--
--   insert into public.yare_allowed_emails (email) values ('you@domain.com') on conflict do nothing;
--
-- The list is shared by every Yare Monster app in this project (hence the yare_ prefix instead of
-- the app's own), so one entry opens every app the operator installs. Each app installs the same
-- rule under its own name; several copies of the rule are harmless. This replaces the earlier
-- "first account wins" rule.

create table if not exists public.yare_allowed_emails (
  email     text primary key check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+$'),
  note      text,
  added_at  timestamptz not null default now()
);
comment on table public.yare_allowed_emails is 'Yare Monster: emails allowed to create an account in this deployment. Shared by every Yare Monster app.';

alter table public.yare_allowed_emails enable row level security;
revoke all on public.yare_allowed_emails from anon;
grant select on public.yare_allowed_emails to authenticated;
drop policy if exists "yare_allowed_emails: signed-in users read" on public.yare_allowed_emails;
create policy "yare_allowed_emails: signed-in users read" on public.yare_allowed_emails
  for select to authenticated using (true);

-- Convenience for setup scripts: select public.yare_allow_email('you@domain.com');
create or replace function public.yare_allow_email(p_email text)
returns void language sql security definer set search_path = '' as $$
  insert into public.yare_allowed_emails (email) values (lower(trim(p_email))) on conflict do nothing;
$$;
revoke all on function public.yare_allow_email(text) from public;

create or replace function public.yaresign_enforce_allowed_email()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.yare_allowed_emails a where a.email = lower(new.email)) then
    raise exception 'This email is not on the list for this deployment. Ask whoever set it up to add it.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists yaresign_single_owner on auth.users;
drop trigger if exists yaresign_allowed_email on auth.users;
create trigger yaresign_allowed_email
  before insert on auth.users
  for each row execute function public.yaresign_enforce_allowed_email();
