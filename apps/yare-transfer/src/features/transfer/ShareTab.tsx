import { Button, Card, toast } from '@heroui/react';
import { ArrowSquareOutIcon, CopyIcon } from '@phosphor-icons/react';
import { Notice } from '../../yare';
import type { Transfer } from '../../lib/supabase';
import { linkState, timeLeft } from '../status';

async function copy(value: string) {
  try { await navigator.clipboard.writeText(value); toast.success('Link copied'); }
  catch { toast.danger('Could not copy. Select the text and copy it yourself.'); }
}

export function ShareTab({ transfer, onPublish, publishing }: { transfer: Transfer; onPublish: () => void; publishing: boolean }) {
  const url = `${window.location.origin}/t/${transfer.slug}`;
  const state = linkState(transfer);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="gap-4 p-5">
        <div>
          <h3 className="text-lg">Link</h3>
          <p className="text-sm text-muted">Send it any way you like: message, email, a note.</p>
        </div>
        {state === 'draft' && <Notice status="warning" icon={false} title="Not live yet">The link says “not open” until you publish. Publishing starts the {transfer.expiry_days}-day clock.</Notice>}
        {state === 'expired' && <Notice status="warning" icon={false} title="Expired">The link closed and the files were removed. Publish again after uploading them anew.</Notice>}
        {state === 'live' && <Notice status="success" icon={false} title={timeLeft(transfer)}>{transfer.password_hash ? 'Recipients need the password you set.' : 'Anyone with the link can download.'}</Notice>}
        <div className="flex items-center justify-between gap-3 rounded-(--yare-radius-control) border border-border bg-surface-secondary px-3 py-2">
          <code className="block truncate text-sm">{url}</code>
          <Button variant="ghost" size="sm" isIconOnly aria-label="Copy link" onPress={() => copy(url)}><CopyIcon /></Button>
        </div>
        <div className="mt-auto grid grid-cols-2 gap-2">
          {state === 'live'
            ? <Button variant="primary" fullWidth onPress={() => copy(url)}><CopyIcon /> Copy link</Button>
            : <Button variant="secondary" fullWidth onPress={onPublish} isPending={publishing}>{state === 'expired' ? 'Publish again' : 'Publish now'}</Button>}
          <Button variant="outline" fullWidth onPress={() => window.open(state === 'live' ? url : `${url}?preview`, '_blank', 'noopener,noreferrer')}>{state === 'live' ? 'Open' : 'Preview'} <ArrowSquareOutIcon /></Button>
        </div>
      </Card>
      <Card className="gap-3 p-5">
        <h3 className="text-lg">What recipients see</h3>
        <p className="text-sm text-muted">Your logo, the title, your lines, the picture, the files with their sizes, and the download button. Several files download together as a zip. No account, nothing to install. When the time is up the page says so and the files are gone from your storage.</p>
      </Card>
    </div>
  );
}
