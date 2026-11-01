/**
 * Every database and storage call Yare Links makes. The owner's calls go through row-level
 * security; a visitor's go through the four public functions.
 */
import type { Template } from './templates';
import type { Block, BlockOptions, BlockPatch, Client, Entry, Event, Page, PagePatch, PublicPage } from './supabase';
import { MEDIA_BUCKET } from './supabase';
import { slugFromTitle } from './slug';
import type { FeedKind } from './grid';

function fail(error: { message: string; code?: string } | null): asserts error is null {
  if (error) {
    const e = new Error(error.message) as Error & { code?: string };
    e.code = error.code;
    throw e;
  }
}
const ext = (file: File, fallback: string) => ((file.name.split('.').pop() || fallback).toLowerCase().replace(/[^a-z0-9]/g, '') || fallback);

// ---------------------------------------------------------------- pages
export async function listPages(db: Client): Promise<Page[]> {
  const { data, error } = await db.from('yarelinks_pages').select('*').order('updated_at', { ascending: false });
  fail(error);
  return data;
}
export async function getPage(db: Client, id: string): Promise<{ page: Page; blocks: Block[] }> {
  const [p, b] = await Promise.all([
    db.from('yarelinks_pages').select('*').eq('id', id).single(),
    db.from('yarelinks_blocks').select('*').eq('page_id', id).order('position'),
  ]);
  fail(p.error); fail(b.error);
  return { page: p.data, blocks: b.data };
}
export async function createPage(db: Client, title: string): Promise<Page> {
  const base = slugFromTitle(title);
  let slug = base;
  for (let attempt = 0; attempt < 4; attempt++) {
    const { data, error } = await db.from('yarelinks_pages').insert({ title, slug }).select('*').single();
    if (!error) return data;
    if (error.code !== '23505') fail(error);
    slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }
  throw new Error('That address is taken. Try another title.');
}
export async function updatePage(db: Client, id: string, patch: PagePatch): Promise<Page> {
  const { data, error } = await db.from('yarelinks_pages').update(patch).eq('id', id).select('*').single();
  fail(error);
  return data;
}
export async function setPublished(db: Client, id: string, published: boolean): Promise<Page> {
  return updatePage(db, id, published ? { status: 'published', published_at: new Date().toISOString() } : { status: 'draft' });
}
export async function deletePage(db: Client, page: Page, blocks: Block[]): Promise<void> {
  const images = [page.avatar_path, page.logo_path, page.share_image_path, ...blocks.map((b) => b.thumbnail_path), ...blocks.map((b) => b.bg_path)].filter((p): p is string => !!p);
  const media = [page.wallpaper_path, ...blocks.map((b) => b.options.videoPath)].filter((p): p is string => !!p);
  const { error } = await db.from('yarelinks_pages').delete().eq('id', page.id);
  fail(error);
  if (images.length) await db.storage.from('yare-images').remove(images);
  if (media.length) await db.storage.from(MEDIA_BUCKET).remove(media);
}

// ---------------------------------------------------------------- blocks
export async function addBlock(db: Client, pageId: string, place: { x: number; y: number; w: number; h: number }, position: number): Promise<Block> {
  const { data, error } = await db.from('yarelinks_blocks').insert({ page_id: pageId, type: 'link', position, ...place }).select('*').single();
  fail(error);
  return data;
}
export async function updateBlock(db: Client, id: string, patch: BlockPatch): Promise<Block> {
  const { data, error } = await db.from('yarelinks_blocks').update(patch).eq('id', id).select('*').single();
  fail(error);
  return data;
}
export async function deleteBlock(db: Client, block: Block): Promise<void> {
  const { error } = await db.from('yarelinks_blocks').delete().eq('id', block.id);
  fail(error);
  const images = [block.thumbnail_path, block.bg_path].filter((p): p is string => !!p);
  if (images.length) await db.storage.from('yare-images').remove(images);
  if (block.options.videoPath) await db.storage.from(MEDIA_BUCKET).remove([block.options.videoPath]);
}
/** Start the page over from a template: the look, then the blocks with placeholder words. The old blocks go, pictures included. */
export async function applyTemplate(db: Client, page: Page, blocks: Block[], template: Template): Promise<{ page: Page; blocks: Block[] }> {
  const { font, ...look } = template.page;
  const next = await updatePage(db, page.id, { ...look, font: font ?? 'nunito', grid_pad: template.page.grid_pad ?? true });
  if (blocks.length) {
    const { error } = await db.from('yarelinks_blocks').delete().eq('page_id', page.id);
    fail(error);
    const images = blocks.flatMap((b) => [b.thumbnail_path, b.bg_path]).filter((p): p is string => !!p);
    if (images.length) await db.storage.from('yare-images').remove(images);
  }
  const rows = template.blocks.map((b, position) => ({ page_id: page.id, position, ...b }));
  const { data, error } = await db.from('yarelinks_blocks').insert(rows).select('*').order('position');
  fail(error);
  return { page: next, blocks: data };
}
export async function reorderBlocks(db: Client, orderedIds: string[]): Promise<void> {
  await Promise.all(orderedIds.map((id, position) => db.from('yarelinks_blocks').update({ position }).eq('id', id)));
}

