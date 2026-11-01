import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Card, Skeleton } from '@heroui/react';
import { ArrowRightIcon, PlusIcon } from '@phosphor-icons/react';
import { DataTable, Notice, RangeTabs, StatCard, StatusChip, YareMark } from '../yare';
import { AreaChart } from '../yare-charts';
import type { Event } from '../lib/supabase';
import { listAllEvents } from '../lib/links-api';
import { TrafficBoxes, ranges, since, summarize, type Range } from './Traffic';
import type { Page } from '../lib/supabase';
import { usePages } from './PagesContext';
import { NewPageDialog } from './NewPageDialog';

/** The dashboard: a few numbers and the pages, newest first. */
export function HomePage() {
  const { db, pages, error } = usePages();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [range, setRange] = useState<Range>('30');
  const [events, setEvents] = useState<Event[] | null>(null);
  useEffect(() => {
    let gone = false;
    setEvents(null);
    listAllEvents(db, since(range)).then((e) => { if (!gone) setEvents(e); }).catch(() => { if (!gone) setEvents([]); });
    return () => { gone = true; };
  }, [db, range]);
  const traffic = useMemo(() => (events ? summarize(events, range) : null), [events, range]);
  const views = pages?.reduce((n, p) => n + p.views, 0) ?? 0;
  const clicks = pages?.reduce((n, p) => n + p.clicks, 0) ?? 0;
  return (
    <>
      {error && <Notice status="danger" title="Could not load your pages">{error}</Notice>}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Pages" value={pages ? String(pages.length) : null} detail={pages ? `${pages.filter((p) => p.status === 'published').length} live` : undefined} />
        <StatCard label="Views" value={pages ? views.toLocaleString() : null} detail="all time" />
        <StatCard label="Clicks" value={pages ? clicks.toLocaleString() : null} detail={pages && views ? `${Math.round((clicks / views) * 100)}% of views` : 'all time'} />
      </div>
      {pages !== null && pages.length === 0 && (
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-12 text-center">
          <YareMark size={72} />
          <h2 className="text-2xl">Your first page</h2>
          <p className="text-sm text-muted">One address with every link you have: your picture, a few words, your social icons, and the links, videos and forms you choose. Everything stays on your own accounts.</p>
          <Button variant="primary" onPress={() => setCreating(true)}><PlusIcon weight="bold" /> New page</Button>
        </div>
      )}
      {pages !== null && pages.length > 0 && (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl">Traffic</h2>
            <RangeTabs options={ranges} value={range} onChange={setRange} aria-label="Period" />
          </div>
          <Card className="mb-4 gap-3 p-5">
            <h3 className="text-base">Views per day, all pages</h3>
            {traffic ? <AreaChart data={traffic.series} height={220} formatLabel={(x) => new Date(String(x)).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} aria-label="Views per day" /> : <Skeleton className="h-[220px] rounded-(--yare-radius-control)" />}
          </Card>
          <div className="mb-8"><TrafficBoxes traffic={traffic} /></div>
          <h2 className="mb-3 text-xl">Your pages</h2>
          <DataTable<Page>
            caption="Your pages"
            rows={pages}
            rowKey={(p) => p.id}
            columns={[
              { id: 'title', header: 'Page', cell: (p) => <button type="button" className="yare-table__link" onClick={() => navigate(`/pages/${p.id}`)}>{p.title}</button> },
              { id: 'address', header: 'Address', cell: (p) => <span className="text-muted">/{p.slug}</span> },
              { id: 'status', header: 'Status', cell: (p) => <StatusChip tone={p.status === 'published' ? 'success' : 'default'}>{p.status === 'published' ? 'Live' : 'Draft'}</StatusChip> },
              { id: 'views', header: 'Views', align: 'end', numeric: true, cell: (p) => p.views.toLocaleString() },
              { id: 'clicks', header: 'Clicks', align: 'end', numeric: true, cell: (p) => p.clicks.toLocaleString() },
              { id: 'open', header: '', label: 'Actions', align: 'end', cell: (p) => <div className="flex justify-end gap-2"><Button variant="outline" size="sm" onPress={() => navigate(`/pages/${p.id}`)}>Edit</Button>{p.status === 'published' && <Button variant="outline" size="sm" onPress={() => window.open(`/${p.slug}`, '_blank', 'noopener')}>Open <ArrowRightIcon /></Button>}</div> },
            ]}
          />
        </>
      )}
      <NewPageDialog isOpen={creating} onOpenChange={setCreating} />
    </>
  );
}
