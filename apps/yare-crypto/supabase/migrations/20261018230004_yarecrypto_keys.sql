-- Yare Crypto · migration 20261018230004 · the API keys, pasted in the app
--
-- The person pastes their Etherscan, CoinGecko and OpenSea keys under Connections → Network APIs.
-- They land in this table, in the person's own database, and only the sync function (running with
-- the project's service role) reads them. The browser can write a key and ask whether one is set;
-- it can never read one back. These are read-only keys for public data; a project secret set from
-- the terminal (ETHERSCAN_API_KEY and friends) still works and wins when both exist.

create table if not exists public.yarecrypto_keys (
  owner_id    uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  etherscan   text,
  coingecko   text,
  opensea     text,
  updated_at  timestamptz not null default now()
);
comment on table public.yarecrypto_keys is 'Yare Crypto: the owner''s API keys for public chain and price data. Written through yarecrypto_set_key, read only by the sync function.';

alter table public.yarecrypto_keys enable row level security;
revoke all on public.yarecrypto_keys from anon, authenticated;

-- Save one key. An empty value clears it.
create or replace function public.yarecrypto_set_key(p_service text, p_value text)
returns void
language plpgsql security definer set search_path = '' as $$
declare v_owner uuid := auth.uid(); v_value text := nullif(trim(p_value), '');
begin
  if v_owner is null then raise exception 'Sign in first.' using errcode = '28000'; end if;
  if p_service not in ('etherscan', 'coingecko', 'opensea') then raise exception 'Unknown service.' using errcode = '22023'; end if;
  if v_value is not null and char_length(v_value) > 200 then raise exception 'That does not look like a key.' using errcode = '22023'; end if;
  insert into public.yarecrypto_keys (owner_id) values (v_owner) on conflict (owner_id) do nothing;
  if p_service = 'etherscan' then update public.yarecrypto_keys set etherscan = v_value, updated_at = now() where owner_id = v_owner;
  elsif p_service = 'coingecko' then update public.yarecrypto_keys set coingecko = v_value, updated_at = now() where owner_id = v_owner;
  else update public.yarecrypto_keys set opensea = v_value, updated_at = now() where owner_id = v_owner;
  end if;
end; $$;

-- Which keys are in place, without revealing them.
create or replace function public.yarecrypto_key_status()
returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'etherscan', coalesce((select k.etherscan is not null from public.yarecrypto_keys k where k.owner_id = auth.uid()), false),
    'coingecko', coalesce((select k.coingecko is not null from public.yarecrypto_keys k where k.owner_id = auth.uid()), false),
    'opensea', coalesce((select k.opensea is not null from public.yarecrypto_keys k where k.owner_id = auth.uid()), false)
  );
$$;

revoke all on function public.yarecrypto_set_key(text, text) from public;
revoke all on function public.yarecrypto_key_status() from public;
grant execute on function public.yarecrypto_set_key(text, text) to authenticated;
grant execute on function public.yarecrypto_key_status() to authenticated;
