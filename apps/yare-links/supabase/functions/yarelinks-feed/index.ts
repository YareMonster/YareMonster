/**
 * Yare Links · yarelinks-feed
 *
 * The latest items of a YouTube channel, a Substack or a podcast, for a feed block. Browsers
 * cannot read those feeds directly, so this function fetches the feed on the page's behalf, trims
 * it to the few fields a block shows, and keeps each feed for ten minutes so a busy page does not
 * fetch it on every visit. Nothing is stored and nothing about the visitor is sent along.
 *
 *   POST { kind: 'youtube' | 'substack' | 'podcast', url: string, n?: number }
 *   → { items: [{ title, url, date, image, id }] }
 */
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

interface Item { id: string; title: string; url: string; date: string; image: string | null }
const cache = new Map<string, { at: number; items: Item[] }>();
const TTL = 10 * 60 * 1000;

const tag = (xml: string, name: string) => { const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`)); return m ? unescape(m[1]!.trim()) : ''; };
const attr = (xml: string, name: string, a: string) => { const m = xml.match(new RegExp(`<${name}[^>]*\\s${a}="([^"]*)"`)); return m ? unescape(m[1]!) : ''; };
const unescape = (s: string) => s.replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/, '$1').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'");
const blocks = (xml: string, name: string) => [...xml.matchAll(new RegExp(`<${name}(?:\\s[^>]*)?>[\\s\\S]*?</${name}>`, 'g'))].map((m) => m[0]);

/** Only public web addresses: no local names, no raw IPs. */
function safe(url: URL): boolean {
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
  const h = url.hostname;
  return h.includes('.') && !/^\d+\.\d+\.\d+\.\d+$/.test(h) && !h.endsWith('.local') && h !== 'localhost';
}
async function get(url: string): Promise<string> {
  const u = new URL(url);
  if (!safe(u)) throw new Error('That address cannot be read.');
  const r = await fetch(u, { headers: { 'User-Agent': 'YareLinks/1.0 (+https://yare.monster)' }, redirect: 'follow' });
  if (!r.ok) throw new Error(`The feed answered ${r.status}.`);
  return await r.text();
}

async function youtube(input: string, n: number): Promise<Item[]> {
  // A channel id, a channel address, or a handle. Anything but an id goes through the channel page to find the id.
  let id = /^UC[\w-]{20,}$/.test(input) ? input : (input.match(/youtube\.com\/channel\/(UC[\w-]{20,})/)?.[1] ?? '');
  if (!id) {
    const page = /^https?:\/\//.test(input) ? input : `https://www.youtube.com/${input.replace(/^@?/, '@')}`;
    const html = await get(page);
    id = html.match(/"channelId":"(UC[\w-]{20,})"/)?.[1] ?? html.match(/channel\/(UC[\w-]{20,})/)?.[1] ?? '';
    if (!id) throw new Error('No channel found at that address.');
  }
  const xml = await get(`https://www.youtube.com/feeds/videos.xml?channel_id=${id}`);
  return blocks(xml, 'entry').slice(0, n).map((e) => { const v = tag(e, 'yt:videoId'); return { id: v, title: tag(e, 'title'), url: `https://www.youtube.com/watch?v=${v}`, date: tag(e, 'published'), image: `https://i.ytimg.com/vi/${v}/hqdefault.jpg` }; });
}

async function substack(input: string, n: number): Promise<Item[]> {
  const base = /^https?:\/\//.test(input) ? input : `https://${input}`;
  const u = new URL(base);
  const xml = await get(`${u.origin}/feed`);
  return blocks(xml, 'item').slice(0, n).map((e, i) => ({ id: tag(e, 'guid') || String(i), title: tag(e, 'title'), url: tag(e, 'link'), date: tag(e, 'pubDate'), image: attr(e, 'enclosure', 'url') || null }));
}

/** A podcast's RSS feed, as every podcast app reads it: the episode's page, or its audio when there is no page; the episode's artwork, or the show's. */
async function podcast(input: string, n: number): Promise<Item[]> {
  const xml = await get(/^https?:\/\//.test(input) ? input : `https://${input}`);
  const head = xml.slice(0, xml.indexOf('<item') === -1 ? xml.length : xml.indexOf('<item'));
  const cover = attr(head, 'itunes:image', 'href') || tag(tag(head, 'image'), 'url') || null;
  return blocks(xml, 'item').slice(0, n).map((e, i) => ({ id: tag(e, 'guid') || String(i), title: tag(e, 'title'), url: tag(e, 'link') || attr(e, 'enclosure', 'url'), date: tag(e, 'pubDate'), image: attr(e, 'itunes:image', 'href') || cover }));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  try {
    const { kind, url, n } = await req.json() as { kind?: string; url?: string; n?: number };
    if ((kind !== 'youtube' && kind !== 'substack' && kind !== 'podcast') || !url) return json({ error: 'kind and url are needed' }, 400);
    const count = Math.max(1, Math.min(12, Number(n) || 5));
    const key = `${kind}:${url}`;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < TTL) return json({ items: hit.items.slice(0, count) });
    const items = kind === 'youtube' ? await youtube(url.trim(), 12) : kind === 'podcast' ? await podcast(url.trim(), 12) : await substack(url.trim(), 12);
    cache.set(key, { at: Date.now(), items });
    return json({ items: items.slice(0, count) });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Could not read the feed.' }, 502);
  }
});
