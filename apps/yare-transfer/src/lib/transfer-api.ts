import type { Client, Download, OpenTransfer, Settings, Transfer, TransferFile } from './supabase';
import { BUCKET } from './supabase';
import { slugFromTitle } from './slug';

function fail(error: { message: string } | null): asserts error is null {
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------- transfers (owner)
export async function listTransfers(db: Client): Promise<Transfer[]> {
  const { data, error } = await db.from('yaretransfer_transfers').select('*').order('updated_at', { ascending: false });
  fail(error);
  return data;
}

export async function getTransfer(db: Client, id: string): Promise<{ transfer: Transfer; files: TransferFile[] }> {
  const [t, f] = await Promise.all([
    db.from('yaretransfer_transfers').select('*').eq('id', id).single(),
    db.from('yaretransfer_files').select('*').eq('transfer_id', id).order('position'),
  ]);
  fail(t.error); fail(f.error);
  return { transfer: t.data, files: f.data };
}

export async function createTransfer(db: Client, title = 'Untitled transfer'): Promise<Transfer> {
  const { data, error } = await db.from('yaretransfer_transfers').insert({ title, slug: slugFromTitle(title) }).select().single();
  fail(error);
  return data;
}

export async function updateTransfer(db: Client, id: string, patch: Partial<Pick<Transfer, 'title' | 'body' | 'slug' | 'theme' | 'logo_path' | 'image_path' | 'expiry_days' | 'button_label' | 'password_hash' | 'password_salt'>>): Promise<Transfer> {
  const { data, error } = await db.from('yaretransfer_transfers').update(patch).eq('id', id).select().single();
  fail(error);
  return data;
}

/** Starts the clock. */
export async function publishTransfer(db: Client, id: string): Promise<Transfer> {
  const { error } = await db.rpc('yaretransfer_publish', { p_id: id });
  fail(error);
  const { data, error: e2 } = await db.from('yaretransfer_transfers').select('*').eq('id', id).single();
  fail(e2);
  return data;
}

/** Closes the link early. The files stay until the transfer is deleted or published again. */
export async function unpublishTransfer(db: Client, id: string): Promise<Transfer> {
  const { data, error } = await db.from('yaretransfer_transfers').update({ status: 'draft', expires_at: null }).eq('id', id).select().single();
  fail(error);
  return data;
}

export async function deleteTransfer(db: Client, transfer: Transfer, files: TransferFile[]): Promise<void> {
  if (files.length) await db.storage.from(BUCKET).remove(files.map((f) => f.storage_path));
  const pictures = [transfer.logo_path, transfer.image_path].filter((p): p is string => !!p);
  if (pictures.length) await db.storage.from('yare-images').remove(pictures);
  const { error } = await db.from('yaretransfer_transfers').delete().eq('id', transfer.id);
  fail(error);
}

// ---------------------------------------------------------------- password
/** Salted SHA-256, hex, the same way the function checks it. */
export async function hashPassword(password: string, salt: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${password}`));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
export const newSalt = () => [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('');

export async function setPassword(db: Client, id: string, password: string | null): Promise<Transfer> {
  if (!password) return updateTransfer(db, id, { password_hash: null, password_salt: null });
  const salt = newSalt();
  return updateTransfer(db, id, { password_hash: await hashPassword(password, salt), password_salt: salt });
}

// ---------------------------------------------------------------- files (owner)
export async function addFile(db: Client, transferId: string, file: File, position: number): Promise<TransferFile> {
  const id = crypto.randomUUID();
  const safe = file.name.replace(/[^\w.\-() ]+/g, '_').slice(0, 200) || 'file';
  const path = `${transferId}/${id}/${safe}`;
  const { error } = await db.storage.from(BUCKET).upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false });
  if (error) throw new Error(/exceeded|too large|maximum size|413/i.test(error.message) ? 'That file is over the limit your Supabase plan allows.' : error.message);
  const { data, error: e2 } = await db.from('yaretransfer_files').insert({ id, transfer_id: transferId, name: file.name, size_bytes: file.size, content_type: file.type || '', storage_path: path, position }).select().single();
  if (e2) { await db.storage.from(BUCKET).remove([path]); throw new Error(e2.message); }
  return data;
}

export async function removeFile(db: Client, file: TransferFile): Promise<void> {
  const { error } = await db.from('yaretransfer_files').delete().eq('id', file.id);
  fail(error);
  await db.storage.from(BUCKET).remove([file.storage_path]);
}

export async function reorderFiles(db: Client, orderedIds: string[]): Promise<void> {
  await Promise.all(orderedIds.map((id, i) => db.from('yaretransfer_files').update({ position: i }).eq('id', id)));
}

// ---------------------------------------------------------------- pictures (owner)
export async function uploadImage(db: Client, transferId: string, kind: 'logo' | 'image', file: File): Promise<string> {
  const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
  const path = `yare-transfer/${transferId}/${kind}-${Date.now()}.${ext}`;
  const { error } = await db.storage.from('yare-images').upload(path, file, { upsert: true, contentType: file.type || undefined });
  fail(error);
  return path;
}
export async function removeImage(db: Client, path: string): Promise<void> {
  await db.storage.from('yare-images').remove([path]);
}

// ---------------------------------------------------------------- downloads (owner)
export async function listDownloads(db: Client, transferId: string): Promise<Download[]> {
  const { data, error } = await db.from('yaretransfer_downloads').select('*').eq('transfer_id', transferId).order('created_at', { ascending: false }).limit(500);
  fail(error);
  return data;
}

// ---------------------------------------------------------------- settings (owner)
export async function getSettings(db: Client): Promise<Settings | null> {
  const { data, error } = await db.from('yaretransfer_settings').select('*').maybeSingle();
  fail(error);
  return data;
}
export async function saveSettings(db: Client, maxFileMb: number): Promise<Settings> {
  const { data: user } = await db.auth.getUser();
  if (!user.user) throw new Error('Not signed in.');
  const { data, error } = await db.from('yaretransfer_settings').upsert({ owner_id: user.user.id, max_file_mb: maxFileMb }, { onConflict: 'owner_id' }).select().single();
  fail(error);
  return data;
}

// ---------------------------------------------------------------- the function (owner: cleanup; anyone: files)
async function describe(error: unknown): Promise<string> {
  const ctx = (error as { context?: Response }).context;
  if (ctx && typeof ctx.json === 'function') {
    try { const j = (await ctx.json()) as { error?: string }; if (j.error) return j.error; } catch { /* fall through */ }
  }
  return error instanceof Error ? error.message : 'The function did not answer.';
}

export async function cleanupExpired(db: Client): Promise<number> {
  const { data, error } = await db.functions.invoke<{ removed: number }>('yaretransfer-file', { body: { action: 'cleanup' } });
  if (error) throw new Error(await describe(error));
  return data?.removed ?? 0;
}

// ---------------------------------------------------------------- recipients (anyone with the link)
export async function openTransfer(db: Client, slug: string): Promise<OpenTransfer> {
  const { data, error } = await db.rpc('yaretransfer_open', { p_slug: slug });
  fail(error);
  return data;
}

export async function checkPassword(db: Client, slug: string, password: string): Promise<boolean> {
  const { error } = await db.functions.invoke<{ ok: boolean }>('yaretransfer-file', { body: { action: 'check', slug, password } });
  if (error) { const m = await describe(error); if (/not the password|needs its password/i.test(m)) return false; throw new Error(m); }
  return true;
}

export async function fileUrl(db: Client, slug: string, fileId: string, password?: string): Promise<{ url: string; name: string }> {
  const { data, error } = await db.functions.invoke<{ url: string; name: string }>('yaretransfer-file', { body: { action: 'file', slug, file_id: fileId, password } });
  if (error) throw new Error(await describe(error));
  if (!data?.url) throw new Error('Could not open the file.');
  return data;
}
