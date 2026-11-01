import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button, Skeleton, Tabs, toast } from '@heroui/react';
import { ArrowSquareOutIcon, CheckCircleIcon, CircleNotchIcon, EyeIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { PageHeader, type AppIdentity } from '../../yare';
import type { Block, Page } from '../../lib/supabase';
import { getPage, setPublished } from '../../lib/links-api';
import { SaveStatusProvider, useSaveStatus } from '../../lib/save-status';
import { usePages } from '../PagesContext';
import { Shell } from '../Shell';
import { BuildTab } from './BuildTab';
import { TemplatesTab } from './TemplatesTab';
import { LookTab } from './LookTab';
import { SettingsTab } from './SettingsTab';
import { SeoTab } from './SeoTab';
import { InsightsTab } from './InsightsTab';

type Tab = 'build' | 'templates' | 'look' | 'settings' | 'seo' | 'insights';
interface ShellProps { app: AppIdentity; user: { name: string; detail?: string }; onSignOut: () => void }

/** One page: Build, Look, Templates, Settings, SEO/AEO, Insights. */
export function PageEditor({ shell }: { shell: ShellProps }) {
  return <SaveStatusProvider><Inner shell={shell} /></SaveStatusProvider>;
}

function Inner({ shell }: { shell: ShellProps }) {
  const { id = '' } = useParams();
  const { db, patch, remove } = usePages();
  const navigate = useNavigate();
  const { state, run } = useSaveStatus();
  const [data, setData] = useState<{ page: Page; blocks: Block[] } | null>(null);
  const [missing, setMissing] = useState(false);
  const [tab, setTab] = useState<Tab>('build');
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    let gone = false;
    setData(null); setMissing(false);
    getPage(db, id).then((d) => { if (!gone) setData(d); }).catch(() => { if (!gone) setMissing(true); });
    return () => { gone = true; };
  }, [db, id]);

  const onPage = (page: Page) => { setData((d) => (d ? { ...d, page } : d)); patch(page); };
  const setBlocks = (fn: (b: Block[]) => Block[]) => setData((d) => (d ? { ...d, blocks: fn(d.blocks) } : d));

  async function togglePublish() {
    if (!data) return;
    setPublishing(true);
    try {
      const page = await setPublished(db, data.page.id, data.page.status !== 'published');
      onPage(page);
      toast.success(page.status === 'published' ? 'Your page is live' : 'Page closed');
    } catch (err) { toast.danger(err instanceof Error ? err.message : 'Could not change that.'); }
    finally { setPublishing(false); }
  }

  if (missing) return <Shell {...shell} topbar={<PageHeader crumbs={[{ label: 'Links', href: '/' }, { label: 'Not found' }]} />}><p className="text-sm text-muted">That page is not here. <button type="button" className="text-accent hover:underline" onClick={() => navigate('/')}>Back home</button>.</p></Shell>;

  const live = data?.page.status === 'published';
  const actions = data && (
    <>
      <span className="hidden items-center gap-1.5 text-sm text-muted sm:flex">{state === 'saving' ? <><CircleNotchIcon className="animate-spin" /> Saving…</> : state === 'error' ? <><WarningCircleIcon /> Not saved</> : <><CheckCircleIcon /> All changes saved</>}</span>
      <Button variant="outline" onPress={() => window.open(`/${data.page.slug}?preview`, '_blank', 'noopener')}><EyeIcon /> Preview</Button>
      {live && <Button variant="outline" onPress={() => window.open(`/${data.page.slug}`, '_blank', 'noopener')}><ArrowSquareOutIcon /> Open</Button>}
      <Button variant={live ? 'outline' : 'primary'} isPending={publishing} onPress={() => void togglePublish()}>{live ? 'Close page' : 'Publish'}</Button>
    </>
  );

  return (
    <Shell {...shell} topbar={<PageHeader crumbs={[{ label: 'Links', href: '/' }, { label: data?.page.title ?? '…' }]} actions={actions} />}>
      {!data ? (
        <div className="flex flex-col gap-4" aria-busy="true"><Skeleton className="h-10 w-72 rounded-(--yare-radius-control)" /><div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_24rem]"><Skeleton className="h-96 rounded-(--yare-radius-card)" /><Skeleton className="h-96 rounded-(--yare-radius-card)" /></div></div>
      ) : (
        <Tabs variant="secondary" selectedKey={tab} onSelectionChange={(k) => setTab(k as Tab)} className="-mt-2">
          <Tabs.ListContainer>
            <Tabs.List aria-label="Page sections">
              <Tabs.Tab id="build">Build<Tabs.Indicator /></Tabs.Tab>
              <Tabs.Tab id="look">Look<Tabs.Indicator /></Tabs.Tab>
              <Tabs.Tab id="templates">Templates<Tabs.Indicator /></Tabs.Tab>
              <Tabs.Tab id="settings">Settings<Tabs.Indicator /></Tabs.Tab>
              <Tabs.Tab id="seo">SEO/AEO<Tabs.Indicator /></Tabs.Tab>
              <Tabs.Tab id="insights">Insights<Tabs.Indicator /></Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>
          <Tabs.Panel id="build" className="pt-4"><BuildTab db={db} page={data.page} blocks={data.blocks} setBlocks={setBlocks} onPage={onPage} run={run} /></Tabs.Panel>
          <Tabs.Panel id="templates" className="pt-4"><TemplatesTab db={db} page={data.page} blocks={data.blocks} setBlocks={setBlocks} onPage={onPage} run={run} onApplied={() => setTab('build')} /></Tabs.Panel>
          <Tabs.Panel id="look" className="pt-4"><LookTab db={db} page={data.page} blocks={data.blocks} onPage={onPage} run={run} /></Tabs.Panel>
          <Tabs.Panel id="settings" className="pt-4"><SettingsTab db={db} page={data.page} blocks={data.blocks} onPage={onPage} run={run} onDeleted={() => { remove(data.page.id); navigate('/'); }} /></Tabs.Panel>
          <Tabs.Panel id="seo" className="pt-4"><SeoTab db={db} page={data.page} blocks={data.blocks} onPage={onPage} run={run} /></Tabs.Panel>
          <Tabs.Panel id="insights" className="pt-4"><InsightsTab db={db} page={data.page} blocks={data.blocks} /></Tabs.Panel>
        </Tabs>
      )}
    </Shell>
  );
}
