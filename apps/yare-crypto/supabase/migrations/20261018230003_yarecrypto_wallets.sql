-- Yare Crypto · migration 20261018230003 · wallets, activity, holdings, NFTs, prices, snapshots
--
-- A wallet is a public address on one network, named by the owner. Nothing here can move funds:
-- there is no key, no signature, no connection. The yarecrypto-sync Edge Function reads the chain
-- through the owner's Etherscan key, prices through CoinGecko, and fills the tables below. The app
-- only reads them.
--
-- Access in short: owner everything on their own rows (row-level security); anonymous nothing.
-- The sync function writes with the project's service role, scoped to the owner's wallet.

-- ---------------------------------------------------------------- wallets
create table if not exists public.yarecrypto_wallets (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name            text not null check (char_length(name) between 1 and 80),
  -- The network the address lives on. Etherscan chain ids: ethereum 1, base 8453, arbitrum 42161, optimism 10, polygon 137.
  network         text not null check (network in ('ethereum', 'base', 'arbitrum', 'optimism', 'polygon')),
  -- Lowercase 0x address. Public by nature.
  address         text not null check (address ~ '^0x[0-9a-f]{40}$'),
  position        integer not null default 0,
  -- new: never synced. syncing: a sync is running. ready: data in place. error: the last sync failed (see sync_error).
  status          text not null default 'new' check (status in ('new', 'syncing', 'ready', 'error')),
  sync_error      text,
  last_synced_at  timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (owner_id, network, address)
);
comment on table public.yarecrypto_wallets is 'Yare Crypto: one row per tracked public address. Read only; nothing here can move funds.';
create index if not exists yarecrypto_wallets_owner_idx on public.yarecrypto_wallets (owner_id, position);

-- ---------------------------------------------------------------- activity
create table if not exists public.yarecrypto_transactions (
  id              uuid primary key default gen_random_uuid(),
  wallet_id       uuid not null references public.yarecrypto_wallets (id) on delete cascade,
  hash            text not null,
  -- Several rows can share a hash (a swap moves two assets); the key tells them apart.
  key             text not null,
  ts              timestamptz not null,
  block           bigint not null default 0,
  -- native: the chain's coin. token: an ERC-20. nft: an ERC-721 or 1155. internal: coin moved by a contract.
  kind            text not null check (kind in ('native', 'token', 'nft', 'internal')),
  direction       text not null check (direction in ('in', 'out', 'self')),
  asset_symbol    text not null default '',
  asset_name      text not null default '',
  asset_contract  text,
  decimals        integer not null default 18,
  amount          numeric not null default 0,
  -- Paid by this wallet, in the chain's coin, only on transactions it sent.
  fee_native      numeric not null default 0,
  usd_value       numeric,
  fee_usd         numeric,
  counterparty    text,
  -- The other side is another wallet of the same owner: a transfer, not money in or out.
  internal        boolean not null default false,
  token_id        text,
  failed          boolean not null default false,
  created_at      timestamptz not null default now(),
  unique (wallet_id, key)
);
comment on table public.yarecrypto_transactions is 'Yare Crypto: everything that moved in or out of a wallet, valued in dollars at the time when a price is known.';
create index if not exists yarecrypto_transactions_wallet_idx on public.yarecrypto_transactions (wallet_id, ts desc);

-- ---------------------------------------------------------------- holdings (current balances)
create table if not exists public.yarecrypto_holdings (
  id              uuid primary key default gen_random_uuid(),
  wallet_id       uuid not null references public.yarecrypto_wallets (id) on delete cascade,
  -- Null for the chain's own coin.
  asset_contract  text,
  symbol          text not null,
  name            text not null,
  decimals        integer not null default 18,
  balance         numeric not null default 0,
  usd_price       numeric,
  usd_value       numeric,
  coingecko_id    text,
  logo_url        text,
  as_of           timestamptz not null default now(),
  unique (wallet_id, asset_contract)
);
create unique index if not exists yarecrypto_holdings_native_idx on public.yarecrypto_holdings (wallet_id) where asset_contract is null;
comment on table public.yarecrypto_holdings is 'Yare Crypto: what a wallet holds right now, with the latest price.';

