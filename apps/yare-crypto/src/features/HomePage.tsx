import { useState } from 'react';
import { Button, Tabs } from '@heroui/react';
import { ArrowsClockwiseIcon, PlusIcon } from '@phosphor-icons/react';
import { Notice, YareMark } from '../yare';
import { useWallets } from './WalletsContext';
import { Dashboard } from './dashboard/Dashboard';
import { useWalletData } from './dashboard/useWalletData';
import { NewWalletDialog } from './NewWalletDialog';

type Tab = 'overview' | 'holdings' | 'activity' | 'nfts' | 'pnl';

/** Every wallet in one view. */
export function HomePage() {
  const { db, wallets, error, dataVersion, keys } = useWallets();
  const { data, error: dataError } = useWalletData(db, wallets ? wallets.map((w) => w.id) : undefined, dataVersion);
  const [adding, setAdding] = useState(false);
  const [tab, setTab] = useState<Tab>('overview');

  if (error) return <Notice status="danger" title="Could not load your wallets">{error}</Notice>;
  if (wallets !== null && wallets.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-12 text-center">
        <YareMark size={72} />
        <h2 className="text-2xl">Your first wallet</h2>
        <p className="text-sm text-muted">Paste a public address and see what it holds, what it is worth and what moved. Read only: nothing here can touch your funds.</p>
        <Button variant="primary" onPress={() => setAdding(true)}><PlusIcon weight="bold" /> New wallet</Button>
        <NewWalletDialog key={String(adding)} isOpen={adding} onOpenChange={setAdding} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {keys.status === 'missing' && <Notice status="warning" icon={false} title="Add your Etherscan key to read the chain">Wallets are listed but empty until the key is in place. Connections → Network APIs shows the one command.</Notice>}
      {keys.status === 'error' && <Notice status="danger" title="The sync function did not answer">{keys.detail} Deploy it as the install guide shows.</Notice>}
      <Tabs variant="secondary" selectedKey={tab} onSelectionChange={(k) => setTab(k as Tab)} className="-mt-2">
        <Tabs.ListContainer>
          <Tabs.List aria-label="Sections">
            <Tabs.Tab id="overview">Overview<Tabs.Indicator /></Tabs.Tab>
            <Tabs.Tab id="holdings">Holdings<Tabs.Indicator /></Tabs.Tab>
            <Tabs.Tab id="activity">Transactions<Tabs.Indicator /></Tabs.Tab>
            <Tabs.Tab id="nfts">NFTs<Tabs.Indicator /></Tabs.Tab>
            <Tabs.Tab id="pnl">Profit and loss<Tabs.Indicator /></Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>
        {(['overview', 'holdings', 'activity', 'nfts', 'pnl'] as const).map((v) => (
          <Tabs.Panel key={v} id={v} className="p-0 pt-6"><Dashboard db={db} version={dataVersion} data={data} error={dataError} wallets={wallets ?? []} combined view={v} onSeeAll={setTab} /></Tabs.Panel>
        ))}
      </Tabs>
    </div>
  );
}

/** The top-bar button on the home: reads every wallet again. */
export function RefreshAllButton() {
  const { wallets, keys, sync, syncing } = useWallets();
  if (!wallets?.length) return null;
  return (
    <Button variant="outline" isDisabled={keys.status !== 'ready' || syncing.size > 0} isPending={syncing.size > 0} onPress={() => { for (const w of wallets) void sync(w.id); }}><ArrowsClockwiseIcon /> Refresh all</Button>
  );
}
