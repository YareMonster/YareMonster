-- Yare Launcher · migration 20261018000004 · a connected Supabase project for the collection
--
-- By default the apps you set up share the project this launcher runs on. "Connect Supabase" lets
-- the operator point the setup guide at a different project instead, by pasting its URL and
-- publishable key. Both values are public by design; no secret is ever stored here.

alter table public.launcher_settings
  add column if not exists supabase_url text
    check (supabase_url is null or supabase_url ~* '^https://[a-z0-9-]+\.supabase\.co$'),
  add column if not exists supabase_publishable_key text
    check (supabase_publishable_key is null or char_length(supabase_publishable_key) between 20 and 400);

comment on column public.launcher_settings.supabase_url is 'Optional. Overrides the project the launcher runs on, for the setup guide.';
comment on column public.launcher_settings.supabase_publishable_key is 'Public key of that project. Never a secret or service-role key.';
