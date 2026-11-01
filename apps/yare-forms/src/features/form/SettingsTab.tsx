import { useState } from 'react';
import { AlertDialog, Button, Card, Description, Input, Label, Switch, TextField, toast } from '@heroui/react';
import { CheckIcon, ImageIcon } from '@phosphor-icons/react';
import { Notice } from '../../yare';
import type { Client, Form } from '../../lib/supabase';
import { imageUrl } from '../../lib/supabase';
import { deleteForm, removeImage, updateForm, uploadImage } from '../../lib/forms-api';
import { themes } from '../../lib/themes';
import { isValidSlug } from '../../lib/slug';
import { useDebouncedCallback } from '../../lib/save-status';

interface Props {
  db: Client;
  form: Form;
  onForm: (f: Form) => void;
  run: <T>(work: () => Promise<T>, failMessage?: string) => Promise<T | undefined>;
  onDeleted: () => void;
}

export function SettingsTab({ db, form, onForm, run, onDeleted }: Props) {
  const [title, setTitle] = useState(form.title);
  const [slug, setSlug] = useState(form.slug);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const saveTitle = useDebouncedCallback((v: string) => { if (v.trim()) void run(() => updateForm(db, form.id, { title: v.trim() })).then((f) => f && onForm(f)); }, 600);
  const saveSlug = useDebouncedCallback((v: string) => {
    if (!isValidSlug(v)) { setSlugError('Lowercase letters, numbers and hyphens, 3 to 60 characters.'); return; }
    setSlugError(null);
    void run(() => updateForm(db, form.id, { slug: v }), 'That address is taken or not allowed.').then((f) => f && onForm(f));
  }, 700);

  async function pickTheme(id: string) {
    const f = await run(() => updateForm(db, form.id, { theme: id }));
    if (f) onForm(f);
  }
  async function pickLogo(file: File | undefined) {
    if (!file) return;
    const path = await run(() => uploadImage(db, form.id, 'logo', file), 'Could not upload the logo.');
    if (!path) return;
    const f = await run(() => updateForm(db, form.id, { logo_path: path }));
    if (f) { onForm(f); toast.success('Logo added'); }
  }
  async function clearLogo() {
    const old = form.logo_path;
    const f = await run(() => updateForm(db, form.id, { logo_path: null }));
    if (f) onForm(f);
    if (old) await removeImage(db, old);
  }
  async function toggleProgress(v: boolean) {
    const f = await run(() => updateForm(db, form.id, { settings: { ...form.settings, showProgress: v } }));
    if (f) onForm(f);
  }
  async function destroy() {
    setDeleting(true);
    try { await deleteForm(db, form.id); toast.success('Form deleted'); onDeleted(); }
    catch (err) { toast.danger(err instanceof Error ? err.message : 'Could not delete the form.'); setDeleting(false); }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="gap-4 p-5">
        <h3 className="text-lg">Basics</h3>
        <TextField fullWidth value={title} onChange={(v) => { setTitle(v); saveTitle(v); }} maxLength={120} isRequired>
          <Label>Title</Label>
          <Input />
          <Description>Shown in the browser tab and in your list of forms.</Description>
        </TextField>
        <TextField fullWidth value={slug} onChange={(v) => { const s = v.toLowerCase(); setSlug(s); saveSlug(s); }} isInvalid={!!slugError}>
          <Label>Address</Label>
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-sm text-muted">{window.location.origin}/f/</span>
            <Input className="min-w-0 flex-1" />
          </div>
          {slugError ? <Description className="text-danger">{slugError}</Description> : <Description>Changing it breaks links you already shared.</Description>}
        </TextField>
        <Switch isSelected={form.settings.showProgress !== false} onChange={(v) => void toggleProgress(v)}>
          <Switch.Content><Switch.Control><Switch.Thumb /></Switch.Control>Show a progress bar</Switch.Content>
        </Switch>
      </Card>

      <Card className="gap-4 p-5">
        <h3 className="text-lg">Look</h3>
        <div>
          <Label>Theme</Label>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {themes.map((t) => (
              <button
                key={t.id}
                type="button"
                className="yare-pick !min-h-0 !p-2"
                aria-pressed={form.theme === t.id}
                aria-label={t.name}
                onClick={() => void pickTheme(t.id)}
              >
                <span className="flex w-full flex-col gap-1.5">
                  <span className="block h-12 w-full rounded-(--yare-radius-control) border border-black/5" style={{ background: t.vars.bg }}>
                    <span className="mt-7 ml-2 block h-2.5 w-10 rounded-full" style={{ background: t.vars.accent }} />
                  </span>
                  <span className="text-xs font-semibold">{t.name}</span>
                </span>
                {form.theme === t.id && <CheckIcon weight="bold" className="yare-pick__check" />}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label>Logo</Label>
          {form.logo_path && <img src={imageUrl(db, form.logo_path) ?? undefined} alt="" className="h-12 w-auto self-start rounded-(--yare-radius-control) border border-border p-1" />}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onPress={() => document.getElementById('logo-file')?.click()}><ImageIcon /> {form.logo_path ? 'Replace logo' : 'Add your logo'}</Button>
            {form.logo_path && <Button variant="ghost" size="sm" onPress={() => void clearLogo()}>Remove</Button>}
            <input id="logo-file" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={(e) => void pickLogo(e.target.files?.[0])} />
          </div>
          <Description>Shown at the top of every screen. PNG, JPG, WebP or SVG up to 2 MB, stored in your own Supabase storage.</Description>
        </div>
        <Notice status="default" icon={false} title="Pwrd by Yare Monster">Every published form ends with the Yare Monster credit. It is part of the licence and cannot be switched off.</Notice>
      </Card>

      <Card className="gap-3 p-5 lg:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg">Delete this form</h3>
            <p className="text-sm text-muted">Removes the form, its screens and every response. There is no undo.</p>
          </div>
          <Button variant="danger-soft" onPress={() => setConfirmDelete(true)}>Delete form</Button>
        </div>
      </Card>

      <AlertDialog isOpen={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialog.Backdrop>
          <AlertDialog.Container size="sm">
            <AlertDialog.Dialog aria-label="Delete form">
              <AlertDialog.Header><AlertDialog.Heading>Delete “{form.title}”?</AlertDialog.Heading></AlertDialog.Header>
              <AlertDialog.Body><p className="text-sm text-muted">The form, its screens and all responses are deleted from your database. Links to it stop working.</p></AlertDialog.Body>
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
