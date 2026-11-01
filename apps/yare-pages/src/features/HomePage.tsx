import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Card, Skeleton, Tabs } from '@heroui/react';
import { ArrowRightIcon, ArrowsClockwiseIcon, GlobeIcon, PencilSimpleIcon, PlusIcon } from '@phosphor-icons/react';
import { Notice, StatusChip, YareMark } from '../yare';
import { Sparkline } from '../yare-charts';
import { imageUrl } from '../lib/supabase';
import { num } from '../lib/format';
import { useSites } from './SitesContext';
import { NewSiteDialog } from './NewSiteDialog';
import { Visitors } from './dashboard/Visitors';
import { useSiteData } from './dashboard/useSiteData';

type Tab = 'websites' | 'visitors';

/** Every website in one place: the cards, and the visitors combined. */
export function HomePage() {
  const { db, sites, error, dataVersion, key } = useSites();
  const { data, error: dataError } = useSiteData(db, sites ? sites.map((s) => s.id) : undefined, dataVersion);
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);
  const [tab, setTab] = useState<Tab>('websites');

  if (error) return <Notice status="danger" title="Could not load your websites">{error}</Notice>;
  if (sites !== null && sites.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-12 text-center">
        <YareMark size={72} />
        <h2 className="text-2xl">Your first website</h2>
        <p className="text-sm text-muted">Build one with your assistant and the guide, or bring one you already have and see its visitors here. Your code, your hosting, your domain.</p>
        <Button variant="primary" onPress={() => setAdding(true)}><PlusIcon weight="bold" /> New website</Button>
        <NewSiteDialog key={String(adding)} isOpen={adding} onOpenChange={setAdding} />
      </div>
    );
  }

  const last30 = (id: string) => (data?.days ?? []).filter((d) => d.site_id === id).slice(-30);

  return (
    <div className="flex flex-col gap-4">
      {key.status === 'missing' && sites?.some((s) => s.status === 'live') && <Notice status="warning" icon={false} title="Add your Cloudflare token to see visitors">Connections → Visitors has the one box. Websites are listed either way.</Notice>}
      {key.status === 'error' && <Notice status="danger" title="The sync function did not answer">{key.detail} Deploy it as the install guide shows.</Notice>}
      <Tabs variant="secondary" selectedKey={tab} onSelectionChange={(k) => setTab(k as Tab)} className="-mt-2">
        <Tabs.ListContainer>
          <Tabs.List aria-label="Sections">
            <Tabs.Tab id="websites">Websites<Tabs.Indicator /></Tabs.Tab>
            <Tabs.Tab id="visitors">Visitors<Tabs.Indicator /></Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>
        <Tabs.Panel id="websites" className="p-0 pt-6">
          {sites === null ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-64 rounded-(--yare-radius-card)" />)}</div> : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sites.map((s) => {
                const days = last30(s.id);
                const visits = days.reduce((n, d) => n + d.visits, 0);
                const picture = imageUrl(db, s.preview_path) ?? s.preview_url;
                return (
                  <Card key={s.id} className="gap-0 overflow-hidden p-0">
                    <button type="button" className="block aspect-[16/9] w-full overflow-hidden bg-surface-secondary text-start" onClick={() => navigate(`/sites/${s.id}`)} aria-label={`Open ${s.name}`}>
                      {picture ? <img src={picture} alt="" className="h-full w-full object-cover" loading="lazy" /> : <div className="grid h-full w-full place-items-center"><GlobeIcon size={40} className="text-muted" /></div>}
                    </button>
                    <div className="flex flex-col gap-2 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0"><div className="truncate font-semibold">{s.name}</div><div className="truncate text-xs text-muted">{s.host || 'No address yet'}</div></div>
                        <StatusChip tone={s.status === 'live' ? 'success' : 'warning'}>{s.status === 'live' ? 'Live' : 'Building'}</StatusChip>
                      </div>
                      {s.page_description && <p className="line-clamp-2 text-sm text-muted" title={s.page_description}>{s.page_description}</p>}
                      {s.status === 'live' && s.source !== 'none' && (
                        <div className="flex items-end justify-between gap-3">
                          <div><div className="text-xs text-muted">Visits, 30 days</div><div className="text-xl font-bold tabular-nums">{data ? num(visits) : '…'}</div></div>
                          {days.length > 1 && <div className="w-28"><Sparkline values={days.map((d) => d.visits)} colour="var(--accent)" /></div>}
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" size="sm" fullWidth onPress={() => navigate(`/sites/${s.id}?tab=settings`)}><PencilSimpleIcon /> Edit</Button>
                        <Button variant="outline" size="sm" fullWidth onPress={() => navigate(`/sites/${s.id}`)}>Open <ArrowRightIcon /></Button>
                      </div>
                      {s.status === 'building' && <p className="text-center text-xs text-muted">{Object.values(s.checklist).filter(Boolean).length} of 8 steps done</p>}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </Tabs.Panel>
        <Tabs.Panel id="visitors" className="p-0 pt-6">
          <Visitors data={data} error={dataError} sites={(sites ?? []).filter((s) => s.status === 'live')} combined view="visitors" />
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}

/** The top-bar button on the home: reads every live website again. */
export function RefreshAllButton() {
  const { sites, sync, syncing } = useSites();
  const live = (sites ?? []).filter((s) => s.url);
  if (!live.length) return null;
  return <Button variant="outline" isDisabled={syncing.size > 0} isPending={syncing.size > 0} onPress={() => { for (const s of live) void sync(s.id); }}><ArrowsClockwiseIcon /> Refresh all</Button>;
}
