import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button, Skeleton, Tabs, toast } from '@heroui/react';
import { ArrowSquareOutIcon, ArrowsClockwiseIcon, CopyIcon } from '@phosphor-icons/react';
import { Notice, PageHeader, StatusChip, type AppIdentity } from '../../yare';
import { networkOf, shortAddress } from '../../lib/networks';
import { relativeTime } from '../../lib/format';
import { useWallets } from '../WalletsContext';
import { Shell } from '../Shell';
import { Dashboard, WalletStatusLine } from '../dashboard/Dashboard';
import { useWalletData } from '../dashboard/useWalletData';
import { WalletSettings } from './WalletSettings';

interface ShellProps { app: AppIdentity; user: { name: string; detail?: string }; onSignOut: () => void }
type Tab = 'overview' | 'holdings' | 'activity' | 'nfts' | 'pnl' | 'settings';

export function WalletPage({ shell }: { shell: ShellProps }) {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { db, wallets, dataVersion, keys, sync, syncing } = useWallets();
  const wallet = wallets?.find((w) => w.id === id) ?? null;
  const { data, error } = useWalletData(db, [id], dataVersion);
  const [tab, setTab] = useState<Tab>('overview');
  const net = wallet ? networkOf(wallet.network) : null;

  async function copyAddress() {
    if (!wallet) return;
    try { await navigator.clipboard.writeText(wallet.address); toast.success('Address copied'); } catch { toast.danger('Could not copy.'); }
  }
  return (
    <Shell
      {...shell}
      topbar={
        <PageHeader
          crumbs={[{ label: 'Crypto', href: '/' }, { label: wallet?.name ?? '…' }]}
          actions={wallet && (
            <>
              <span className="hidden text-xs text-muted sm:inline">Read {relativeTime(wallet.last_synced_at)}</span>
              <Button variant="outline" size="sm" onPress={() => void sync(wallet.id)} isPending={syncing.has(wallet.id)} isDisabled={keys.status !== 'ready'}><ArrowsClockwiseIcon /> Refresh</Button>
            </>
          )}
        />
      }
    >
      {wallets === null && (
        <div className="flex flex-col gap-4" aria-busy="true">
          <div className="flex gap-3"><Skeleton className="h-7 w-24 rounded-full" /><Skeleton className="h-7 w-32 rounded-md" /><Skeleton className="h-7 w-24 rounded-full" /></div>
          <Skeleton className="h-10 w-96 max-w-full rounded-md" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-(--yare-radius-card)" />)}</div>
          <Skeleton className="h-80 rounded-(--yare-radius-card)" />
        </div>
      )}
      {wallets !== null && !wallet && <Notice status="danger" title="Wallet not found">It may have been removed.</Notice>}
      {wallet && net && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <StatusChip tone="accent">{net.name}</StatusChip>
            <button type="button" className="inline-flex items-center gap-1.5 rounded-(--yare-radius-control) border border-border bg-surface-secondary px-2.5 py-1 font-mono text-xs hover:bg-surface" onClick={() => void copyAddress()} title={wallet.address}>{shortAddress(wallet.address)} <CopyIcon /></button>
            <Button variant="ghost" size="sm" onPress={() => window.open(`${net.explorer}/address/${wallet.address}`, '_blank', 'noopener,noreferrer')}>Explorer <ArrowSquareOutIcon /></Button>
            <WalletStatusLine wallet={wallet} />
          </div>
          <Tabs variant="secondary" selectedKey={tab} onSelectionChange={(k) => setTab(k as Tab)}>
            <Tabs.ListContainer>
              <Tabs.List aria-label="Wallet sections">
                <Tabs.Tab id="overview">Overview<Tabs.Indicator /></Tabs.Tab>
                <Tabs.Tab id="holdings">Holdings<Tabs.Indicator /></Tabs.Tab>
                <Tabs.Tab id="activity">Transactions<Tabs.Indicator /></Tabs.Tab>
                <Tabs.Tab id="nfts">NFTs<Tabs.Indicator /></Tabs.Tab>
                <Tabs.Tab id="pnl">Profit and loss<Tabs.Indicator /></Tabs.Tab>
                <Tabs.Tab id="settings">Settings<Tabs.Indicator /></Tabs.Tab>
              </Tabs.List>
            </Tabs.ListContainer>
            {(['overview', 'holdings', 'activity', 'nfts', 'pnl'] as const).map((v) => (
              <Tabs.Panel key={v} id={v} className="p-0 pt-6"><Dashboard db={db} version={dataVersion} data={data} error={error} wallets={[wallet]} view={v} onSeeAll={setTab} /></Tabs.Panel>
            ))}
            <Tabs.Panel id="settings" className="p-0 pt-6"><WalletSettings wallet={wallet} onRemoved={() => navigate('/')} /></Tabs.Panel>
          </Tabs>
        </div>
      )}
    </Shell>
  );
}
