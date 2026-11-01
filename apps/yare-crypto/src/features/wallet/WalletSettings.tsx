import { useState } from 'react';
import { AlertDialog, Button, Card, Description, Input, Label, ListBox, Select, TextField, toast } from '@heroui/react';
import { ArrowSquareOutIcon, CopyIcon } from '@phosphor-icons/react';
import { monsterSrc } from '../../yare';
import type { Wallet } from '../../lib/supabase';
import { deleteWallet, updateWallet } from '../../lib/crypto-api';
import { allNetworks, networkOf, networks, type Network } from '../../lib/networks';
import { useWallets } from '../WalletsContext';

/** Name and network, the address to copy, the read-only promise, and the way out. */
export function WalletSettings({ wallet, onRemoved }: { wallet: Wallet; onRemoved: () => void }) {
  const { db, patch, remove, sync, keys } = useWallets();
  const [name, setName] = useState(wallet.name);
  const [network, setNetwork] = useState<Network>(wallet.network);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const net = networkOf(wallet.network);
  const dirty = name.trim() !== wallet.name || network !== wallet.network;
  const options = networks.some((n) => n.id === wallet.network) ? networks : [networkOf(wallet.network), ...networks];

  async function copyAddress() {
    try { await navigator.clipboard.writeText(wallet.address); toast.success('Address copied'); } catch { toast.danger('Could not copy.'); }
  }
  async function save() {
    if (!dirty || !name.trim()) return;
    setSaving(true);
    try {
      const next = await updateWallet(db, wallet.id, { name, network: network !== wallet.network ? network : undefined });
      patch(next);
      if (network !== wallet.network) { toast.success('Network changed. Reading the chain again…'); if (keys.status === 'ready') void sync(next.id); }
      else toast.success('Saved');
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  }
  async function destroy() {
    setBusy(true);
    try { await deleteWallet(db, wallet.id); remove(wallet.id); toast.success('Wallet removed'); onRemoved(); }
    catch (err) { toast.danger(err instanceof Error ? err.message : 'Could not remove it.'); setBusy(false); }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="gap-4 p-5">
          <h3 className="text-lg">Basics</h3>
          <TextField fullWidth value={name} onChange={setName} maxLength={80} isRequired>
            <Label>Name</Label>
            <Input />
            <Description>Shown in the sidebar and on the home page.</Description>
          </TextField>
          <Select aria-label="Network" selectedKey={network} onSelectionChange={(k) => setNetwork(k as Network)} fullWidth>
            <Label>Network</Label>
            <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
            <Select.Popover>
              <ListBox>
                {options.map((n) => <ListBox.Item key={n.id} id={n.id} textValue={n.name}>{n.name}</ListBox.Item>)}
              </ListBox>
            </Select.Popover>
          </Select>
          <Description>{network !== wallet.network ? 'Changing the network clears what was read and reads the chain again.' : allNetworks.length > networks.length ? 'The free Etherscan plan reads Ethereum. Base, Arbitrum, Optimism and Polygon open up with a paid plan.' : 'The same address exists on every network; pick the one to read.'}</Description>
          <div className="mt-auto grid grid-cols-2 gap-2">
            <Button variant="primary" fullWidth isDisabled={!dirty || !name.trim()} isPending={saving} onPress={() => void save()}>Save</Button>
            <Button variant="outline" fullWidth onPress={() => { setName(wallet.name); setNetwork(wallet.network); }} isDisabled={!dirty}>Reset</Button>
          </div>
        </Card>

        <Card className="gap-4 p-5">
          <h3 className="text-lg">Address</h3>
          <div className="flex items-center justify-between gap-3 rounded-(--yare-radius-control) border border-border bg-surface-secondary px-3 py-2">
            <div className="min-w-0">
              <div className="text-xs font-medium text-muted">Public address</div>
              <code className="block truncate font-mono text-sm">{wallet.address}</code>
            </div>
            <Button variant="ghost" size="sm" isIconOnly aria-label="Copy address" onPress={() => void copyAddress()}><CopyIcon /></Button>
          </div>
          <Description>The address cannot change: remove this wallet and add another one.</Description>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted">Added</dt><dd>{new Date(wallet.created_at).toLocaleDateString()}</dd>
            <dt className="text-muted">Last read</dt><dd>{wallet.last_synced_at ? new Date(wallet.last_synced_at).toLocaleString() : 'not yet'}</dd>
          </dl>
          <div className="mt-auto grid grid-cols-2 gap-2">
            <Button variant="outline" fullWidth onPress={() => window.open(`${net.explorer}/address/${wallet.address}`, '_blank', 'noopener,noreferrer')}>Open in {net.name === 'Ethereum' ? 'Etherscan' : 'explorer'} <ArrowSquareOutIcon /></Button>
            <Button variant="outline" fullWidth onPress={() => void copyAddress()}><CopyIcon /> Copy address</Button>
          </div>
        </Card>
      </div>

      <Card className="flex-row items-center gap-6 p-5">
        <img src={monsterSrc('crypto')} alt="" className="hidden h-28 w-auto flex-none sm:block" draggable={false} />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h3 className="text-lg">View only, by design</h3>
          <p className="text-sm text-muted">
            Yare Crypto knows this address and nothing else. It never asks for a seed phrase, a private key or a wallet connection, and it cannot sign, send or approve anything. Everything on these pages is read from public chain data and kept in your own database. Your keys stay where they are: with you.
          </p>
        </div>
      </Card>

      <Card className="gap-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg">Remove this wallet</h3>
            <p className="text-sm text-muted">Deletes its activity, holdings and NFTs from your database. The address itself is untouched; you can add it again any time.</p>
          </div>
          <Button variant="danger-soft" onPress={() => setConfirm(true)}>Remove wallet</Button>
        </div>
      </Card>

      <AlertDialog isOpen={confirm} onOpenChange={setConfirm}>
        <AlertDialog.Backdrop>
          <AlertDialog.Container size="sm">
            <AlertDialog.Dialog aria-label="Remove wallet">
              <AlertDialog.Header><AlertDialog.Heading>Remove “{wallet.name}”?</AlertDialog.Heading></AlertDialog.Header>
              <AlertDialog.Body><p className="text-sm text-muted">Its rows are deleted from your database. Nothing happens to the address or its funds.</p></AlertDialog.Body>
              <AlertDialog.Footer className="gap-2">
                <Button variant="outline" onPress={() => setConfirm(false)}>Keep it</Button>
                <Button variant="danger" onPress={() => void destroy()} isPending={busy}>Remove</Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>
    </div>
  );
}
