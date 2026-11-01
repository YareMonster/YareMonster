// Yare Transfer · Edge Function yaretransfer-file
//
// Hands a recipient a short-lived address for one file, after checking the link is published and
// not expired and, when the transfer has a password, that the password matches. Counts the
// download. Also removes the files of expired transfers: on every call, and when the owner asks.
// The files live in the PRIVATE bucket "yare-transfer"; nothing else reaches them.
//
//   file     { slug, file_id, password? }  → { url, name }     (anyone with the link)
//   check    { slug, password }            → { ok }            (the page checks a password before showing files)
//   cleanup  (owner)                        → { removed }       (remove the files of the owner's expired transfers)
//
// Deploy: npx supabase functions deploy yaretransfer-file --project-ref <ref>
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { cors, json } from '../_shared/cors.ts';

const BUCKET = 'yare-transfer';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405);
  let body: { action?: string; slug?: string; file_id?: string; password?: string };
  try { body = await req.json(); } catch { return json({ error: 'Send JSON.' }, 400); }
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  try {
    // Expired transfers lose their files whenever anyone passes by.
    await sweep(admin);

    if (body.action === 'cleanup') {
      const user = await owner(admin, req);
      const removed = await sweep(admin, user.id);
      return json({ removed });
    }

    if (!body.slug) throw new Err('This link is not valid.', 400);
    const { data: t } = await admin.from('yaretransfer_transfers').select('id, status, expires_at, password_hash, password_salt').eq('slug', body.slug).maybeSingle();
    if (!t || t.status !== 'published' || !t.expires_at || new Date(t.expires_at).getTime() <= Date.now()) throw new Err('This link is not open any more.', 410);
    if (t.password_hash) {
      if (!body.password) throw new Err('This transfer needs its password.', 401);
      if (await hash(body.password, t.password_salt ?? '') !== t.password_hash) throw new Err('That is not the password.', 401);
    }
    if (body.action === 'check') return json({ ok: true });

    if (body.action !== 'file' || !body.file_id) throw new Err('Unknown action.', 400);
    const { data: f } = await admin.from('yaretransfer_files').select('id, name, storage_path').eq('id', body.file_id).eq('transfer_id', t.id).maybeSingle();
    if (!f) throw new Err('Unknown file.', 404);
    const { data: signed, error } = await admin.storage.from(BUCKET).createSignedUrl(f.storage_path, 600, { download: f.name });
    if (error || !signed) throw new Err('Could not open the file.', 500);
    await admin.from('yaretransfer_downloads').insert({ transfer_id: t.id, file_id: f.id });
    await admin.rpc('yaretransfer_count_download', { p_transfer_id: t.id, p_file_id: f.id }).then(() => undefined, () => undefined);
    return json({ url: signed.signedUrl, name: f.name });
  } catch (err) {
    const e = err instanceof Err ? err : new Err(err instanceof Error ? err.message : 'Something went wrong.', 500);
    return json({ error: e.message }, e.status);
  }
});

class Err extends Error { constructor(message: string, public status: number) { super(message); } }

async function owner(admin: SupabaseClient, req: Request) {
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!jwt || jwt.split('.').length !== 3) throw new Err('Sign in first.', 401);
  const { data, error } = await admin.auth.getUser(jwt);
  if (error || !data.user) throw new Err('Sign in first.', 401);
  return data.user;
}

/** Salted SHA-256, hex. The app hashes the same way when the owner sets the password. */
async function hash(password: string, salt: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Removes the files of expired transfers (one owner's, or everyone's), a few at a time. Returns how many transfers were cleared. */
async function sweep(admin: SupabaseClient, ownerId?: string): Promise<number> {
  let q = admin.from('yaretransfer_transfers').select('id').eq('status', 'published').eq('files_removed', false).lt('expires_at', new Date().toISOString()).limit(20);
  if (ownerId) q = q.eq('owner_id', ownerId);
  const { data: expired } = await q;
  let n = 0;
  for (const t of expired ?? []) {
    const { data: files } = await admin.from('yaretransfer_files').select('storage_path').eq('transfer_id', t.id);
    const paths = (files ?? []).map((f: { storage_path: string }) => f.storage_path);
    if (paths.length) { const { error } = await admin.storage.from(BUCKET).remove(paths); if (error) continue; }
    await admin.from('yaretransfer_transfers').update({ files_removed: true }).eq('id', t.id);
    n++;
  }
  return n;
}
