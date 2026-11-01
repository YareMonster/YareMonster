import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { PublicEnv } from './env';
import type { Network } from './networks';

export type WalletStatus = 'new' | 'syncing' | 'ready' | 'error';
export type TxKind = 'native' | 'token' | 'nft' | 'internal';
export type Direction = 'in' | 'out' | 'self';

/** Mirrors supabase/migrations. Numerics arrive as strings from PostgREST; the api layer turns them into numbers. */
export type Wallet = {
  id: string;
  owner_id: string;
  name: string;
  network: Network;
  address: string;
  position: number;
  status: WalletStatus;
  sync_error: string | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TransactionRow = {
  id: string;
  wallet_id: string;
  hash: string;
  key: string;
  ts: string;
  block: number;
  kind: TxKind;
  direction: Direction;
  asset_symbol: string;
  asset_name: string;
  asset_contract: string | null;
  decimals: number;
  amount: string;
  fee_native: string;
  usd_value: string | null;
  fee_usd: string | null;
  counterparty: string | null;
  internal: boolean;
  token_id: string | null;
  failed: boolean;
  created_at: string;
};

export type HoldingRow = {
  id: string;
  wallet_id: string;
  asset_contract: string | null;
  symbol: string;
  name: string;
  decimals: number;
  balance: string;
  usd_price: string | null;
  usd_value: string | null;
  coingecko_id: string | null;
  logo_url: string | null;
  as_of: string;
};

export type Nft = {
  id: string;
  wallet_id: string;
  contract: string;
  token_id: string;
  name: string;
  collection: string;
  image_url: string | null;
  as_of: string;
};

export type SnapshotRow = { wallet_id: string; day: string; usd_value: string; complete: boolean };

type Insertable<T, Required extends keyof T, Optional extends keyof T> = Pick<T, Required> & Partial<Pick<T, Optional>>;

export type Database = {
  public: {
    Tables: {
      yarecrypto_wallets: {
        Row: Wallet;
        Insert: Insertable<Wallet, 'name' | 'network' | 'address', 'id' | 'position'>;
        Update: Partial<Pick<Wallet, 'name' | 'network' | 'position' | 'status' | 'sync_error' | 'last_synced_at'>>;
        Relationships: [];
      };
      yarecrypto_transactions: { Row: TransactionRow; Insert: never; Update: never; Relationships: [] };
      yarecrypto_holdings: { Row: HoldingRow; Insert: never; Update: never; Relationships: [] };
      yarecrypto_nfts: { Row: Nft; Insert: never; Update: never; Relationships: [] };
      yarecrypto_snapshots: { Row: SnapshotRow; Insert: never; Update: never; Relationships: [] };
      yarecrypto_prices: { Row: { asset_key: string; day: string; usd: string }; Insert: never; Update: never; Relationships: [] };
    };
    Views: { [_ in never]: never };
    Functions: {
      yarecrypto_set_key: { Args: { p_service: string; p_value: string }; Returns: undefined };
      yarecrypto_key_status: { Args: Record<string, never>; Returns: { etherscan: boolean; coingecko: boolean; opensea: boolean } };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Client = SupabaseClient<Database>;

export function createSupabase(env: PublicEnv): Client {
  // The publishable key only grants what row-level security allows: the owner's own rows.
  return createClient<Database>(env.supabaseUrl, env.supabasePublishableKey);
}
