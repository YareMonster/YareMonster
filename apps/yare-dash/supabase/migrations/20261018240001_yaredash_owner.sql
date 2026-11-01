-- Yare Dash · migration 20261018240001 · one owner per deployment
--
-- Yare Monster apps are built for a single operator. The app shows "Create your account" on first run;
-- this trigger makes that safe: the first account to register becomes the owner, and
-- registration closes behind it. Every Yare Monster app ships this rule under its own prefix so it is in
-- place whichever app is installed first. Idempotent; harmless when several apps share a project.
--
-- To allow a second account later, drop the trigger:
--   drop trigger if exists yaredash_single_owner on auth.users;

create or replace function public.yaredash_enforce_single_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from auth.users where id <> new.id) then
    raise exception 'Registration is closed. This Yare Monster deployment already has its owner.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists yaredash_single_owner on auth.users;
create trigger yaredash_single_owner
  before insert on auth.users
  for each row execute function public.yaredash_enforce_single_owner();
