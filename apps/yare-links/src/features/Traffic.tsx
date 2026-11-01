import { Card, Skeleton } from '@heroui/react';
import type { Event } from '../lib/supabase';

export type Range = '7' | '30' | '90' | 'all';
export const ranges = [{ key: '7' as Range, label: '7 days' }, { key: '30' as Range, label: '30 days' }, { key: '90' as Range, label: '90 days' }, { key: 'all' as Range, label: 'All time' }];
export const since = (r: Range) => (r === 'all' ? null : new Date(Date.now() - Number(r) * 86400000).toISOString());
const dayKey = (iso: string) => iso.slice(0, 10);
const regionNames = typeof Intl !== 'undefined' && 'DisplayNames' in Intl ? new Intl.DisplayNames(undefined, { type: 'region' }) : null;
const countryName = (code: string) => { try { return regionNames?.of(code) ?? code; } catch { return code; } };

export interface Traffic {
  views: number;
  clicks: number;
  series: Array<{ x: string; y: number }>;
  referrers: Array<{ label: string; n: number }>;
  countries: Array<{ label: string; n: number }>;
  devices: Array<{ label: string; n: number }>;
}

/** Views and clicks over a period, views per day, and where the views came from. Nothing about who. */
export function summarize(events: Event[], range: Range): Traffic {
  const views = events.filter((e) => e.kind === 'view').length;
  const clicks = events.filter((e) => e.kind === 'click').length;
  const days = range === 'all' ? Math.max(7, Math.ceil((Date.now() - new Date(events[events.length - 1]?.created_at ?? Date.now()).getTime()) / 86400000) + 1) : Number(range);
  const series: Array<{ x: string; y: number }> = [];
  const byDay = new Map<string, number>();
  for (const e of events) if (e.kind === 'view') byDay.set(dayKey(e.created_at), (byDay.get(dayKey(e.created_at)) ?? 0) + 1);
  for (let i = days - 1; i >= 0; i--) { const d = new Date(Date.now() - i * 86400000); const k = d.toISOString().slice(0, 10); series.push({ x: k, y: byDay.get(k) ?? 0 }); }
  const tally = (pick: (e: Event) => string | null | undefined, label = (v: string) => v) => {
    const m = new Map<string, number>();
    for (const e of events) { const v = pick(e); if (v) m.set(v, (m.get(v) ?? 0) + 1); }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, n]) => ({ label: label(k), n }));
  };
  return {
    views, clicks, series,
    referrers: tally((e) => e.ref_host ?? (e.kind === 'view' ? 'Direct' : null)),
    countries: tally((e) => (e.kind === 'view' ? e.country ?? 'Unknown' : null), countryName),
    devices: tally((e) => (e.kind === 'view' ? e.device : null), (v) => v[0]!.toUpperCase() + v.slice(1)),
  };
}

/** A ranked list with a bar per row: referrers, countries, devices. */
export function Tally({ title, rows, empty }: { title: string; rows: Array<{ label: string; n: number }> | undefined; empty: string }) {
  const max = rows?.[0]?.n ?? 1;
  return (
    <Card className="gap-3 p-5">
      <h3 className="text-base">{title}</h3>
      {!rows ? <Skeleton className="h-32 rounded-(--yare-radius-control)" /> : rows.length === 0 ? <p className="text-sm text-muted">{empty}</p> : (
        <ul className="flex flex-col gap-2">
          {rows.map((r) => (
            <li key={r.label} className="text-sm">
              <div className="flex items-center justify-between gap-2"><span className="min-w-0 truncate">{r.label}</span><span className="font-semibold tabular-nums">{r.n.toLocaleString()}</span></div>
              <div className="mt-1 h-1.5 rounded-full bg-surface-secondary"><div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(4, (r.n / max) * 100)}%` }} /></div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** The three boxes under a chart: where visitors came from, countries, devices. */
export function TrafficBoxes({ traffic }: { traffic: Traffic | null }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Tally title="Where visitors came from" rows={traffic?.referrers} empty="No visits yet." />
      <Tally title="Countries" rows={traffic?.countries} empty="No visits yet." />
      <Tally title="Devices" rows={traffic?.devices} empty="No visits yet." />
    </div>
  );
}
