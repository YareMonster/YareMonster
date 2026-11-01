import { Button, Card, toast } from '@heroui/react';
import { ArrowSquareOutIcon, CopyIcon } from '@phosphor-icons/react';
import { Notice } from '../../yare';
import type { Form } from '../../lib/supabase';

async function copy(label: string, value: string) {
  try { await navigator.clipboard.writeText(value); toast.success(`${label} copied`); }
  catch { toast.danger('Could not copy. Select the text and copy it yourself.'); }
}

export function ShareTab({ form, onPublish, publishing }: { form: Form; onPublish: () => void; publishing: boolean }) {
  const url = `${window.location.origin}/f/${form.slug}`;
  const embed = `<iframe src="${url}" title="${form.title.replace(/"/g, '&quot;')}" style="width:100%;height:640px;border:0;border-radius:14px" loading="lazy"></iframe>`;
  const live = form.status === 'published';
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="gap-4 p-5">
        <div>
          <h3 className="text-lg">Link</h3>
          <p className="text-sm text-muted">Send it, post it, put it in a signature.</p>
        </div>
        {!live && <Notice status="warning" icon={false} title="Not live yet">This form is a draft. The link shows “This form isn’t open” until you publish.</Notice>}
        <div className="flex items-center justify-between gap-3 rounded-(--yare-radius-control) border border-border bg-surface-secondary px-3 py-2">
          <code className="block truncate text-sm">{url}</code>
          <Button variant="ghost" size="sm" isIconOnly aria-label="Copy link" onPress={() => copy('Link', url)}><CopyIcon /></Button>
        </div>
        <div className="mt-auto grid grid-cols-2 gap-2">
          {live
            ? <Button variant="primary" fullWidth onPress={() => copy('Link', url)}><CopyIcon /> Copy link</Button>
            : <Button variant="secondary" fullWidth onPress={onPublish} isPending={publishing}>Publish now</Button>}
          <Button variant="outline" fullWidth onPress={() => window.open(live ? url : `${url}?preview`, '_blank', 'noopener,noreferrer')}>{live ? 'Open' : 'Preview'} <ArrowSquareOutIcon /></Button>
        </div>
      </Card>
      <Card className="gap-4 p-5">
        <div>
          <h3 className="text-lg">Embed</h3>
          <p className="text-sm text-muted">Paste this where you want the form to appear on your own site.</p>
        </div>
        <pre className="overflow-x-auto rounded-(--yare-radius-control) border border-border bg-surface-secondary p-3 text-xs leading-relaxed"><code>{embed}</code></pre>
        <Button variant="outline" fullWidth className="mt-auto" onPress={() => copy('Embed code', embed)}><CopyIcon /> Copy embed code</Button>
      </Card>
    </div>
  );
}
