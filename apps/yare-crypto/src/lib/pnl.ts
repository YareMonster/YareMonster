import type { Holding, Transaction } from './crypto-api';

export interface AssetPnl {
  key: string;
  symbol: string;
  name: string;
  logo: string | null;
  /** Units held according to the movements (not the live balance). */
  units: number;
  /** Average cost per unit of what is still held, in dollars. */
  avgCost: number | null;
  priceNow: number | null;
  costBasis: number;
  valueNow: number | null;
  unrealised: number | null;
  realised: number;
  fees: number;
  /** Movements with no dollar value that day; they entered at zero cost. */
  unpriced: number;
}

export interface Pnl { assets: AssetPnl[]; realised: number; unrealised: number; fees: number; costBasis: number; valueNow: number; unpriced: number }

/**
 * Profit and loss by average cost. Every unit that comes in is bought at that day's price; every
 * unit that goes out is sold at that day's price against the average cost of what was held.
 * What is still held is valued at today's price. Moves between the owner's own wallets are
 * skipped when several wallets are combined, since nothing was bought or sold.
 */
export function computePnl(transactions: Transaction[], holdings: Holding[], combined: boolean): Pnl {
  const price = new Map<string, { price: number | null; logo: string | null; name: string }>();
  for (const h of holdings) {
    const k = h.asset_contract ?? `native:${h.symbol}`;
    if (!price.has(k) || (price.get(k)!.price === null && h.usd_price !== null)) price.set(k, { price: h.usd_price, logo: h.logo_url, name: h.name });
  }
  const assets = new Map<string, AssetPnl>();
  const sorted = [...transactions].filter((t) => !t.failed && t.kind !== 'nft').sort((a, b) => a.ts.localeCompare(b.ts));
  for (const t of sorted) {
    const k = t.asset_contract ?? `native:${t.asset_symbol}`;
    const a = assets.get(k) ?? { key: k, symbol: t.asset_symbol, name: price.get(k)?.name ?? t.asset_name, logo: price.get(k)?.logo ?? null, units: 0, avgCost: null, priceNow: price.get(k)?.price ?? null, costBasis: 0, valueNow: null, unrealised: null, realised: 0, fees: 0, unpriced: 0 };
    if (t.fee_usd) a.fees += t.fee_usd;
    if (t.direction === 'self' || (combined && t.internal)) { assets.set(k, a); continue; }
    if (t.direction === 'in') {
      a.units += t.amount;
      if (t.usd_value === null) a.unpriced++; else a.costBasis += t.usd_value;
    } else {
      const sold = Math.min(t.amount, a.units);
      const avg = a.units > 0 ? a.costBasis / a.units : 0;
      const cost = avg * sold;
      if (t.usd_value === null) a.unpriced++; else a.realised += t.usd_value * (t.amount > 0 ? sold / t.amount : 1) - cost;
      a.units = Math.max(0, a.units - t.amount);
      a.costBasis = Math.max(0, a.costBasis - cost);
    }
    assets.set(k, a);
  }
  const list = [...assets.values()].map((a) => {
    a.avgCost = a.units > 0 ? a.costBasis / a.units : null;
    a.valueNow = a.priceNow === null ? null : a.units * a.priceNow;
    a.unrealised = a.valueNow === null ? null : a.valueNow - a.costBasis;
    if (a.units < 1e-9) { a.units = 0; a.costBasis = 0; a.unrealised = a.valueNow === null ? null : 0; }
    return a;
  }).filter((a) => a.units > 0 || Math.abs(a.realised) > 0.005 || a.fees > 0.005)
    .sort((x, y) => Math.abs((y.valueNow ?? 0) + y.realised) - Math.abs((x.valueNow ?? 0) + x.realised));
  const sum = (f: (a: AssetPnl) => number | null) => list.reduce((s, a) => s + (f(a) ?? 0), 0);
  return { assets: list, realised: sum((a) => a.realised), unrealised: sum((a) => a.unrealised), fees: sum((a) => a.fees), costBasis: sum((a) => a.costBasis), valueNow: sum((a) => a.valueNow), unpriced: sum((a) => a.unpriced) };
}
