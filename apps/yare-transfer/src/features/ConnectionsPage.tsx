import { useState } from 'react';
import { Button, Card, Description, Input, Label, TextField, toast } from '@heroui/react';
import { HardDrivesIcon } from '@phosphor-icons/react';
import { ConnectionsPanel, MonsterNote } from '../yare';
import { saveSettings } from '../lib/transfer-api';
import { useTransfers } from './TransfersContext';

/** The shared Connections page plus the storage limit Yare Transfer needs. */
export function ConnectionsPage({ supabase }: { supabase: { url: string; publishableKey: string } }) {
  const { db, settings, setSettings } = useTransfers();
  const [mb, setMb] = useState(String(settings?.max_file_mb ?? 20));
  const [saving, setSaving] = useState(false);
  const value = Math.max(1, Math.min(1024, Number(mb) || 0));

  async function save() {
    setSaving(true);
    try { setSettings(await saveSettings(db, value)); toast.success('Limit saved'); }
    catch (err) { toast.danger(err instanceof Error ? err.message : 'Could not save.'); }
    finally { setSaving(false); }
  }

  return (
    <ConnectionsPanel appLabel="Yare Transfer" supabase={{ ...supabase, isDefault: true }} repoUrl={null}>
      <Card className="gap-5 p-5 lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex items-center gap-3">
            <HardDrivesIcon size={28} />
            <div>
              <h3 className="text-lg">Storage</h3>
              <p className="text-sm text-muted">The files live in your own Supabase storage, in a private bucket.</p>
            </div>
          </div>
          <TextField fullWidth value={mb} onChange={setMb} type="number">
            <Label>Largest file, in MB</Label>
            <Input inputMode="numeric" />
            <Description>20 MB to start. Up to 1,024 MB (1 GB) is the most this app accepts.</Description>
          </TextField>
          <Button variant="primary" className="self-start" isDisabled={String(value) === String(settings?.max_file_mb ?? 20)} isPending={saving} onPress={() => void save()}>Save</Button>
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-3 border-t border-border pt-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-5">
          <MonsterNote title="Mind your Supabase plan">
            Raising the limit here does not raise your plan's. The free Supabase plan allows 50 MB per file and 1 GB of storage in total; a bigger file is refused at upload, and the total counts across every Yare Monster app in your project. Expired transfers free their space by themselves. Check your plan before you go big.
          </MonsterNote>
        </div>
      </Card>
    </ConnectionsPanel>
  );
}
