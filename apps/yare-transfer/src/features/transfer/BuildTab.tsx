import { useState, type Dispatch, type SetStateAction } from 'react';
import { Button, Card, Description, Input, Label, TextArea, TextField, toast } from '@heroui/react';
import { ArrowDownIcon, ArrowUpIcon, ImageIcon, TrashIcon, UploadSimpleIcon } from '@phosphor-icons/react';
import { FileRow, MonsterNote, UploadDropzone, formatBytes } from '../../yare';
import type { Client, Transfer, TransferFile } from '../../lib/supabase';
import { imageUrl } from '../../lib/supabase';
import { addFile, removeFile, removeImage, reorderFiles, updateTransfer, uploadImage } from '../../lib/transfer-api';
import { useDebouncedPatch } from '../../lib/save-status';
import { useTransfers } from '../TransfersContext';
import { TransferScreen } from '../../public/TransferScreen';

interface Props {
  db: Client;
  transfer: Transfer;
  onTransfer: (t: Transfer) => void;
  files: TransferFile[];
  setFiles: Dispatch<SetStateAction<TransferFile[]>>;
  run: <T>(work: () => Promise<T>, failMessage?: string) => Promise<T | undefined>;
}

/** Files and words on the left, how the link looks on the right. */
export function BuildTab({ db, transfer, onTransfer, files, setFiles, run }: Props) {
  const { maxBytes } = useTransfers();
  const [draft, setDraft] = useState({ title: transfer.title, body: transfer.body, button_label: transfer.button_label });
  const [uploading, setUploading] = useState<Array<{ name: string; size: number }>>([]);
  const save = useDebouncedPatch((patch: Partial<Pick<Transfer, 'title' | 'body' | 'button_label'>>) => { void run(() => updateTransfer(db, transfer.id, patch)).then((t) => t && onTransfer(t)); }, 600);
  function set(patch: Partial<typeof draft>) { const next = { ...draft, ...patch }; setDraft(next); onTransfer({ ...transfer, ...next }); save(patch); }

  async function upload(list: File[]) {
    for (const file of list) {
      setUploading((u) => [...u, { name: file.name, size: file.size }]);
      try {
        const created = await addFile(db, transfer.id, file, files.length + uploading.length);
        setFiles((f) => [...f, created]);
      } catch (err) {
        toast.danger(err instanceof Error ? err.message : `Could not upload ${file.name}.`);
      } finally {
        setUploading((u) => u.filter((x) => x.name !== file.name));
      }
    }
  }
  async function remove(f: TransferFile) {
    const ok = await run(() => removeFile(db, f).then(() => true));
    if (ok) setFiles((list) => list.filter((x) => x.id !== f.id));
  }
  function move(f: TransferFile, dir: -1 | 1) {
    const i = files.indexOf(f), j = i + dir;
    if (j < 0 || j >= files.length) return;
    const next = [...files]; [next[i], next[j]] = [next[j]!, next[i]!];
    const ordered = next.map((x, k) => ({ ...x, position: k }));
    setFiles(ordered);
    void run(() => reorderFiles(db, ordered.map((x) => x.id)));
  }
  async function pickImage(file: File | undefined) {
    if (!file) return;
    const path = await run(() => uploadImage(db, transfer.id, 'image', file), 'Could not upload the picture.');
    if (!path) return;
    const old = transfer.image_path;
    const t = await run(() => updateTransfer(db, transfer.id, { image_path: path }));
    if (t) { onTransfer(t); if (old) await removeImage(db, old); }
  }
  async function clearImage() {
    const old = transfer.image_path;
    const t = await run(() => updateTransfer(db, transfer.id, { image_path: null }));
    if (t) { onTransfer(t); if (old) await removeImage(db, old); }
  }

  const locked = transfer.status === 'published';
  const total = files.reduce((n, f) => n + f.size_bytes, 0);

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="flex flex-col gap-4">
        <Card className="gap-3 p-5">
          <div className="flex items-center justify-between"><h3 className="text-base">Files</h3>{files.length > 0 && <span className="text-xs text-muted">{files.length} file{files.length === 1 ? '' : 's'}, {formatBytes(total)}</span>}</div>
          {files.length > 0 && (
            <div>
              {files.map((f, i) => (
                <FileRow key={f.id} name={f.name} size={f.size_bytes} type={f.content_type} actions={!locked && (
                  <>
                    <Button variant="ghost" size="sm" isIconOnly aria-label="Move up" isDisabled={i === 0} onPress={() => move(f, -1)}><ArrowUpIcon /></Button>
                    <Button variant="ghost" size="sm" isIconOnly aria-label="Move down" isDisabled={i === files.length - 1} onPress={() => move(f, 1)}><ArrowDownIcon /></Button>
                    <Button variant="ghost" size="sm" isIconOnly aria-label={`Remove ${f.name}`} onPress={() => void remove(f)}><TrashIcon /></Button>
                  </>
                )} />
              ))}
              {uploading.map((u) => <FileRow key={`up-${u.name}`} name={u.name} size={u.size} progress={0.5} />)}
            </div>
          )}
          {!locked ? (
            <>
              <UploadDropzone accept="*/*" multiple maxBytes={maxBytes} onFiles={(f) => void upload(f)} title={files.length ? 'Add more files' : 'Drop your files here'} hint={`Any type, zips included, up to ${formatBytes(maxBytes)} each.`} buttonLabel="Choose files" icon={<UploadSimpleIcon />} />
              <MonsterNote>Files go to your own Supabase storage. Your plan sets the real ceiling: the free one allows 50 MB per file and 1 GB in total. You can raise this app's limit under Connections.</MonsterNote>
            </>
          ) : <p className="text-sm text-muted">Files are frozen while the link is live. Close the link to change them.</p>}
        </Card>

        <Card className="gap-4 p-5">
          <h3 className="text-base">Words</h3>
          <TextField fullWidth value={draft.title} onChange={(v) => set({ title: v })} maxLength={120} isRequired>
            <Label>Title</Label>
            <Input placeholder="Photos from Saturday" />
          </TextField>
          <TextField fullWidth value={draft.body} onChange={(v) => set({ body: v })} maxLength={2000}>
            <Label>A few lines</Label>
            <TextArea rows={3} placeholder="Optional. What is in here, for whom." />
          </TextField>
          <TextField fullWidth value={draft.button_label} onChange={(v) => set({ button_label: v })} maxLength={40}>
            <Label>Button</Label>
            <Input placeholder="Download" />
          </TextField>
          <div className="flex flex-col gap-2">
            <Label>Picture</Label>
            {transfer.image_path && <img src={imageUrl(db, transfer.image_path) ?? undefined} alt="" className="max-h-40 w-auto max-w-full self-start rounded-(--yare-radius-control) border border-border object-contain" />}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onPress={() => document.getElementById('transfer-image')?.click()}><ImageIcon /> {transfer.image_path ? 'Replace' : 'Add a picture'}</Button>
              {transfer.image_path && <Button variant="ghost" size="sm" onPress={() => void clearImage()}>Remove</Button>}
              <input id="transfer-image" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(e) => void pickImage(e.target.files?.[0])} />
            </div>
            <Description>Shown above the title. PNG, JPG, WebP or GIF up to 2 MB.</Description>
          </div>
        </Card>
      </div>

      <Card className="hidden overflow-hidden p-0 xl:block">
        <TransferScreen preview data={{ title: draft.title || 'Untitled transfer', body: draft.body, theme: transfer.theme, buttonLabel: draft.button_label, logoUrl: imageUrl(db, transfer.logo_path), imageUrl: imageUrl(db, transfer.image_path), expiresAt: transfer.expires_at, open: true, needsPassword: !!transfer.password_hash, files: files.map((f) => ({ id: f.id, name: f.name, size_bytes: f.size_bytes, content_type: f.content_type })) }} />
      </Card>
    </div>
  );
}
