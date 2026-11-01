import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button, Skeleton, Tabs, toast } from '@heroui/react';
import { CheckCircleIcon, CircleNotchIcon, EyeIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { Notice, PageHeader, StatusChip, type AppIdentity } from '../../yare';
import type { Transfer, TransferFile } from '../../lib/supabase';
import { getTransfer, publishTransfer, unpublishTransfer } from '../../lib/transfer-api';
import { SaveStatusProvider, useSaveStatus } from '../../lib/save-status';
import { useTransfers } from '../TransfersContext';
import { Shell } from '../Shell';
import { linkLabel, linkState, linkTone, timeLeft } from '../status';
import { BuildTab } from './BuildTab';
import { SettingsTab } from './SettingsTab';
import { ShareTab } from './ShareTab';
import { DownloadsTab } from './DownloadsTab';

interface ShellProps { app: AppIdentity; user: { name: string; detail?: string }; onSignOut: () => void }

export function TransferPage({ shell }: { shell: ShellProps }) {
  return <SaveStatusProvider><Inner shell={shell} /></SaveStatusProvider>;
}

function SaveIndicator() {
  const { state } = useSaveStatus();
  return (
    <span className="hidden items-center gap-1.5 text-sm text-muted sm:inline-flex" aria-live="polite">
      {state === 'saving' && <><CircleNotchIcon className="animate-spin" /> Saving…</>}
      {state === 'saved' && <><CheckCircleIcon /> All changes saved</>}
      {state === 'error' && <><WarningCircleIcon className="text-danger" /> Not saved</>}
    </span>
  );
}

type Tab = 'build' | 'settings' | 'share' | 'downloads';

function Inner({ shell }: { shell: ShellProps }) {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { db, patch, remove } = useTransfers();
  const { run } = useSaveStatus();
  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const [files, setFiles] = useState<TransferFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('build');
  const [publishing, setPublishing] = useState(false);

  const load = useCallback(async () => {
    try { const d = await getTransfer(db, id); setTransfer(d.transfer); setFiles(d.files); setError(null); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not load this transfer.'); }
  }, [db, id]);
  useEffect(() => { void load(); }, [load]);

  function apply(next: Transfer) { setTransfer(next); patch(next); }

  async function togglePublish() {
    if (!transfer) return;
    setPublishing(true);
    try {
      const next = linkState(transfer) === 'live' ? await unpublishTransfer(db, transfer.id) : await publishTransfer(db, transfer.id);
      apply(next);
      toast.success(linkState(next) === 'live' ? `Published. The link lives ${next.expiry_days} day${next.expiry_days === 1 ? '' : 's'}.` : 'Closed. The link now says “not open”.');
      if (linkState(next) === 'live') setTab('share');
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : 'Could not change the status.');
    } finally {
      setPublishing(false);
    }
  }

  const state = transfer ? linkState(transfer) : 'draft';

  return (
    <Shell
      {...shell}
      topbar={
        <PageHeader
          crumbs={[{ label: 'Transfer', href: '/' }, { label: transfer?.title ?? '…' }]}
          actions={
            <>
              <SaveIndicator />
              {transfer && state !== 'draft' && <StatusChip tone={linkTone[state]}>{state === 'live' ? timeLeft(transfer) : linkLabel[state]}</StatusChip>}
              <Button variant="outline" onPress={() => window.open(`/t/${transfer?.slug}?preview`, '_blank', 'noopener,noreferrer')} isDisabled={!transfer}><EyeIcon /> Preview</Button>
              <Button variant={state === 'live' ? 'outline' : 'secondary'} onPress={togglePublish} isPending={publishing} isDisabled={!transfer}>{state === 'live' ? 'Close link' : state === 'expired' ? 'Publish again' : 'Publish'}</Button>
            </>
          }
        />
      }
    >
      {error && <Notice status="danger" title="Could not load this transfer">{error}</Notice>}
      {!transfer && !error && (
        <div className="flex flex-col gap-6" aria-busy="true">
          <Skeleton className="h-9 w-96 max-w-full rounded-md" />
          <div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-96 rounded-(--yare-radius-card)" /><Skeleton className="h-96 rounded-(--yare-radius-card)" /></div>
        </div>
      )}
      {transfer && (
        <Tabs variant="secondary" selectedKey={tab} onSelectionChange={(k) => setTab(k as Tab)} className="-mt-2">
          <Tabs.ListContainer>
            <Tabs.List aria-label="Transfer sections">
              <Tabs.Tab id="build">Build<Tabs.Indicator /></Tabs.Tab>
              <Tabs.Tab id="settings">Settings<Tabs.Indicator /></Tabs.Tab>
              <Tabs.Tab id="share">Share<Tabs.Indicator /></Tabs.Tab>
              <Tabs.Tab id="downloads">Downloads<Tabs.Indicator /></Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>
          <Tabs.Panel id="build" className="p-0 pt-6"><BuildTab db={db} transfer={transfer} onTransfer={apply} files={files} setFiles={setFiles} run={run} /></Tabs.Panel>
          <Tabs.Panel id="settings" className="p-0 pt-6"><SettingsTab db={db} transfer={transfer} files={files} onTransfer={apply} run={run} onDeleted={() => { remove(transfer.id); navigate('/'); }} /></Tabs.Panel>
          <Tabs.Panel id="share" className="p-0 pt-6"><ShareTab transfer={transfer} onPublish={togglePublish} publishing={publishing} /></Tabs.Panel>
          <Tabs.Panel id="downloads" className="p-0 pt-6"><DownloadsTab db={db} transfer={transfer} files={files} /></Tabs.Panel>
        </Tabs>
      )}
    </Shell>
  );
}
