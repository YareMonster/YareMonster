// Yare Pages · Edge Function yarepages-sync
//
// Reads one website and fills its tables: the page title and social image from the site itself,
// and its visitors from Cloudflare through the owner's own API token. Two kinds of site:
//   zone    the domain is on Cloudflare: visits, page views and unique visitors come from the zone.
//   beacon  the domain is elsewhere but the page carries Cloudflare Web Analytics: the same
//           figures come from the beacon.
// The token needs Zone: Read, Zone Analytics: Read and Account Analytics: Read, nothing more. It
// is pasted by the owner in the app (table yarepages_keys) or set as the project secret
// CLOUDFLARE_API_TOKEN from the terminal; the secret wins when both exist.
//
//   status   is a token in place?
//   sync     { site_id }  read the site and Cloudflare, rebuild the site's tables
//
// Deploy: npx supabase functions deploy yarepages-sync --project-ref <ref>
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { cors, json } from '../_shared/cors.ts';

type Site = { id: string; owner_id: string; url: string; host: string; zone_id: string | null; site_tag: string | null; source: string };
const CF = 'https://api.cloudflare.com/client/v4';
const DAY = 86400000;
const dayOf = (ms: number) => new Date(ms).toISOString().slice(0, 10);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405);
  let body: { action?: string; site_id?: string };
  try { body = await req.json(); } catch { return json({ error: 'Send JSON.' }, 400); }
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  try {
    const user = await owner(admin, req);
    const { data: saved } = await admin.from('yarepages_keys').select('cloudflare').eq('owner_id', user.id).maybeSingle();
    const token = Deno.env.get('CLOUDFLARE_API_TOKEN') || saved?.cloudflare || '';
    if (body.action === 'status') return json({ cloudflare: !!token });
    if (body.action !== 'sync' || !body.site_id) return json({ error: 'Unknown action.' }, 400);

    const { data: site } = await admin.from('yarepages_sites').select('id, owner_id, url, host, zone_id, site_tag, source').eq('id', body.site_id).eq('owner_id', user.id).maybeSingle();
    if (!site) throw new Err('Website not found.', 404);
    await admin.from('yarepages_sites').update({ sync_status: 'syncing', sync_error: null }).eq('id', site.id);
    try {
      const out = await sync(admin, site as Site, token);
      await admin.from('yarepages_sites').update({ sync_status: 'ready', last_synced_at: new Date().toISOString(), sync_error: null, ...out.patch }).eq('id', site.id);
      return json({ ok: true, source: out.patch.source, days: out.days });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'The read failed.';
      await admin.from('yarepages_sites').update({ sync_status: 'error', sync_error: message }).eq('id', site.id);
      throw err;
    }
  } catch (err) {
    const e = err instanceof Err ? err : new Err(err instanceof Error ? err.message : 'Something went wrong.', 500);
    return json({ ok: false, error: e.message }, e.status);
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

// ---------------------------------------------------------------- the sync
async function sync(admin: SupabaseClient, site: Site, token: string) {
  const patch: Record<string, unknown> = {};
  if (!site.url) return { patch: { source: 'none' }, days: 0 };

  // 1. The page itself: title and social image. Best effort, five seconds.
  try {
    const res = await fetch(site.url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; YarePages/1.0)' }, signal: AbortSignal.timeout(5000), redirect: 'follow' });
    if (res.ok) {
      const html = (await res.text()).slice(0, 300000);
      const meta = (names: string[]) => {
        for (const n of names) {
          const m = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${n}["'][^>]+content=["']([^"']+)["']`, 'i')) ?? html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${n}["']`, 'i'));
          if (m?.[1]) return m[1];
        }
        return null;
      };
      const image = meta(['og:image', 'twitter:image', 'og:image:url']);
      const title = meta(['og:title']) ?? html.match(/<title[^>]*>([^<]{1,200})<\/title>/i)?.[1] ?? '';
      patch.preview_url = image ? new URL(image, site.url).toString() : null;
      patch.page_title = title.trim().slice(0, 200);
      patch.page_description = (meta(['description', 'og:description', 'twitter:description']) ?? '').replace(/\s+/g, ' ').trim().slice(0, 400);
    }
  } catch { /* the page is optional */ }

  if (!token) { patch.source = 'none'; return { patch, days: 0 }; }
  const cf = new Cloudflare(token);
  const host = site.host.toLowerCase();

  // 2. Where the visitors come from: a zone in the account, else a Web Analytics site, else nothing.
  let zoneId = site.zone_id, siteTag = site.site_tag;
  if (!zoneId) zoneId = await cf.zoneFor(host);
  if (!zoneId && !siteTag) siteTag = await cf.beaconFor(host);
  patch.zone_id = zoneId; patch.site_tag = siteTag;
  patch.source = zoneId ? 'zone' : siteTag ? 'beacon' : 'none';
  if (patch.source === 'none') return { patch, days: 0 };

  // 3. Ninety days by day, and the top pages, countries and referrers of the last thirty.
  const since = Date.now() - 90 * DAY;
  const days = zoneId ? await cf.zoneDays(zoneId, since) : await cf.beaconDays(siteTag!, since);
  const tops = zoneId ? await cf.zoneTops(zoneId, Date.now() - 30 * DAY) : await cf.beaconTops(siteTag!, Date.now() - 30 * DAY);

  await admin.from('yarepages_days').delete().eq('site_id', site.id);
  if (days.length) await admin.from('yarepages_days').insert(days.map((d) => ({ site_id: site.id, ...d })));
  await admin.from('yarepages_tops').delete().eq('site_id', site.id);
  if (tops.length) await admin.from('yarepages_tops').insert(tops.map((t) => ({ site_id: site.id, ...t })));
  return { patch, days: days.length };
}

// ---------------------------------------------------------------- Cloudflare
type Day = { day: string; visits: number; page_views: number; uniques: number };
type Top = { kind: 'page' | 'country' | 'referrer'; label: string; visits: number; position: number };
type Group = { dimensions: Record<string, string>; sum: { visits: number } };

class Cloudflare {
  private accountId: string | null = null;
  constructor(private token: string) {}
  private async rest(path: string): Promise<unknown> {
    const res = await fetch(`${CF}${path}`, { headers: { Authorization: `Bearer ${this.token}` }, signal: AbortSignal.timeout(15000) });
    const j = await res.json() as { success?: boolean; result?: unknown; errors?: Array<{ message: string }> };
    if (res.status === 401 || res.status === 403) throw new Err('Cloudflare did not accept the token. Check it under Connections.', 400);
    if (!res.ok || j.success === false) throw new Err(`Cloudflare: ${j.errors?.[0]?.message ?? res.status}`, 502);
    return j.result;
  }
  private async graphql(query: string, variables: Record<string, unknown>): Promise<Record<string, unknown>> {
    const res = await fetch(`${CF}/graphql`, { method: 'POST', headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(20000) });
    const j = await res.json() as { data?: Record<string, unknown>; errors?: Array<{ message: string }> };
    if (j.errors?.length) throw new Err(`Cloudflare analytics: ${j.errors[0]!.message}`, 502);
    return j.data ?? {};
  }
  private async account(): Promise<string> {
    if (this.accountId) return this.accountId;
    const accounts = await this.rest('/accounts?per_page=5') as Array<{ id: string }>;
    if (!accounts?.[0]) throw new Err('The token sees no Cloudflare account.', 400);
    this.accountId = accounts[0].id;
    return this.accountId;
  }
  /** The zone that owns this host, if the account has one: the host itself or a parent domain. */
  async zoneFor(host: string): Promise<string | null> {
    const parts = host.split('.');
    for (let i = 0; i < parts.length - 1; i++) {
      const zones = await this.rest(`/zones?name=${encodeURIComponent(parts.slice(i).join('.'))}&status=active`) as Array<{ id: string }>;
      if (zones?.[0]) return zones[0].id;
    }
    return null;
  }
  /** The Web Analytics site for this host, if one was created in the account. */
  async beaconFor(host: string): Promise<string | null> {
    const r = await this.rest(`/accounts/${await this.account()}/rum/site_info/list?per_page=50`).catch(() => null) as Array<{ site_tag: string; host?: string }> | null;
    const hit = (r ?? []).find((s) => (s.host ?? '').toLowerCase() === host);
    return hit?.site_tag ?? null;
  }
  async zoneDays(zoneId: string, sinceMs: number): Promise<Day[]> {
    const data = await this.graphql(`query ($zone: String!, $since: Date!) { viewer { zones(filter: {zoneTag: $zone}) { d: httpRequests1dGroups(limit: 100, filter: {date_geq: $since}, orderBy: [date_ASC]) { dimensions { date } sum { requests pageViews } uniq { uniques } } } } }`, { zone: zoneId, since: dayOf(sinceMs) });
    const rows = ((data.viewer as { zones?: Array<{ d?: Array<{ dimensions: { date: string }; sum: { requests: number; pageViews: number }; uniq: { uniques: number } }> }> })?.zones?.[0]?.d) ?? [];
    return rows.map((r) => ({ day: r.dimensions.date, visits: r.sum.pageViews, page_views: r.sum.pageViews, uniques: r.uniq.uniques }));
  }
  async zoneTops(zoneId: string, sinceMs: number): Promise<Top[]> {
    const data = await this.graphql(`query ($zone: String!, $since: Time!) { viewer { zones(filter: {zoneTag: $zone}) {
      p: httpRequestsAdaptiveGroups(limit: 10, filter: {datetime_geq: $since, requestSource: "eyeball", edgeResponseContentTypeName: "html"}, orderBy: [sum_visits_DESC]) { dimensions { clientRequestPath } sum { visits } }
      c: httpRequestsAdaptiveGroups(limit: 10, filter: {datetime_geq: $since, requestSource: "eyeball"}, orderBy: [sum_visits_DESC]) { dimensions { clientCountryName } sum { visits } }
      r: httpRequestsAdaptiveGroups(limit: 10, filter: {datetime_geq: $since, requestSource: "eyeball"}, orderBy: [sum_visits_DESC]) { dimensions { clientRefererHost } sum { visits } }
    } } }`, { zone: zoneId, since: new Date(sinceMs).toISOString() });
    const z = (data.viewer as { zones?: Array<Record<string, Group[]>> })?.zones?.[0] ?? {};
    return [...pick(z.p, 'clientRequestPath', 'page'), ...pick(z.c, 'clientCountryName', 'country'), ...pick(z.r, 'clientRefererHost', 'referrer')];
  }
  async beaconDays(siteTag: string, sinceMs: number): Promise<Day[]> {
    const data = await this.graphql(`query ($account: String!, $site: String!, $since: Time!) { viewer { accounts(filter: {accountTag: $account}) { d: rumPageloadEventsAdaptiveGroups(limit: 100, filter: {siteTag: $site, datetime_geq: $since}, orderBy: [date_ASC]) { dimensions { date } count sum { visits } } } } }`, { account: await this.account(), site: siteTag, since: new Date(sinceMs).toISOString() });
    const rows = ((data.viewer as { accounts?: Array<{ d?: Array<{ dimensions: { date: string }; count: number; sum: { visits: number } }> }> })?.accounts?.[0]?.d) ?? [];
    return rows.map((r) => ({ day: r.dimensions.date, visits: r.sum.visits, page_views: r.count, uniques: r.sum.visits }));
  }
  async beaconTops(siteTag: string, sinceMs: number): Promise<Top[]> {
    const data = await this.graphql(`query ($account: String!, $site: String!, $since: Time!) { viewer { accounts(filter: {accountTag: $account}) {
      p: rumPageloadEventsAdaptiveGroups(limit: 10, filter: {siteTag: $site, datetime_geq: $since}, orderBy: [sum_visits_DESC]) { dimensions { requestPath } sum { visits } }
      c: rumPageloadEventsAdaptiveGroups(limit: 10, filter: {siteTag: $site, datetime_geq: $since}, orderBy: [sum_visits_DESC]) { dimensions { countryName } sum { visits } }
      r: rumPageloadEventsAdaptiveGroups(limit: 10, filter: {siteTag: $site, datetime_geq: $since}, orderBy: [sum_visits_DESC]) { dimensions { refererHost } sum { visits } }
    } } }`, { account: await this.account(), site: siteTag, since: new Date(sinceMs).toISOString() });
    const a = (data.viewer as { accounts?: Array<Record<string, Group[]>> })?.accounts?.[0] ?? {};
    return [...pick(a.p, 'requestPath', 'page'), ...pick(a.c, 'countryName', 'country'), ...pick(a.r, 'refererHost', 'referrer')];
  }
}

const pick = (rows: Group[] | undefined, dim: string, kind: Top['kind']): Top[] =>
  (rows ?? []).filter((r) => r.dimensions[dim]).map((r, i) => ({ kind, label: r.dimensions[dim]!, visits: r.sum.visits, position: i }));
