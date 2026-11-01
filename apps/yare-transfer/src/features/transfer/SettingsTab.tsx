import { useState } from 'react';
import { AlertDialog, Button, Card, Description, Input, Label, TextField, toast } from '@heroui/react';
import { ImageIcon, LockSimpleIcon, LockSimpleOpenIcon } from '@phosphor-icons/react';
import { MonsterNote, Notice, PasswordField, RangeTabs, ThemePicker } from '../../yare';
import type { Client, Transfer, TransferFile } from '../../lib/supabase';
import { imageUrl } from '../../lib/supabase';
import { deleteTransfer, removeImage, setPassword, updateTransfer, uploadImage } from '../../lib/transfer-api';
import { isValidSlug } from '../../lib/slug';
import { useDebouncedCallback } from '../../lib/save-status';

interface Props {
  db: Client;
  transfer: Transfer;
  files: TransferFile[];
  onTransfer: (t: Transfer) => void;
  run: <T>(work: () => Promise<T>, failMessage?: string) => Promise<T | undefined>;
  onDeleted: () => void;
}

const days = [1, 2, 3, 5, 7].map((d) => ({ key: String(d), label: `${d} day${d === 1 ? '' : 's'}` }));

export function SettingsTab({ db, transfer, files, onTransfer, run, onDeleted }: Props) {
  const [slug, setSlug] = useState(transfer.slug);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [password, setPwd] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const live = transfer.status === 'published';

  const saveSlug = useDebouncedCallback((v: string) => {
    if (!isValidSlug(v)) { setSlugError('Lowercase letters, numbers and hyphens, 3 to 60 characters.'); return; }
    setSlugError(null);
    void run(() => updateTransfer(db, transfer.id, { slug: v }), 'That address is taken or not allowed.').then((t) => t && onTransfer(t));
  }, 700);

  async function pickTheme(id: string) { const t = await run(() => updateTransfer(db, transfer.id, { theme: id })); if (t) onTransfer(t); }
  async function pickDays(v: string) { const t = await run(() => updateTransfer(db, transfer.id, { expiry_days: Number(v) })); if (t) onTransfer(t); }
  async function pickLogo(file: File | undefined) {
    if (!file) return;
    const path = await run(() => uploadImage(db, transfer.id, 'logo', file), 'Could not upload the logo.');
    if (!path) return;
    const old = transfer.logo_path;
    const t = await run(() => updateTransfer(db, transfer.id, { logo_path: path }));
    if (t) { onTransfer(t); if (old) await removeImage(db, old); }
  }
  async function clearLogo() {
    const old = transfer.logo_path;
    const t = await run(() => updateTransfer(db, transfer.id, { logo_path: null }));
    if (t) { onTransfer(t); if (old) await removeImage(db, old); }
  }
  async function savePassword(value: string | null) {
    const t = await run(() => setPassword(db, transfer.id, value));
    if (t) { onTransfer(t); setPwd(''); toast.success(value ? 'Password set' : 'Password removed'); }
  }
  async function destroy() {
    setDeleting(true);
    try { await deleteTransfer(db, transfer, files); toast.success('Transfer deleted'); onDeleted(); }
    catch (err) { toast.danger(err instanceof Error ? err.message : 'Could not delete it.'); setDeleting(false); }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="gap-4 p-5">
        <h3 className="text-lg">Link</h3>
        <TextField fullWidth value={slug} onChange={(v) => { const s = v.toLowerCase(); setSlug(s); saveSlug(s); }} isInvalid={!!slugError} isDisabled={live}>
          <Label>Address</Label>
          <div className="flex items-center gap-2"><span className="shrink-0 text-sm text-muted">{window.location.origin}/t/</span><Input className="min-w-0 flex-1" /></div>
          {slugError ? <Description className="text-danger">{slugError}</Description> : <Description>{live ? 'Close the link to change its address.' : 'Changing it breaks links you already shared.'}</Description>}
        </TextField>
        <div>
          <Label>Lives for</Label>
          <div className="mt-2"><RangeTabs options={days} value={String(transfer.expiry_days)} onChange={(v) => void pickDays(v)} aria-label="Days the link lives" /></div>
          <Description>{live ? 'Counted from when you published. Publish again to restart the clock.' : 'Counted from the moment you publish. Seven days at most; then the files are deleted.'}</Description>
        </div>
        <div className="flex flex-col gap-2">
          <Label>Password</Label>
          {transfer.password_hash ? (
            <Notice status="success" icon={false} title="Password set">Recipients type it before they see the files. It is stored hashed; nobody can read it back, you included.</Notice>
          ) : (
            <Notice status="default" icon={false} title="No password">Anyone with the link can download.</Notice>
          )}
          <PasswordField label={transfer.password_hash ? 'New password' : 'Set a password'} value={password} onChange={setPwd} placeholder="At least 4 characters" autoComplete="new-password" isRequired={false} />
          <div className="flex gap-2">
            <Button variant="primary" size="sm" isDisabled={password.trim().length < 4} onPress={() => void savePassword(password.trim())}><LockSimpleIcon /> {transfer.password_hash ? 'Replace' : 'Set password'}</Button>
            {transfer.password_hash && <Button variant="outline" size="sm" onPress={() => void savePassword(null)}><LockSimpleOpenIcon /> Remove</Button>}
          </div>
        </div>
      </Card>

      <Card className="gap-4 p-5">
        <h3 className="text-lg">Look</h3>
        <ThemePicker value={transfer.theme} onChange={(id) => void pickTheme(id)} />
        <div className="flex flex-col gap-2">
          <Label>Logo</Label>
          {transfer.logo_path && <img src={imageUrl(db, transfer.logo_path) ?? undefined} alt="" className="h-12 w-auto self-start rounded-(--yare-radius-control) border border-border p-1" />}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onPress={() => document.getElementById('transfer-logo')?.click()}><ImageIcon /> {transfer.logo_path ? 'Replace logo' : 'Add your logo'}</Button>
            {transfer.logo_path && <Button variant="ghost" size="sm" onPress={() => void clearLogo()}>Remove</Button>}
            <input id="transfer-logo" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={(e) => void pickLogo(e.target.files?.[0])} />
          </div>
          <Description>Shown at the top of the page. PNG, JPG, WebP or SVG up to 2 MB.</Description>
        </div>
        <MonsterNote title="Pwrd by Yare Monster">Every transfer page ends with the Yare Monster credit. It is part of the licence and cannot be switched off.</MonsterNote>
      </Card>

      <Card className="gap-3 p-5 lg:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg">Delete this transfer</h3>
            <p className="text-sm text-muted">Removes the files from your storage, the link and its figures. There is no undo.</p>
          </div>
          <Button variant="danger-soft" onPress={() => setConfirmDelete(true)}>Delete transfer</Button>
        </div>
      </Card>

      <AlertDialog isOpen={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialog.Backdrop>
          <AlertDialog.Container size="sm">
            <AlertDialog.Dialog aria-label="Delete transfer">
              <AlertDialog.Header><AlertDialog.Heading>Delete “{transfer.title}”?</AlertDialog.Heading></AlertDialog.Header>
              <AlertDialog.Body><p className="text-sm text-muted">The files are deleted from your storage and the link stops working.</p></AlertDialog.Body>
              <AlertDialog.Footer className="gap-2">
                <Button variant="outline" onPress={() => setConfirmDelete(false)}>Cancel</Button>
                <Button variant="danger" onPress={() => void destroy()} isPending={deleting}>Delete</Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>
    </div>
  );
}
