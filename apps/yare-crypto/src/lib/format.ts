const usdFmt = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
const usdSmall = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 4 });
const usdShort = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 });

export function usd(v: number | null | undefined, opts: { short?: boolean } = {}): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '–';
  if (opts.short) return usdShort.format(v);
  return Math.abs(v) > 0 && Math.abs(v) < 0.01 ? usdSmall.format(v) : usdFmt.format(v);
}

export function signedUsd(v: number): string { return `${v > 0 ? '+' : v < 0 ? '−' : ''}${usd(Math.abs(v))}`; }

/** A coin amount with sensible precision: 0.4256 ETH, 1,240 USDC, 0.00001234 WBTC. */
export function amount(v: number | string | null | undefined, symbol?: string): string {
  const n = typeof v === 'string' ? Number(v) : v;
  if (n === null || n === undefined || !Number.isFinite(n)) return '–';
  const abs = Math.abs(n);
  const digits = abs === 0 ? 0 : abs >= 1000 ? 0 : abs >= 1 ? 4 : abs >= 0.0001 ? 6 : 8;
  const s = new Intl.NumberFormat(undefined, { maximumFractionDigits: digits }).format(n);
  return symbol ? `${s} ${symbol}` : s;
}

export const shortDate = (iso: string | number) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
export const shortDateYear = (iso: string | number) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
export const relativeTime = (iso: string | null) => {
  if (!iso) return 'never';
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
};
