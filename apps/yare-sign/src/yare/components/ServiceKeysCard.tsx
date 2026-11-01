import { useState } from 'react';
import { Button, Card, toast } from '@heroui/react';
import { ArrowSquareOutIcon, KeyIcon } from '@phosphor-icons/react';
import { Notice } from './Notice';
import { PasswordField } from './PasswordField';
import { StatusChip } from './StatusChip';

export type ServiceKeyStatus = 'checking' | 'ready' | 'missing' | 'error' | 'planned';

export interface ServiceKey {
  id: string;
  name: string;
  /** What the key is for, one line. */
  role: string;
  status: ServiceKeyStatus;
  /** Whether the app works without it. */
  optional?: boolean;
  /** Where to get the key. */
  url: string;
  /** "Free: 100,000 calls a day", for instance. */
  note?: string;
  /** Saves the pasted key; an empty string clears it. A planned service has none. */
  onSave?: (value: string) => Promise<void>;
}

export interface ServiceKeysCardProps {
  appLabel: string;
  title: string;
  /** One line under the title. */
  description: string;
  services: ServiceKey[];
  /** Shown when a check failed. */
  detail?: string;
}

/**
 * The connection block for apps that read outside services with an API key: chain data, Stripe,
 * a model provider. One box per service: what it is for, a field to paste the key, Save, and
 * where to get one. Keys go to the person's own database and are read only by their functions.
 */
export function ServiceKeysCard({ appLabel, title, description, services, detail }: ServiceKeysCardProps) {
  return (
    <Card className="gap-4 p-5">
      <div className="flex items-center gap-3">
        <KeyIcon size={28} />
        <div>
          <h3 className="text-lg">{title}</h3>
          <p className="text-sm text-muted">{description}</p>
        </div>
      </div>
      {detail && <Notice status="danger" title="Could not check">{detail}</Notice>}
      <div className="yare-keys">
        {services.map((s) => <ServiceBox key={s.id} service={s} />)}
      </div>
      <p className="text-xs text-muted">Keys are kept in your own database and used only by {appLabel}'s sync. They are never shown again after saving.</p>
    </Card>
  );
}

function ServiceBox({ service: s }: { service: ServiceKey }) {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const ready = s.status === 'ready';

  async function save() {
    if (!s.onSave) { toast.success(`${s.name} is planned. Nothing to save yet.`); return; }
    setSaving(true);
    try { await s.onSave(value.trim()); setValue(''); toast.success(value.trim() ? `${s.name} key saved` : `${s.name} key removed`); }
    catch (err) { toast.danger(err instanceof Error ? err.message : 'Could not save the key.'); }
    finally { setSaving(false); }
  }

  return (
    <section className="yare-keys__service" aria-label={s.name}>
      <div className="yare-keys__head">
        <h4 className="yare-keys__name">{s.name}</h4>
        <StatusChip tone={ready ? 'success' : s.status === 'missing' ? (s.optional ? 'default' : 'warning') : s.status === 'error' ? 'danger' : s.status === 'planned' ? 'accent' : 'default'}>
          {ready ? 'Key in place' : s.status === 'missing' ? (s.optional ? 'Optional' : 'Key needed') : s.status === 'error' ? 'Unknown' : s.status === 'planned' ? 'Planned' : 'Checking'}
        </StatusChip>
      </div>
      <p className="yare-keys__role">{s.role}{s.note ? ` ${s.note}` : ''}</p>
      {s.status === 'planned' ? (
        <PasswordField label="Your key" value="" onChange={() => undefined} placeholder="Not yet" autoComplete="off" isRequired={false} isDisabled />
      ) : (
        <PasswordField label={ready ? 'Paste a new key' : 'Paste your key'} value={value} onChange={setValue} placeholder={ready ? 'Saved. Paste here to replace it.' : 'Your API key'} autoComplete="off" />
      )}
      <div className="mt-auto grid grid-cols-2 gap-2">
        <Button variant="outline" fullWidth onPress={() => window.open(s.url, '_blank', 'noopener,noreferrer')}>Get a key <ArrowSquareOutIcon /></Button>
        {/* One button: saves what is pasted, or, with nothing pasted and a key in place, removes it. */}
        <Button variant={value.trim() || !ready ? 'primary' : 'danger-soft'} fullWidth isDisabled={s.status !== 'planned' && !value.trim() && !ready} isPending={saving} onPress={() => void save()}>{value.trim() ? (ready ? 'Replace key' : 'Save key') : ready ? 'Remove key' : 'Save key'}</Button>
      </div>
    </section>
  );
}
