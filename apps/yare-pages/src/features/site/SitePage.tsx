import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { Button, Skeleton, Tabs } from '@heroui/react';
import { ArrowSquareOutIcon, ArrowsClockwiseIcon } from '@phosphor-icons/react';
import { Notice, PageHeader, StatusChip, type AppIdentity } from '../../yare';
import { relativeTime } from '../../lib/format';
import { useSites } from '../SitesContext';
import { Shell } from '../Shell';
import { Visitors } from '../dashboard/Visitors';
import { useSiteData } from '../dashboard/useSiteData';
import { GuideTab } from './GuideTab';
import { SiteSettings } from './SiteSettings';

interface ShellProps { app: AppIdentity; user: { name: string; detail?: string }; onSignOut: () => void }
type Tab = 'overview' | 'visitors' | 'guide' | 'settings';

export function SitePage({ shell }: { shell: ShellProps }) {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { db, sites, dataVersion, sync, syncing } = useSites();
  const site = sites?.find((s) => s.id === id) ?? null;
  const { data, error } = useSiteData(db, [id], dataVersion);
  const [params] = useSearchParams();
  const wanted = params.get('tab') as Tab | null;
  const [tab, setTab] = useState<Tab>(wanted && ['overview', 'visitors', 'guide', 'settings'].includes(wanted) ? wanted : site?.status === 'building' ? 'guide' : 'overview');

  return (
    <Shell
      {...shell}
      topbar={
        <PageHeader
          crumbs={[{ label: 'Pages', href: '/' }, { label: site?.name ?? '…' }]}
          actions={site && site.url ? (
            <>
              <span className="hidden text-xs text-muted sm:inline">Read {relativeTime(site.last_synced_at)}</span>
              <Button variant="outline" size="sm" onPress={() => window.open(site.url, '_blank', 'noopener,noreferrer')}>Open site <ArrowSquareOutIcon /></Button>
              <Button variant="outline" size="sm" onPress={() => void sync(site.id)} isPending={syncing.has(site.id)}><ArrowsClockwiseIcon /> Refresh</Button>
            </>
          ) : undefined}
        />
      }
    >
      {sites === null && (
        <div className="flex flex-col gap-4" aria-busy="true">
          <div className="flex gap-3"><Skeleton className="h-7 w-24 rounded-full" /><Skeleton className="h-7 w-40 rounded-md" /></div>
          <Skeleton className="h-10 w-80 max-w-full rounded-md" />
          <div className="grid gap-4 sm:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 rounded-(--yare-radius-card)" />)}</div>
          <Skeleton className="h-72 rounded-(--yare-radius-card)" />
        </div>
      )}
      {sites !== null && !site && <Notice status="danger" title="Website not found">It may have been removed.</Notice>}
      {site && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <StatusChip tone={site.status === 'live' ? 'success' : 'warning'}>{site.status === 'live' ? 'Live' : 'Building'}</StatusChip>
            {site.host && <code className="rounded-(--yare-radius-control) border border-border bg-surface-secondary px-2.5 py-1 text-xs">{site.host}</code>}
            {site.url && <StatusChip tone={site.source === 'none' ? (site.sync_status === 'error' ? 'danger' : 'default') : 'accent'}>{site.source === 'zone' ? 'On your Cloudflare' : site.source === 'beacon' ? 'Cloudflare Web Analytics' : site.sync_status === 'error' ? 'Could not read' : site.sync_status === 'syncing' ? 'Reading' : 'No visitor source'}</StatusChip>}
            {site.sync_error && <span className="text-xs text-danger">{site.sync_error}</span>}
          </div>
          <Tabs variant="secondary" selectedKey={tab} onSelectionChange={(k) => setTab(k as Tab)}>
            <Tabs.ListContainer>
              <Tabs.List aria-label="Website sections">
                <Tabs.Tab id="overview">Overview<Tabs.Indicator /></Tabs.Tab>
                <Tabs.Tab id="visitors">Visitors<Tabs.Indicator /></Tabs.Tab>
                <Tabs.Tab id="guide">Guide<Tabs.Indicator /></Tabs.Tab>
                <Tabs.Tab id="settings">Settings<Tabs.Indicator /></Tabs.Tab>
              </Tabs.List>
            </Tabs.ListContainer>
            <Tabs.Panel id="overview" className="p-0 pt-6">
              {site.status === 'live' ? <Visitors data={data} error={error} sites={[site]} view="overview" /> : <GuideTab site={site} short />}
            </Tabs.Panel>
            <Tabs.Panel id="visitors" className="p-0 pt-6">
              {site.status === 'live' ? <Visitors data={data} error={error} sites={[site]} view="visitors" /> : <Notice status="default" icon={false} title="Not live yet">Visitors appear once the website has an address. Paste it under Settings when it is live.</Notice>}
            </Tabs.Panel>
            <Tabs.Panel id="guide" className="p-0 pt-6"><GuideTab site={site} /></Tabs.Panel>
            <Tabs.Panel id="settings" className="p-0 pt-6"><SiteSettings site={site} onRemoved={() => navigate('/')} /></Tabs.Panel>
          </Tabs>
        </div>
      )}
    </Shell>
  );
}
