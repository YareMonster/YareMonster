import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Skeleton, Tabs, toast } from '@heroui/react';
import { DownloadSimpleIcon, TrashIcon } from '@phosphor-icons/react';
import { DataTable, Notice, RangeTabs, StatCard } from '../../yare';
import { AreaChart } from '../../yare-charts';
import type { Block, Client, Entry, Event, Page } from '../../lib/supabase';
import { deleteEntry, listEntries, listEvents } from '../../lib/links-api';
import { TrafficBoxes, ranges, since, summarize, type Range } from '../Traffic';

interface Props { db: Client; page: Page; blocks: Block[] }
/** Views, clicks and where they came from, plus what visitors typed into forms. Nothing about who. */
export function InsightsTab({ db, page, blocks }: Props) {
  const [range, setRange] = useState<Range>('30');
  const [events, setEvents] = useState<Event[] | null>(null);
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'visits' | 'entries'>('visits');

  useEffect(() => {
    let gone = false;
    setEvents(null);
    listEvents(db, page.id, since(range)).then((e) => { if (!gone) setEvents(e); }).catch((err) => { if (!gone) setError(err instanceof Error ? err.message : 'Could not load the figures.'); });
    return () => { gone = true; };
  }, [db, page.id, range]);
  useEffect(() => { listEntries(db, page.id).then(setEntries).catch(() => setEntries([])); }, [db, page.id]);

  const stats = useMemo(() => {
    if (!events) return null;
    const perBlock = blocks.map((b) => ({ block: b, n: events.filter((e) => e.kind === 'click' && e.block_id === b.id).length })).sort((a, b) => b.n - a.n);
    return { ...summarize(events, range), perBlock };
  }, [events, blocks, range]);

  function exportCsv() {
    if (!entries) return;
    const rows = [['When', 'Block', 'Kind', 'Name', 'Email', 'Phone', 'Message'], ...entries.map((e) => [new Date(e.created_at).toISOString(), blocks.find((b) => b.id === e.block_id)?.title ?? '', e.kind, e.data.name ?? '', e.data.email ?? '', e.data.phone ?? '', e.data.message ?? ''])];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `${page.slug}-entries.csv`; a.click(); URL.revokeObjectURL(a.href);
  }
  async function removeEntry(e: Entry) {
    try { await deleteEntry(db, e.id); setEntries((list) => list?.filter((x) => x.id !== e.id) ?? null); }
    catch (err) { toast.danger(err instanceof Error ? err.message : 'Could not delete it.'); }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs variant="secondary" selectedKey={view} onSelectionChange={(k) => setView(k as 'visits' | 'entries')}>
          <Tabs.ListContainer><Tabs.List aria-label="Insights"><Tabs.Tab id="visits">Visits<Tabs.Indicator /></Tabs.Tab>{(entries?.length ?? 0) > 0 && <Tabs.Tab id="entries">Entries · {entries!.length}<Tabs.Indicator /></Tabs.Tab>}</Tabs.List></Tabs.ListContainer>
        </Tabs>
        {view === 'visits' ? <RangeTabs options={ranges} value={range} onChange={setRange} aria-label="Period" /> : <Button variant="outline" size="sm" onPress={exportCsv} isDisabled={!entries?.length}><DownloadSimpleIcon /> CSV</Button>}
      </div>
      {error && <Notice status="danger" title="Could not load the figures">{error}</Notice>}

      {view === 'visits' && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Views" value={stats ? stats.views.toLocaleString() : null} detail={range === 'all' ? 'all time' : `last ${range} days`} />
            <StatCard label="Clicks" value={stats ? stats.clicks.toLocaleString() : null} detail="presses on blocks" />
            <StatCard label="Click rate" value={stats ? (stats.views ? `${Math.round((stats.clicks / stats.views) * 100)}%` : '–') : null} detail="clicks per view" />
          </div>
          <Card className="gap-3 p-5">
            <h3 className="text-base">Views per day</h3>
            {stats ? <AreaChart data={stats.series} height={220} formatLabel={(x) => new Date(String(x)).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} aria-label="Views per day" /> : <Skeleton className="h-[220px] rounded-(--yare-radius-control)" />}
          </Card>
          <TrafficBoxes traffic={stats} />
          <Card className="gap-3 p-5">
            <h3 className="text-base">By block</h3>
            {!stats ? <Skeleton className="h-32 rounded-(--yare-radius-control)" /> : stats.perBlock.length === 0 ? <p className="text-sm text-muted">No blocks yet.</p> : (
              <ul className="flex flex-col divide-y divide-separator">
                {stats.perBlock.map(({ block: b, n }) => (
                  <li key={b.id} className="flex items-center gap-3 py-2 text-sm"><span className="min-w-0 flex-1 truncate">{b.title || b.url || 'Block'}</span><span className="text-xs text-muted">{b.w}×{b.h}</span><span className="w-16 text-right font-semibold tabular-nums">{n.toLocaleString()}</span></li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}

      {view === 'entries' && (
        entries === null ? <Skeleton className="h-64 rounded-(--yare-radius-card)" /> : (
          <DataTable<Entry>
            caption="Entries"
            rows={entries}
            rowKey={(e) => e.id}
            empty={<p className="p-6 text-center text-sm text-muted">Nothing yet. Add a contact form or an email sign-up block, and what visitors type lands here.</p>}
            columns={[
              { id: 'when', header: 'When', numeric: true, cell: (e) => <span className="text-muted">{new Date(e.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span> },
              { id: 'block', header: 'Block', cell: (e) => blocks.find((b) => b.id === e.block_id)?.title || (e.kind === 'signup' ? 'Sign-up' : 'Form') },
              { id: 'name', header: 'Name', cell: (e) => e.data.name ?? <span className="text-muted">–</span> },
              { id: 'email', header: 'Email', cell: (e) => e.data.email ? <a className="text-accent hover:underline" href={`mailto:${e.data.email}`}>{e.data.email}</a> : <span className="text-muted">–</span> },
              { id: 'phone', header: 'Phone', cell: (e) => e.data.phone ?? <span className="text-muted">–</span> },
              { id: 'message', header: 'Message', cell: (e) => <span className="line-clamp-2 max-w-xs whitespace-pre-wrap">{e.data.message ?? ''}</span> },
              { id: 'actions', header: '', label: 'Actions', align: 'end', cell: (e) => <Button variant="ghost" size="sm" isIconOnly aria-label="Delete entry" onPress={() => void removeEntry(e)}><TrashIcon /></Button> },
            ]}
          />
        )
      )}
    </div>
  );
}
