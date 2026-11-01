import { useState } from 'react';
import { AlertDialog, Button, Card, Description, Input, Label, Switch, TextField, toast } from '@heroui/react';
import { GlobeIcon, ImageIcon } from '@phosphor-icons/react';
import { MonsterNote, UploadDropzone } from '../../yare';
import type { Site } from '../../lib/supabase';
import { imageUrl } from '../../lib/supabase';
import { deleteSite, isUrl, normaliseUrl, removePreview, updateSite, uploadPreview } from '../../lib/pages-api';
import { useSites } from '../SitesContext';

/** Name, address and repository, the preview picture, live or building, and the way out. */
export function SiteSettings({ site, onRemoved }: { site: Site; onRemoved: () => void }) {
  const { db, patch, remove, sync, key } = useSites();
  const [name, setName] = useState(site.name);
  const [url, setUrl] = useState(site.url);
  const [repo, setRepo] = useState(site.repo_url);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const dirty = name.trim() !== site.name || normaliseUrl(url) !== site.url || repo.trim() !== site.repo_url;
  const urlOk = url.trim() === '' || isUrl(normaliseUrl(url));
  const picture = imageUrl(db, site.preview_path) ?? site.preview_url;

  async function save() {
    if (!dirty || !name.trim() || !urlOk) return;
    setSaving(true);
    try {
      const changedUrl = normaliseUrl(url) !== site.url;
      const next = await updateSite(db, site.id, { name, url: changedUrl ? url : undefined, repo_url: repo });
      patch(next);
      toast.success('Saved');
      if (changedUrl && next.url && key.status === 'ready') void sync(next.id);
    } catch (err) { toast.danger(err instanceof Error ? err.message : 'Could not save.'); }
    finally { setSaving(false); }
  }
  async function setLive(v: boolean) {
    try { patch(await updateSite(db, site.id, { status: v ? 'live' : 'building' })); } catch (err) { toast.danger(err instanceof Error ? err.message : 'Could not save.'); }
  }
  async function pick(files: File[]) {
    const file = files[0]; if (!file) return;
    try {
      const old = site.preview_path;
      const path = await uploadPreview(db, site.id, file);
      patch(await updateSite(db, site.id, { preview_path: path }));
      if (old) await removePreview(db, old);
      toast.success('Picture added');
    } catch (err) { toast.danger(err instanceof Error ? err.message : 'Could not upload.'); }
  }
  async function clearPicture() {
    const old = site.preview_path;
    try { patch(await updateSite(db, site.id, { preview_path: null })); if (old) await removePreview(db, old); } catch (err) { toast.danger(err instanceof Error ? err.message : 'Could not remove.'); }
  }
  async function destroy() {
    setBusy(true);
    try { await deleteSite(db, site); remove(site.id); toast.success('Website removed'); onRemoved(); }
    catch (err) { toast.danger(err instanceof Error ? err.message : 'Could not remove it.'); setBusy(false); }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="gap-4 p-5">
          <h3 className="text-lg">Basics</h3>
          <TextField fullWidth value={name} onChange={setName} maxLength={80} isRequired><Label>Name</Label><Input /></TextField>
          <TextField fullWidth value={url} onChange={setUrl} isInvalid={!urlOk}>
            <Label>Address</Label>
            <Input placeholder="https://yourdomain.com" inputMode="url" />
            <Description>{site.status === 'building' ? 'Paste it when the website is live.' : 'Changing it reads the visitors again.'}</Description>
          </TextField>
          <TextField fullWidth value={repo} onChange={setRepo}>
            <Label>Repository</Label>
            <Input placeholder="https://github.com/you/your-site" inputMode="url" />
            <Description>Optional. Where the code lives, for your own reference.</Description>
          </TextField>
          <Switch isSelected={site.status === 'live'} onChange={(v) => void setLive(v)}>
            <Switch.Content><Switch.Control><Switch.Thumb /></Switch.Control>Live</Switch.Content>
          </Switch>
          <div className="mt-auto grid grid-cols-2 gap-2">
            <Button variant="primary" fullWidth isDisabled={!dirty || !name.trim() || !urlOk} isPending={saving} onPress={() => void save()}>Save</Button>
            <Button variant="outline" fullWidth isDisabled={!dirty} onPress={() => { setName(site.name); setUrl(site.url); setRepo(site.repo_url); }}>Reset</Button>
          </div>
        </Card>
        <Card className="gap-4 p-5">
          <h3 className="text-lg">Picture</h3>
          <div className="aspect-[16/9] w-full overflow-hidden rounded-(--yare-radius-card) bg-surface-secondary">
            {picture ? <img src={picture} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-muted"><GlobeIcon size={40} /></div>}
          </div>
          <Description>{site.preview_path ? 'Your own picture.' : site.preview_url ? 'The website’s social image, read from the page. Upload your own to replace it.' : 'No social image found on the page. Upload a picture, a capture from Kapture for instance.'}</Description>
          <UploadDropzone accept="image/png,image/jpeg,image/webp" maxBytes={2 * 1024 * 1024} onFiles={(f) => void pick(f)} title="Drop a picture here" hint="PNG, JPG or WebP up to 2 MB" buttonLabel="Choose picture" icon={<ImageIcon />} />
          {site.preview_path && <Button variant="ghost" size="sm" className="self-start" onPress={() => void clearPicture()}>Use the website’s own image</Button>}
        </Card>
      </div>
      <MonsterNote title="What this app keeps">The name, the address, your notes and the visitor figures. The website itself lives in your GitHub and your Cloudflare; nothing here can change it.</MonsterNote>
      <Card className="gap-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg">Remove this website</h3>
            <p className="text-sm text-muted">Removes it from this list, with its figures. The website itself is untouched.</p>
          </div>
          <Button variant="danger-soft" onPress={() => setConfirm(true)}>Remove website</Button>
        </div>
      </Card>
      <AlertDialog isOpen={confirm} onOpenChange={setConfirm}>
        <AlertDialog.Backdrop>
          <AlertDialog.Container size="sm">
            <AlertDialog.Dialog aria-label="Remove website">
              <AlertDialog.Header><AlertDialog.Heading>Remove “{site.name}”?</AlertDialog.Heading></AlertDialog.Header>
              <AlertDialog.Body><p className="text-sm text-muted">Only this list and its figures. Your website, its code and its hosting stay as they are.</p></AlertDialog.Body>
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
