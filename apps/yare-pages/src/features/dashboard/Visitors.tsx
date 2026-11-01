import { useState } from 'react';
import { Card, Skeleton } from '@heroui/react';
import { MonsterNote, Notice, RangeTabs, StatCard } from '../../yare';
import { AreaChart } from '../../yare-charts';
import type { Site } from '../../lib/supabase';
import { num, numShort, shortDate } from '../../lib/format';
import { mergeTops, ranges, useSeries, type Range, type SiteData } from './useSiteData';

interface Props { data: SiteData | null; error: string | null; sites: Site[]; combined?: boolean; view: 'overview' | 'visitors' }

/** Visits over time, the three figures, and where people came from. The home shows it for every website, a website page for one. */
export function Visitors({ data, error, sites, combined, view }: Props) {
  const [range, setRange] = useState<Range>('30d');
  const series = useSeries(data?.days, range);
  const none = sites.length > 0 && sites.every((s) => s.source === 'none');
  const unread = sites.some((s) => s.url && !s.last_synced_at);
  if (error) return <Notice status="danger" title="Could not load the visitors">{error}</Notice>;

  const topList = (kind: 'page' | 'country' | 'referrer', title: string, empty: string) => {
    const rows = data ? mergeTops(data.tops, kind) : null;
    const max = rows?.[0]?.visits ?? 1;
    return (
      <Card className="gap-3 p-5">
        <h3 className="text-base">{title}</h3>
        {rows === null ? <Skeleton className="h-32 rounded-md" /> : rows.length === 0 ? <p className="text-sm text-muted">{empty}</p> : (
          <ol className="flex flex-col gap-2">
            {rows.map((r) => (
              <li key={r.label} className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-3 text-sm"><span className="truncate" title={r.label}>{kind === 'referrer' && r.label === '' ? 'Direct' : r.label}</span><span className="font-semibold tabular-nums">{num(r.visits)}</span></div>
                <div className="h-1.5 rounded-full bg-surface-secondary"><div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(3, (r.visits / max) * 100)}%` }} /></div>
              </li>
            ))}
          </ol>
        )}
      </Card>
    );
  };

  const overview = (
    <>
      {none && !unread && <MonsterNote title="No visitor figures yet">{combined ? 'None of these websites' : 'This website'} is on your Cloudflare account, and {combined ? 'none carries' : 'it does not carry'} Cloudflare Web Analytics. Add the token under Connections if you have not, or add Web Analytics to the site: one script line, free, no cookies.</MonsterNote>}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Visits" value={data ? num(series.totals.visits) : null} delta={series.hasPrevious ? { ratio: series.change.visits } : undefined} detail={`last ${ranges.find((r) => r.key === range)?.label}, against the ${ranges.find((r) => r.key === range)?.label} before`} />
        <StatCard label="Page views" value={data ? num(series.totals.views) : null} delta={series.hasPrevious ? { ratio: series.change.views } : undefined} detail="pages people opened" />
        <StatCard label="Unique visitors" value={data ? num(series.totals.uniques) : null} delta={series.hasPrevious ? { ratio: series.change.uniques } : undefined} detail="different people, as Cloudflare counts them" />
      </div>
      <Card className="gap-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base">Visits by day</h3>
          <RangeTabs options={ranges.map((r) => ({ key: r.key, label: r.label }))} value={range} onChange={setRange} />
        </div>
        {data === null ? <Skeleton className="h-56 rounded-md" /> : series.points.length > 1 ? (
          <AreaChart data={series.points} height={224} formatValue={(v) => numShort(v)} formatLabel={(x) => shortDate(Number(x))} aria-label="Visits by day" />
        ) : <div className="grid h-56 place-items-center text-sm text-muted">{unread ? 'Reading the visitors…' : 'Not enough days yet for a chart.'}</div>}
      </Card>
    </>
  );

  const details = (
    <div className="grid gap-4 lg:grid-cols-3">
      {topList('page', 'Top pages', 'No pages counted yet.')}
      {topList('country', 'Countries', 'No countries counted yet.')}
      {topList('referrer', 'Referrers', 'No referrers counted yet.')}
    </div>
  );

  if (view === 'visitors') return <div className="flex flex-col gap-4">{overview}{details}</div>;
  return <div className="flex flex-col gap-4">{overview}</div>;
}
