import { useState } from 'react';
import { AlertDialog, Button, Card, Description, Input, Label, ListBox, Select, TextField, toast } from '@heroui/react';
import { CopyIcon } from '@phosphor-icons/react';
import { MonsterNote, Notice } from '../../yare';
import type { Block, Client, Page, PagePatch } from '../../lib/supabase';
import { deletePage, updatePage } from '../../lib/links-api';
import { isValidSlug } from '../../lib/slug';
import { useDebouncedCallback, useDebouncedPatch } from '../../lib/save-status';

type Run = <T>(work: () => Promise<T>, failMessage?: string) => Promise<T | undefined>;
interface Props { db: Client; page: Page; blocks: Block[]; onPage: (p: Page) => void; run: Run; onDeleted: () => void }

const untilOptions = [{ id: 'forever', label: 'Until I turn it off', hours: 0 }, { id: '1', label: '1 hour', hours: 1 }, { id: '24', label: '1 day', hours: 24 }, { id: '168', label: '7 days', hours: 168 }];

/** Address and name, sending everyone to one link, deleting the page. */
export function SettingsTab({ db, page, blocks, onPage, run, onDeleted }: Props) {
  const [slug, setSlug] = useState(page.slug);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [title, setTitle] = useState(page.title);
  const [until, setUntil] = useState('forever');
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const save = async (patch: PagePatch) => { const next = await run(() => updatePage(db, page.id, patch)); if (next) onPage(next); };
  const push = useDebouncedPatch<PagePatch>((p) => void save(p), 600);
  const saveSlug = useDebouncedCallback((v: string) => {
    if (!isValidSlug(v)) { setSlugError('Lowercase letters, numbers and hyphens, 2 to 40 characters, not a word the app uses.'); return; }
    setSlugError(null);
    void run(() => updatePage(db, page.id, { slug: v }), 'That address is taken.').then((p) => p && onPage(p));
  }, 700);
  const address = `${window.location.origin}/${page.slug}`;
  const links = blocks.filter((b) => b.type === 'link' && !b.archived && b.lock_kind === 'none' && b.url);

  async function setRedirect(blockId: string | null) {
    const h = untilOptions.find((o) => o.id === until)?.hours ?? 0;
    await save({ redirect_block_id: blockId, redirect_until: blockId && h ? new Date(Date.now() + h * 3600000).toISOString() : null });
  }
  async function destroy() {
    setDeleting(true);
    try { await deletePage(db, page, blocks); toast.success('Page deleted'); onDeleted(); }
    catch (err) { toast.danger(err instanceof Error ? err.message : 'Could not delete it.'); setDeleting(false); }
  }
  const redirecting = page.redirect_block_id && (!page.redirect_until || new Date(page.redirect_until) > new Date());

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="flex min-w-0 flex-col gap-4">
      <Card className="gap-4 p-5">
        <h3 className="text-base">Address</h3>
        <TextField value={slug} onChange={(v) => { setSlug(v); saveSlug(v); }} fullWidth isInvalid={!!slugError}>
          <Label>Your page lives at</Label>
          <div className="flex items-center gap-2"><span className="text-sm text-muted">{window.location.origin}/</span><Input /></div>
          <Description>{slugError ?? 'Lowercase letters, numbers and hyphens.'}</Description>
        </TextField>
        <div className="flex items-center gap-2 rounded-(--yare-radius-control) border border-border bg-surface-secondary px-3 py-2 font-mono text-sm"><span className="min-w-0 flex-1 truncate">{address}</span><Button variant="ghost" size="sm" isIconOnly aria-label="Copy address" onPress={() => void navigator.clipboard.writeText(address).then(() => toast.success('Address copied'))}><CopyIcon /></Button></div>
        {page.status !== 'published' && <Notice status="default" icon={false} title="Not live yet">Publish from the top bar and the address opens for everyone.</Notice>}
      </Card>

      <Card className="gap-4 p-5">
        <h3 className="text-base">Name</h3>
        <TextField value={title} onChange={(v) => { setTitle(v); if (v.trim()) push({ title: v.trim() }); }} fullWidth maxLength={80} isRequired><Label>Page name</Label><Input /><Description>Shown in the browser tab and when the page is shared.</Description></TextField>
        <p className="text-sm text-muted">The title and description for search, the picture when shared and the icon live under SEO/AEO.</p>
      </Card>

      </div>

      <div className="flex min-w-0 flex-col gap-4">
        <Card className="gap-4 p-5">
          <div><h3 className="text-base">Send everyone to one link</h3><p className="text-sm text-muted">For a launch or an event: visitors skip the page and land on the link.</p></div>
          {redirecting ? (
            <Notice status="warning" icon={false} title="Redirect is on">{`Everyone goes to "${blocks.find((b) => b.id === page.redirect_block_id)?.title || 'the link'}"${page.redirect_until ? ` until ${new Date(page.redirect_until).toLocaleString()}` : ''}.`} <button type="button" className="font-medium underline" onClick={() => void setRedirect(null)}>Turn it off</button>.</Notice>
          ) : (
            <div className="flex flex-col gap-3">
              <Select aria-label="Link" selectedKey={null} onSelectionChange={(k) => { if (k) void setRedirect(String(k)); }} fullWidth placeholder={links.length ? 'Pick a link' : 'Add a link first'} isDisabled={!links.length}>
                <Label>Link</Label>
                <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                <Select.Popover><ListBox>{links.map((b) => <ListBox.Item key={b.id} id={b.id} textValue={b.title || b.url}>{b.title || b.url}</ListBox.Item>)}</ListBox></Select.Popover>
              </Select>
              <Select aria-label="For how long" selectedKey={until} onSelectionChange={(k) => setUntil(String(k))} fullWidth>
                <Label>For</Label>
                <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                <Select.Popover><ListBox>{untilOptions.map((o) => <ListBox.Item key={o.id} id={o.id} textValue={o.label}>{o.label}</ListBox.Item>)}</ListBox></Select.Popover>
              </Select>
            </div>
          )}
        </Card>
        <MonsterNote title="Your address, your domain">
          The page lives where this app is deployed. Give the app your own domain in Cloudflare and every page gets it, like yourname.com/links. Nothing to pay anyone for it.
        </MonsterNote>
        <Card className="gap-3 p-5">
          <h3 className="text-base">Delete this page</h3>
          <p className="text-sm text-muted">Its blocks, pictures, entries and figures go with it. There is no undo.</p>
          <Button variant="danger" className="self-start" onPress={() => setConfirm(true)}>Delete page</Button>
        </Card>
      </div>

      <AlertDialog isOpen={confirm} onOpenChange={setConfirm}>
        <AlertDialog.Backdrop><AlertDialog.Container size="sm"><AlertDialog.Dialog aria-label="Delete page">
          <AlertDialog.Header><AlertDialog.Heading>Delete “{page.title}”?</AlertDialog.Heading></AlertDialog.Header>
          <AlertDialog.Body><p className="text-sm text-muted">The address stops working and everything on the page is removed from your storage.</p></AlertDialog.Body>
          <AlertDialog.Footer className="gap-2"><Button variant="outline" onPress={() => setConfirm(false)}>Cancel</Button><Button variant="danger" onPress={() => void destroy()} isPending={deleting}>Delete</Button></AlertDialog.Footer>
        </AlertDialog.Dialog></AlertDialog.Container></AlertDialog.Backdrop>
      </AlertDialog>
    </div>
  );
}
