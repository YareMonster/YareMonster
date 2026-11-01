import { useEffect, useMemo, useState } from 'react';
import type { Client, Nft } from '../../lib/supabase';
import { listAllTransactions, listHoldings, listNfts, listSnapshots, type Holding, type Snapshot, type Transaction } from '../../lib/crypto-api';

export interface WalletData { holdings: Holding[]; transactions: Transaction[]; nfts: Nft[]; snapshots: Snapshot[] }

/** Everything the dashboard shows for a set of wallets (or all of them), reloaded when a sync ends. */
export function useWalletData(db: Client, walletIds: string[] | undefined, version: number): { data: WalletData | null; error: string | null } {
  const [data, setData] = useState<WalletData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const key = walletIds ? walletIds.join(',') : '*';
  useEffect(() => {
    let cancelled = false;
    const ids = key === '*' ? undefined : key.split(',').filter(Boolean);
    if (ids && ids.length === 0) { setData({ holdings: [], transactions: [], nfts: [], snapshots: [] }); return; }
    Promise.all([listHoldings(db, ids), listAllTransactions(db, ids).then((t) => t.reverse()), listNfts(db, ids), listSnapshots(db, ids)])
      .then(([holdings, transactions, nfts, snapshots]) => { if (!cancelled) { setData({ holdings, transactions, nfts, snapshots }); setError(null); } })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load the data.'); });
    return () => { cancelled = true; };
  }, [db, key, version]);
  return { data, error };
}

export type Range = '7d' | '1m' | '3m' | '6m' | '1y' | 'all';
export const ranges: Array<{ key: Range; label: string; days: number | null }> = [
  { key: '7d', label: '7D', days: 7 }, { key: '1m', label: '1M', days: 30 }, { key: '3m', label: '3M', days: 90 }, { key: '6m', label: '6M', days: 180 }, { key: '1y', label: '1Y', days: 365 }, { key: 'all', label: 'All', days: null },
];

/** Daily values summed across wallets, cut to the range. Days a wallet has no snapshot for count as its earliest known value is unknown, so zero. */
export function useSeries(snapshots: Snapshot[] | undefined, range: Range) {
  return useMemo(() => {
    if (!snapshots?.length) return { points: [] as Array<{ x: number; y: number; estimate: boolean }>, first: 0, last: 0 };
    const byDay = new Map<string, { value: number; complete: boolean }>();
    for (const s of snapshots) {
      const d = byDay.get(s.day) ?? { value: 0, complete: true };
      d.value += s.usd_value; d.complete = d.complete && s.complete;
      byDay.set(s.day, d);
    }
    const days = ranges.find((r) => r.key === range)?.days ?? null;
    const since = days ? Date.now() - days * 86400000 : 0;
    const points = [...byDay.entries()].map(([day, d]) => ({ x: new Date(day).getTime(), y: d.value, estimate: !d.complete })).filter((p) => p.x >= since).sort((a, b) => a.x - b.x);
    return { points, first: points[0]?.y ?? 0, last: points[points.length - 1]?.y ?? 0 };
  }, [snapshots, range]);
}

/** Holdings merged across wallets by asset: same contract (or the chain's coin by symbol) adds up. */
export function mergeHoldings(holdings: Holding[]): Holding[] {
  const by = new Map<string, Holding>();
  for (const h of holdings) {
    const k = h.asset_contract ?? `native:${h.symbol}`;
    const m = by.get(k);
    if (!m) { by.set(k, { ...h }); continue; }
    m.balance += h.balance;
    m.usd_value = m.usd_value === null && h.usd_value === null ? null : (m.usd_value ?? 0) + (h.usd_value ?? 0);
    m.logo_url = m.logo_url ?? h.logo_url;
  }
  return [...by.values()].sort((a, b) => (b.usd_value ?? -1) - (a.usd_value ?? -1));
}

/** Money in, out, fees and the simple gain, from priced, non-internal activity. */
export function summarise(transactions: Transaction[], netWorth: number) {
  let moneyIn = 0, moneyOut = 0, fees = 0, unpriced = 0;
  for (const t of transactions) {
    if (t.failed || t.kind === 'nft') continue;
    if (t.fee_usd) fees += t.fee_usd;
    if (t.internal || t.direction === 'self') continue;
    if (t.usd_value === null) { if (t.amount > 0) unpriced++; continue; }
    if (t.direction === 'in') moneyIn += t.usd_value; else moneyOut += t.usd_value;
  }
  return { moneyIn, moneyOut, fees, unpriced, gain: netWorth - (moneyIn - moneyOut) };
}
