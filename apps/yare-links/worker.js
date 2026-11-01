/**
 * The Worker in front of the built app. Static files are served as they are; a page's address
 * (/<address>) gets its <head> filled in before it leaves Cloudflare, so search engines, messaging
 * apps and agents that never run JavaScript still see the title, the description, the picture and
 * the structured data. /<address>/summary.txt is a plain summary of the page for agents.
 *
 * Reads the page through the same public function the browser uses; nothing secret is involved.
 */
const RESERVED = new Set(['pages', 'connections', 'reset', 'login', 'signin', 'api', 'assets', 'yare', 'admin', 'manage', 'settings', 'new']);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const m = url.pathname.match(/^\/([a-z0-9]+(?:-[a-z0-9]+)*)(\/summary\.txt)?$/);
    if (request.method !== 'GET' || !m || RESERVED.has(m[1])) return env.ASSETS.fetch(request);
    const slug = m[1];
    const page = await openPage(env, url, slug);
    if (m[2]) {
      if (!page) return new Response('This page is not open.\n', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      return new Response(summary(page, `${url.origin}/${slug}`), { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
    }
    // The app's shell is the root document; asking for index.html by name would only redirect to it.
    const shell = await env.ASSETS.fetch(new Request(`${url.origin}/`, { headers: { Accept: 'text/html' } }));
    if (!page) return shell;
    if (page.redirect_url) return Response.redirect(page.redirect_url, 302);
    return fill(shell, page, env, url, slug);
  },
};

async function config(env, url) {
  const r = await env.ASSETS.fetch(new Request(`${url.origin}/yare.json`));
  return r.ok ? r.json() : null;
}

async function openPage(env, url, slug) {
  try {
    const cfg = await config(env, url);
    if (!cfg?.supabaseUrl || !cfg?.supabasePublishableKey) return null;
    const r = await fetch(`${cfg.supabaseUrl}/rest/v1/rpc/yarelinks_open`, {
      method: 'POST', headers: { apikey: cfg.supabasePublishableKey, Authorization: `Bearer ${cfg.supabasePublishableKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_slug: slug }), cf: { cacheTtl: 60, cacheEverything: true },
    });
    if (!r.ok) return null;
    const page = await r.json();
    page._images = `${cfg.supabaseUrl}/storage/v1/object/public/yare-images/`;
    return page;
  } catch { return null; }
}

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const KNOWN = { 'linkedin.com': 'LinkedIn', 'github.com': 'GitHub', 'instagram.com': 'Instagram', 'youtube.com': 'YouTube', 'youtu.be': 'YouTube', 'tiktok.com': 'TikTok', 'x.com': 'X', 'twitter.com': 'X', 'threads.net': 'Threads', 'facebook.com': 'Facebook', 'behance.net': 'Behance', 'dribbble.com': 'Dribbble', 'medium.com': 'Medium', 'substack.com': 'Substack', 'spotify.com': 'Spotify', 'open.spotify.com': 'Spotify', 'soundcloud.com': 'SoundCloud', 'twitch.tv': 'Twitch', 'discord.gg': 'Discord', 'patreon.com': 'Patreon', 'pinterest.com': 'Pinterest', 'reddit.com': 'Reddit', 'wa.me': 'WhatsApp', 't.me': 'Telegram', 'paypal.me': 'PayPal' };
const ICONS = { instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube', x: 'X', threads: 'Threads', facebook: 'Facebook', linkedin: 'LinkedIn', github: 'GitHub', spotify: 'Spotify', soundcloud: 'SoundCloud', twitch: 'Twitch', discord: 'Discord', pinterest: 'Pinterest', snapchat: 'Snapchat', reddit: 'Reddit', whatsapp: 'WhatsApp', telegram: 'Telegram', behance: 'Behance', dribbble: 'Dribbble', medium: 'Medium', patreon: 'Patreon', paypal: 'PayPal', apple: 'Apple', googleplay: 'Google Play', globe: 'Website', link: 'Link', email: 'Email', phone: 'Phone', bookmark: 'Bookmark', newspaper: 'News', bag: 'Shop', cart: 'Shop', storefront: 'Shop' };
function siteName(url) {
  try { const host = new URL(url).hostname.replace(/^www\./, ''); return KNOWN[host] ?? host; } catch { return url.replace(/^mailto:|^tel:/, ''); }
}
/** The addresses a page points at, one each, named by the block's title, else its icon, else the site. */
function links(p) {
  const seen = new Set(); const out = [];
  for (const b of p.blocks) {
    if (!b.url || b.lock_kind !== 'none' || /^(form|signup|qr)$/.test(b.type)) continue;
    const key = b.url.replace(/\/$/, ''); if (seen.has(key)) continue; seen.add(key);
    out.push({ name: b.title || ICONS[b.icon] || siteName(b.url), url: b.url });
  }
  return out;
}

function fill(shell, p, env, url, slug) {
  const pageUrl = `${url.origin}/${slug}`;
  const title = p.seo_title || p.title;
  const description = p.seo_description || p.bio || '';
  const image = p.share_image_path ? p._images + p.share_image_path : p.avatar_path ? p._images + p.avatar_path : null;
  const icon = p.icon_path ? p._images + p.icon_path : null;
  const data = {
    '@context': 'https://schema.org', '@type': p.schema_kind === 'organization' ? 'Organization' : 'Person',
    name: p.title, description: description || undefined, url: pageUrl, image: image ?? undefined, sameAs: links(p).map((l) => l.url),
    mainEntityOfPage: { '@type': 'WebPage', '@id': pageUrl, name: title, hasPart: { '@type': 'ItemList', itemListElement: links(p).map((l, i) => ({ '@type': 'ListItem', position: i + 1, name: l.name, url: l.url })) } },
  };
  const head = [
    `<meta name="description" content="${esc(description)}">`,
    `<meta name="robots" content="${p.seo_index === false ? 'noindex, nofollow' : 'index, follow'}">`,
    `<link rel="canonical" href="${esc(pageUrl)}">`,
    `<meta property="og:type" content="profile">`, `<meta property="og:title" content="${esc(title)}">`, `<meta property="og:description" content="${esc(description)}">`, `<meta property="og:url" content="${esc(pageUrl)}">`,
    image ? `<meta property="og:image" content="${esc(image)}">` : '',
    `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">`, `<meta name="twitter:title" content="${esc(title)}">`, `<meta name="twitter:description" content="${esc(description)}">`, image ? `<meta name="twitter:image" content="${esc(image)}">` : '',
    icon ? `<link rel="icon" href="${esc(icon)}"><link rel="apple-touch-icon" href="${esc(icon)}">` : '',
    `<link rel="alternate" type="text/plain" href="${esc(pageUrl)}/summary.txt" title="Summary for agents">`,
    `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`,
  ].filter(Boolean).join('\n    ');
  return new HTMLRewriter()
    .on('title', { element(e) { e.setInnerContent(title); } })
    .on('meta[name="robots"]', { element(e) { e.remove(); } })
    .on(icon ? 'link[rel="icon"], link[rel="apple-touch-icon"]' : 'link[rel="never"]', { element(e) { e.remove(); } })
    .on('head', { element(e) { e.append(head, { html: true }); } })
    .transform(new Response(shell.body, { status: 200, headers: { ...Object.fromEntries(shell.headers), 'Cache-Control': 'public, max-age=60' } }));
}

function summary(p, pageUrl) {
  const lines = [`# ${p.seo_title || p.title}`, '', p.seo_description || p.bio || '', '', `Page: ${pageUrl}`, `Kind: ${p.schema_kind === 'organization' ? 'organisation' : 'person'}`, '', '## Links'];
  for (const l of links(p)) lines.push(`- ${l.name}: ${l.url}`);
  return lines.filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n') + '\n';
}
