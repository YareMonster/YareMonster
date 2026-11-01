import { useEffect, useMemo, useState } from 'react';
import type { Client, Day, Top } from '../../lib/supabase';
import { listDays, listTops } from '../../lib/pages-api';

export interface SiteData { days: Day[]; tops: Top[] }

export function useSiteData(db: Client, siteIds: string[] | undefined, version: number): { data: SiteData | null; error: string | null } {
  const [data, setData] = useState<SiteData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const key = siteIds ? siteIds.join(',') : '*';
  useEffect(() => {
    let cancelled = false;
    const ids = key === '*' ? undefined : key.split(',').filter(Boolean);
    if (ids && ids.length === 0) { setData({ days: [], tops: [] }); return; }
    Promise.all([listDays(db, ids), listTops(db, ids)])
      .then(([days, tops]) => { if (!cancelled) { setData({ days, tops }); setError(null); } })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load the visitors.'); });
    return () => { cancelled = true; };
  }, [db, key, version]);
  return { data, error };
}

export type Range = '7d' | '30d' | '90d';
export const ranges: Array<{ key: Range; label: string; days: number }> = [{ key: '7d', label: '7D', days: 7 }, { key: '30d', label: '30D', days: 30 }, { key: '90d', label: '90D', days: 90 }];

/** Daily figures summed across sites and cut to the range, plus the totals and the change against the range before. */
export function useSeries(days: Day[] | undefined, range: Range) {
  return useMemo(() => {
    const n = ranges.find((r) => r.key === range)?.days ?? 30;
    const byDay = new Map<string, { visits: number; views: number; uniques: number }>();
    for (const d of days ?? []) {
      const c = byDay.get(d.day) ?? { visits: 0, views: 0, uniques: 0 };
      c.visits += d.visits; c.views += d.page_views; c.uniques += d.uniques;
      byDay.set(d.day, c);
    }
    const all = [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    const cut = (from: number, to: number) => all.slice(Math.max(0, all.length - to), Math.max(0, all.length - from));
    const current = cut(0, n), previous = cut(n, 2 * n);
    const sum = (list: typeof current, k: 'visits' | 'views' | 'uniques') => list.reduce((s, [, v]) => s + v[k], 0);
    const points = current.map(([day, v]) => ({ x: new Date(day).getTime(), y: v.visits }));
    const totals = { visits: sum(current, 'visits'), views: sum(current, 'views'), uniques: sum(current, 'uniques') };
    const before = { visits: sum(previous, 'visits'), views: sum(previous, 'views'), uniques: sum(previous, 'uniques') };
    const ratio = (a: number, b: number) => (b > 0 ? (a - b) / b : null);
    return { points, totals, change: { visits: ratio(totals.visits, before.visits), views: ratio(totals.views, before.views), uniques: ratio(totals.uniques, before.uniques) }, hasPrevious: previous.length > 0 };
  }, [days, range]);
}

/** Top rows merged across sites, by kind. */
export function mergeTops(tops: Top[], kind: Top['kind'], limit = 8): Array<{ label: string; visits: number }> {
  const by = new Map<string, number>();
  for (const t of tops) if (t.kind === kind) by.set(t.label, (by.get(t.label) ?? 0) + t.visits);
  return [...by.entries()].map(([label, visits]) => ({ label, visits })).sort((a, b) => b.visits - a.visits).slice(0, limit);
}
