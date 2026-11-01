import type { Client, HoldingRow, Nft, SnapshotRow, TransactionRow, Wallet } from './supabase';
import type { Network } from './networks';

function fail(error: { message: string } | null): asserts error is null {
  if (error) throw new Error(error.message);
}
const num = (v: string | number | null | undefined): number | null => (v === null || v === undefined ? null : Number(v));

export interface Transaction extends Omit<TransactionRow, 'amount' | 'fee_native' | 'usd_value' | 'fee_usd'> { amount: number; fee_native: number; usd_value: number | null; fee_usd: number | null }
export interface Holding extends Omit<HoldingRow, 'balance' | 'usd_price' | 'usd_value'> { balance: number; usd_price: number | null; usd_value: number | null }
export interface Snapshot { wallet_id: string; day: string; usd_value: number; complete: boolean }

// ---------------------------------------------------------------- wallets
export async function listWallets(db: Client): Promise<Wallet[]> {
  const { data, error } = await db.from('yarecrypto_wallets').select('*').order('position').order('created_at');
  fail(error);
  return data;
}

export async function addWallet(db: Client, w: { name: string; network: Network; address: string }, position: number): Promise<Wallet> {
  const { data, error } = await db.from('yarecrypto_wallets').insert({ name: w.name.trim(), network: w.network, address: w.address.trim().toLowerCase(), position }).select().single();
  if (error) throw new Error(/duplicate|unique/i.test(error.message) ? 'You already track this address on this network.' : error.message);
  return data;
}

export async function updateWallet(db: Client, id: string, patch: { name?: string; network?: Network }): Promise<Wallet> {
  // A new network means the data no longer applies: the next sync rebuilds it from scratch.
  const row = { ...(patch.name !== undefined ? { name: patch.name.trim() } : {}), ...(patch.network ? { network: patch.network, status: 'new' as const, last_synced_at: null } : {}) };
  const { data, error } = await db.from('yarecrypto_wallets').update(row).eq('id', id).select().single();
  if (error) throw new Error(/duplicate|unique/i.test(error.message) ? 'You already track this address on that network.' : error.message);
  return data;
}

export async function deleteWallet(db: Client, id: string): Promise<void> {
  const { error } = await db.from('yarecrypto_wallets').delete().eq('id', id);
  fail(error);
}

// ---------------------------------------------------------------- data
export async function listHoldings(db: Client, walletIds?: string[]): Promise<Holding[]> {
  let q = db.from('yarecrypto_holdings').select('*');
  if (walletIds) q = q.in('wallet_id', walletIds);
  const { data, error } = await q;
  fail(error);
  return data.map((h) => ({ ...h, balance: Number(h.balance), usd_price: num(h.usd_price), usd_value: num(h.usd_value) }));
}

const toTx = (t: TransactionRow): Transaction => ({ ...t, amount: Number(t.amount), fee_native: Number(t.fee_native), usd_value: num(t.usd_value), fee_usd: num(t.fee_usd) });

export async function listTransactions(db: Client, walletIds: string[] | undefined, limit = 500): Promise<Transaction[]> {
  let q = db.from('yarecrypto_transactions').select('*').order('ts', { ascending: false }).limit(limit);
  if (walletIds) q = q.in('wallet_id', walletIds);
  const { data, error } = await q;
  fail(error);
  return data.map(toTx);
}

/** Every priced-or-not movement of the wallets, for the profit and loss. Up to 5,000. */
export async function listAllTransactions(db: Client, walletIds: string[] | undefined): Promise<Transaction[]> {
  const out: Transaction[] = [];
  for (let from = 0; from < 5000; from += 1000) {
    let q = db.from('yarecrypto_transactions').select('*').order('ts').order('key').range(from, from + 999);
    if (walletIds) q = q.in('wallet_id', walletIds);
    const { data, error } = await q;
    fail(error);
    out.push(...data.map(toTx));
    if (data.length < 1000) break;
  }
  return out;
}

/** One page of movements, newest first, with the total for the pagination. */
export async function pageTransactions(db: Client, walletIds: string[] | undefined, page: number, pageSize: number): Promise<{ rows: Transaction[]; total: number }> {
  let q = db.from('yarecrypto_transactions').select('*', { count: 'exact' }).order('ts', { ascending: false }).order('key').range(page * pageSize, page * pageSize + pageSize - 1);
  if (walletIds) q = q.in('wallet_id', walletIds);
  const { data, error, count } = await q;
  fail(error);
  return { rows: data.map(toTx), total: count ?? data.length };
}

export async function listNfts(db: Client, walletIds?: string[]): Promise<Nft[]> {
  let q = db.from('yarecrypto_nfts').select('*').order('as_of', { ascending: false });
  if (walletIds) q = q.in('wallet_id', walletIds);
  const { data, error } = await q;
  fail(error);
  return data;
}

export async function listSnapshots(db: Client, walletIds?: string[], sinceDay?: string): Promise<Snapshot[]> {
  let q = db.from('yarecrypto_snapshots').select('*').order('day');
  if (walletIds) q = q.in('wallet_id', walletIds);
  if (sinceDay) q = q.gte('day', sinceDay);
  const { data, error } = await q;
  fail(error);
  return (data as SnapshotRow[]).map((s) => ({ ...s, usd_value: Number(s.usd_value) }));
}

// ---------------------------------------------------------------- sync (Edge Function yarecrypto-sync)
export interface SyncStatus { etherscan: boolean; coingecko: boolean; opensea: boolean }
export interface SyncResult { ok: boolean; transactions?: number; holdings?: number; nfts?: number; error?: string }

export type ServiceId = 'etherscan' | 'coingecko' | 'opensea';

/** Saves a pasted key in the owner's row; an empty value clears it. The browser can never read it back. */
export async function setServiceKey(db: Client, service: ServiceId, value: string): Promise<void> {
  const { error } = await db.rpc('yarecrypto_set_key', { p_service: service, p_value: value });
  fail(error);
}

/** Which keys are saved, without the keys. */
export async function savedKeyStatus(db: Client): Promise<SyncStatus> {
  const { data, error } = await db.rpc('yarecrypto_key_status');
  fail(error);
  return data;
}

export async function syncStatus(db: Client): Promise<SyncStatus> {
  const { data, error } = await db.functions.invoke<SyncStatus>('yarecrypto-sync', { body: { action: 'status' } });
  if (error) throw new Error(await describe(error));
  return data ?? { etherscan: false, coingecko: false, opensea: false };
}

export async function syncWallet(db: Client, walletId: string): Promise<SyncResult> {
  const { data, error } = await db.functions.invoke<SyncResult>('yarecrypto-sync', { body: { action: 'sync', wallet_id: walletId } });
  if (error) throw new Error(await describe(error));
  return data ?? { ok: false };
}

async function describe(error: unknown): Promise<string> {
  const ctx = (error as { context?: Response }).context;
  if (ctx && typeof ctx.json === 'function') {
    try { const j = (await ctx.json()) as { error?: string }; if (j.error) return j.error; } catch { /* fall through */ }
  }
  return error instanceof Error ? error.message : 'The sync function did not answer.';
}