/** A code lock: salted SHA-256, the same recipe the database checks with. */
export async function setLockCode(db: Client, blockId: string, code: string | null): Promise<Block> {
  if (!code) return updateBlock(db, blockId, { lock_kind: 'none', lock_hash: null, lock_salt: null });
  const salt = Array.from(crypto.getRandomValues(new Uint8Array(8))).map((b) => b.toString(16).padStart(2, '0')).join('');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${code}`));
  const hash = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
  return updateBlock(db, blockId, { lock_kind: 'code', lock_hash: hash, lock_salt: salt, min_age: null });
}

// ---------------------------------------------------------------- pictures and media
export async function uploadImage(db: Client, pageId: string, kind: string, file: File): Promise<string> {
  const path = `yare-links/${pageId}/${kind}-${Date.now()}.${ext(file, 'png')}`;
  const { error } = await db.storage.from('yare-images').upload(path, file, { upsert: true, contentType: file.type || undefined });
  fail(error);
  return path;
}
export async function removeImage(db: Client, path: string): Promise<void> {
  await db.storage.from('yare-images').remove([path]);
}
export async function uploadMedia(db: Client, pageId: string, kind: string, file: File): Promise<string> {
  const path = `${pageId}/${kind}-${Date.now()}.${ext(file, 'mp4')}`;
  const { error } = await db.storage.from(MEDIA_BUCKET).upload(path, file, { upsert: true, contentType: file.type || undefined });
  if (error) throw new Error(/exceeded|too large|size/i.test(error.message) ? 'That file is over the limit of your storage.' : error.message);
  return path;
}
export async function removeMedia(db: Client, path: string): Promise<void> {
  await db.storage.from(MEDIA_BUCKET).remove([path]);
}

// ---------------------------------------------------------------- insights
export async function listEvents(db: Client, pageId: string, sinceIso: string | null): Promise<Event[]> {
  let q = db.from('yarelinks_events').select('*').eq('page_id', pageId).order('created_at', { ascending: false }).limit(20000);
  if (sinceIso) q = q.gte('created_at', sinceIso);
  const { data, error } = await q;
  fail(error);
  return data;
}
/** Every event on every page you own, newest first. RLS keeps it to yours. */
export async function listAllEvents(db: Client, sinceIso: string | null): Promise<Event[]> {
  let q = db.from('yarelinks_events').select('*').order('created_at', { ascending: false }).limit(50000);
  if (sinceIso) q = q.gte('created_at', sinceIso);
  const { data, error } = await q;
  fail(error);
  return data;
}
export async function listEntries(db: Client, pageId: string): Promise<Entry[]> {
  const { data, error } = await db.from('yarelinks_entries').select('*').eq('page_id', pageId).order('created_at', { ascending: false }).limit(2000);
  fail(error);
  return data;
}
export async function deleteEntry(db: Client, id: string): Promise<void> {
  const { error } = await db.from('yarelinks_entries').delete().eq('id', id);
  fail(error);
}

// ---------------------------------------------------------------- the visitor's side
export async function openPage(db: Client, slug: string): Promise<PublicPage> {
  const { data, error } = await db.rpc('yarelinks_open', { p_slug: slug });
  fail(error);
  return data;
}
export async function track(db: Client, pageId: string, kind: 'view' | 'click', blockId: string | null, visit: { ref: string | null; country: string | null; device: string | null }): Promise<void> {
  await db.rpc('yarelinks_track', { p_page_id: pageId, p_block_id: blockId, p_kind: kind, p_ref: visit.ref, p_country: visit.country, p_device: visit.device }).then(() => undefined, () => undefined);
}
export async function unlock(db: Client, blockId: string, code: string): Promise<{ url: string; options: BlockOptions }> {
  const { data, error } = await db.rpc('yarelinks_unlock', { p_block_id: blockId, p_code: code });
  fail(error);
  return data;
}
export async function submit(db: Client, blockId: string, entry: Record<string, string>): Promise<void> {
  const { error } = await db.rpc('yarelinks_submit', { p_block_id: blockId, p_data: entry });
  fail(error);
}

export interface FeedItem { id: string; title: string; url: string; date: string; image: string | null }
/** The latest items of a YouTube channel, a Substack or a podcast, through the yarelinks-feed function. */
export async function fetchFeed(db: Client, kind: FeedKind, url: string, n: number): Promise<FeedItem[]> {
  const { data, error } = await db.functions.invoke<{ items: FeedItem[]; error?: string }>('yarelinks-feed', { body: { kind, url, n } });
  if (error) throw new Error('Could not read the feed.');
  if (!data?.items) throw new Error(data?.error ?? 'Could not read the feed.');
  return data.items;
}

/** What the page can learn about a visit without cookies: referrer host, country from Cloudflare, device kind. */
export async function describeVisit(): Promise<{ ref: string | null; country: string | null; device: string | null }> {
  let ref: string | null = null;
  try { ref = document.referrer ? new URL(document.referrer).host : null; } catch { ref = null; }
  const ua = navigator.userAgent;
  const device = /iPad|Tablet/i.test(ua) ? 'tablet' : /Mobi|Android|iPhone/i.test(ua) ? 'phone' : 'desktop';
  let country: string | null = null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 1500);
    const text = await fetch('/cdn-cgi/trace', { signal: ctrl.signal }).then((r) => (r.ok ? r.text() : ''));
    clearTimeout(t);
    country = /^loc=([A-Z]{2})$/m.exec(text)?.[1] ?? null;
  } catch { country = null; }
  return { ref, country, device };
}