-- ---------------------------------------------------------------- NFTs held
create table if not exists public.yarecrypto_nfts (
  id              uuid primary key default gen_random_uuid(),
  wallet_id       uuid not null references public.yarecrypto_wallets (id) on delete cascade,
  contract        text not null,
  token_id        text not null,
  name            text not null default '',
  collection      text not null default '',
  image_url       text,
  as_of           timestamptz not null default now(),
  unique (wallet_id, contract, token_id)
);
comment on table public.yarecrypto_nfts is 'Yare Crypto: the NFTs a wallet holds. Shown, never valued.';

-- ---------------------------------------------------------------- daily prices (shared cache)
create table if not exists public.yarecrypto_prices (
  -- A CoinGecko coin id ("ethereum") or "<platform>:<contract>" for a token.
  asset_key       text not null,
  day             date not null,
  usd             numeric not null,
  primary key (asset_key, day)
);
comment on table public.yarecrypto_prices is 'Yare Crypto: one dollar price per asset per day, from CoinGecko. Shared by every wallet.';

-- ---------------------------------------------------------------- daily value of a wallet
create table if not exists public.yarecrypto_snapshots (
  wallet_id       uuid not null references public.yarecrypto_wallets (id) on delete cascade,
  day             date not null,
  usd_value       numeric not null,
  -- False when a holding had no price that day; the chart marks the point as an estimate.
  complete        boolean not null default true,
  primary key (wallet_id, day)
);
comment on table public.yarecrypto_snapshots is 'Yare Crypto: what the wallet was worth at the end of each day, rebuilt by the sync.';

-- ---------------------------------------------------------------- updated_at
create or replace function public.yarecrypto_set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists yarecrypto_wallets_set_updated_at on public.yarecrypto_wallets;
create trigger yarecrypto_wallets_set_updated_at before update on public.yarecrypto_wallets
  for each row execute function public.yarecrypto_set_updated_at();

-- ---------------------------------------------------------------- row-level security
alter table public.yarecrypto_wallets enable row level security;
alter table public.yarecrypto_transactions enable row level security;
alter table public.yarecrypto_holdings enable row level security;
alter table public.yarecrypto_nfts enable row level security;
alter table public.yarecrypto_prices enable row level security;
alter table public.yarecrypto_snapshots enable row level security;

revoke all on public.yarecrypto_wallets, public.yarecrypto_transactions, public.yarecrypto_holdings, public.yarecrypto_nfts, public.yarecrypto_prices, public.yarecrypto_snapshots from anon;
grant select, insert, update, delete on public.yarecrypto_wallets to authenticated;
grant select, delete on public.yarecrypto_transactions, public.yarecrypto_holdings, public.yarecrypto_nfts, public.yarecrypto_snapshots to authenticated;
grant select on public.yarecrypto_prices to authenticated;

drop policy if exists "yarecrypto_wallets: owner all" on public.yarecrypto_wallets;
create policy "yarecrypto_wallets: owner all" on public.yarecrypto_wallets
  for all to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

drop policy if exists "yarecrypto_transactions: owner reads" on public.yarecrypto_transactions;
create policy "yarecrypto_transactions: owner reads" on public.yarecrypto_transactions
  for select to authenticated
  using (exists (select 1 from public.yarecrypto_wallets w where w.id = wallet_id and w.owner_id = (select auth.uid())));
drop policy if exists "yarecrypto_holdings: owner reads" on public.yarecrypto_holdings;
create policy "yarecrypto_holdings: owner reads" on public.yarecrypto_holdings
  for select to authenticated
  using (exists (select 1 from public.yarecrypto_wallets w where w.id = wallet_id and w.owner_id = (select auth.uid())));
drop policy if exists "yarecrypto_nfts: owner reads" on public.yarecrypto_nfts;
create policy "yarecrypto_nfts: owner reads" on public.yarecrypto_nfts
  for select to authenticated
  using (exists (select 1 from public.yarecrypto_wallets w where w.id = wallet_id and w.owner_id = (select auth.uid())));
drop policy if exists "yarecrypto_snapshots: owner reads" on public.yarecrypto_snapshots;
create policy "yarecrypto_snapshots: owner reads" on public.yarecrypto_snapshots
  for select to authenticated
  using (exists (select 1 from public.yarecrypto_wallets w where w.id = wallet_id and w.owner_id = (select auth.uid())));
drop policy if exists "yarecrypto_prices: signed-in users read" on public.yarecrypto_prices;
create policy "yarecrypto_prices: signed-in users read" on public.yarecrypto_prices
  for select to authenticated using (true);
