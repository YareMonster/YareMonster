import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Description, Input, Label, ListBox, Modal, Select, TextField, toast } from '@heroui/react';
import { Notice } from '../yare';
import { isAddress, networks, type Network } from '../lib/networks';
import { useWallets } from './WalletsContext';

/** Name, network, address. No wallet connection, no signature: a public address is all it takes. */
export function NewWalletDialog({ isOpen, onOpenChange }: { isOpen: boolean; onOpenChange: (o: boolean) => void }) {
  const { create, keys } = useWallets();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [network, setNetwork] = useState<Network>('ethereum');
  const [address, setAddress] = useState('');
  const [pending, setPending] = useState(false);
  const valid = name.trim().length > 0 && isAddress(address);

  async function submit() {
    if (!valid) return;
    setPending(true);
    try {
      const w = await create({ name, network, address });
      toast.success(keys.status === 'ready' ? 'Wallet added. Reading the chain…' : 'Wallet added. Add your Etherscan key under Connections to read it.');
      onOpenChange(false);
      navigate(`/wallets/${w.id}`);
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : 'Could not add the wallet.');
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop>
        <Modal.Container size="md">
          <Modal.Dialog aria-label="Add a wallet">
            <Modal.CloseTrigger />
            <Modal.Header><Modal.Heading>Add a wallet</Modal.Heading></Modal.Header>
            <Modal.Body className="flex flex-col gap-4">
              <Notice status="default" icon={false} title="Read only">Paste a public address. Nothing here can move funds, and you never connect or sign anything.</Notice>
              <TextField fullWidth value={name} onChange={setName} maxLength={80} isRequired>
                <Label>Name</Label>
                <Input placeholder="Main wallet" autoFocus />
              </TextField>
              <Select aria-label="Network" selectedKey={network} onSelectionChange={(k) => setNetwork(k as Network)} fullWidth>
                <Label>Network</Label>
                <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {networks.map((n) => <ListBox.Item key={n.id} id={n.id} textValue={n.name}>{n.name}</ListBox.Item>)}
                  </ListBox>
                </Select.Popover>
              </Select>
              <TextField fullWidth value={address} onChange={(v) => setAddress(v.trim())} isRequired isInvalid={address.length > 0 && !isAddress(address)}>
                <Label>Address</Label>
                <Input placeholder="0x…" className="font-mono" />
                <Description>{address.length > 0 && !isAddress(address) ? 'An address is 0x followed by 40 letters and digits.' : 'The public address, as shown in your wallet app.'}</Description>
              </TextField>
            </Modal.Body>
            <Modal.Footer className="gap-2">
              <Button variant="outline" onPress={() => onOpenChange(false)}>Cancel</Button>
              <Button variant="primary" onPress={() => void submit()} isDisabled={!valid} isPending={pending}>Add wallet</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
