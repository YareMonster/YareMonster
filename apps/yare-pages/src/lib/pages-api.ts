import type { Client, Day, Site, Top } from './supabase';

function fail(error: { message: string } | null): asserts error is null {
  if (error) throw new Error(error.message);
}

/** The host of an address, lowercase, without the www. */
export function hostOf(url: string): string {
  try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ''); } catch { return ''; }
}
export const isUrl = (s: string) => /^https?:\/\/[^\s/]+\.[^\s/]+/.test(s.trim());
export const normaliseUrl = (s: string) => { const t = s.trim(); return t && !/^https?:\/\//i.test(t) ? `https://${t}` : t; };

// ---------------------------------------------------------------- sites
export async function listSites(db: Client): Promise<Site[]> {
  const { data, error } = await db.from('yarepages_sites').select('*').order('position').order('created_at');
  fail(error);
  return data;
}

export async function addSite(db: Client, s: { name: string; url: string; kind: Site['kind']; repoUrl?: string }, position: number): Promise<Site> {
  const url = normaliseUrl(s.url);
  const { data, error } = await db.from('yarepages_sites').insert({ name: s.name.trim(), url, host: hostOf(url), kind: s.kind, status: s.kind === 'existing' ? 'live' : 'building', repo_url: s.repoUrl?.trim() ?? '', position }).select().single();
  fail(error);
  return data;
}

export async function updateSite(db: Client, id: string, patch: Partial<Pick<Site, 'name' | 'url' | 'status' | 'repo_url' | 'preview_path' | 'checklist' | 'notes'>>): Promise<Site> {
  const row: Partial<Pick<Site, 'name' | 'url' | 'host' | 'status' | 'repo_url' | 'preview_path' | 'checklist' | 'notes' | 'zone_id' | 'site_tag' | 'sync_status'>> = { ...patch };
  if (patch.url !== undefined) { const url = normaliseUrl(patch.url); row.url = url; row.host = hostOf(url); row.zone_id = null; row.site_tag = null; row.sync_status = 'new'; }
  const { data, error } = await db.from('yarepages_sites').update(row).eq('id', id).select().single();
  fail(error);
  return data;
}

export async function deleteSite(db: Client, site: Site): Promise<void> {
  if (site.preview_path) await db.storage.from('yare-images').remove([site.preview_path]);
  const { error } = await db.from('yarepages_sites').delete().eq('id', site.id);
  fail(error);
}

// ---------------------------------------------------------------- pictures
export async function uploadPreview(db: Client, siteId: string, file: File): Promise<string> {
  const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
  const path = `yare-pages/${siteId}/preview-${Date.now()}.${ext}`;
  const { error } = await db.storage.from('yare-images').upload(path, file, { upsert: true, contentType: file.type || undefined });
  fail(error);
  return path;
}

export async function removePreview(db: Client, path: string): Promise<void> {
  await db.storage.from('yare-images').remove([path]);
}

// ---------------------------------------------------------------- visitors
export async function listDays(db: Client, siteIds?: string[]): Promise<Day[]> {
  let q = db.from('yarepages_days').select('*').order('day');
  if (siteIds) q = q.in('site_id', siteIds);
  const { data, error } = await q;
  fail(error);
  return data;
}

export async function listTops(db: Client, siteIds?: string[]): Promise<Top[]> {
  let q = db.from('yarepages_tops').select('*').order('position');
  if (siteIds) q = q.in('site_id', siteIds);
  const { data, error } = await q;
  fail(error);
  return data;
}

// ---------------------------------------------------------------- keys and sync (Edge Function yarepages-sync)
export async function setServiceKey(db: Client, value: string): Promise<void> {
  const { error } = await db.rpc('yarepages_set_key', { p_service: 'cloudflare', p_value: value });
  fail(error);
}

export async function savedKeyStatus(db: Client): Promise<{ cloudflare: boolean }> {
  const { data, error } = await db.rpc('yarepages_key_status');
  fail(error);
  return data;
}

export async function syncStatus(db: Client): Promise<{ cloudflare: boolean }> {
  const { data, error } = await db.functions.invoke<{ cloudflare: boolean }>('yarepages-sync', { body: { action: 'status' } });
  if (error) throw new Error(await describe(error));
  return data ?? { cloudflare: false };
}

export async function syncSite(db: Client, siteId: string): Promise<{ ok: boolean; source?: string; days?: number; error?: string }> {
  const { data, error } = await db.functions.invoke<{ ok: boolean; source?: string; days?: number; error?: string }>('yarepages-sync', { body: { action: 'sync', site_id: siteId } });
  if (error) throw new Error(await describe(error));
  return data ?? { ok: false };
}

async function describe(error: unknown): Promise<string> {
  const ctx = (error as { context?: Response }).context;
  if (ctx && typeof ctx.json === 'function') {
    try { const j = (await ctx.json()) as { error?: string }; if (j.error) return j.error; } catch { /* fall through */ }
  }
  return error instanceof Error ? error.message : 'The sync function did not answer.';
}
