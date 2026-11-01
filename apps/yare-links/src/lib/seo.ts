import type { PublicBlock, PublicPage } from './supabase';

import { iconById } from './icons';

/** A readable name for a site, from its address: linkedin.com becomes LinkedIn, anything else its host. */
export function siteName(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    const known: Record<string, string> = { 'linkedin.com': 'LinkedIn', 'github.com': 'GitHub', 'instagram.com': 'Instagram', 'youtube.com': 'YouTube', 'youtu.be': 'YouTube', 'tiktok.com': 'TikTok', 'x.com': 'X', 'twitter.com': 'X', 'threads.net': 'Threads', 'facebook.com': 'Facebook', 'behance.net': 'Behance', 'dribbble.com': 'Dribbble', 'medium.com': 'Medium', 'substack.com': 'Substack', 'spotify.com': 'Spotify', 'open.spotify.com': 'Spotify', 'soundcloud.com': 'SoundCloud', 'twitch.tv': 'Twitch', 'discord.gg': 'Discord', 'patreon.com': 'Patreon', 'pinterest.com': 'Pinterest', 'reddit.com': 'Reddit', 'wa.me': 'WhatsApp', 't.me': 'Telegram', 'paypal.me': 'PayPal' };
    return known[host] ?? host;
  } catch { return url.replace(/^mailto:/, '').replace(/^tel:/, ''); }
}

/** The addresses a page points at, one each, named by the block's title, else its icon, else the site. */
export function pageLinks(p: Pick<PublicPage, 'blocks'>): Array<{ name: string; url: string }> {
  const seen = new Set<string>();
  const out: Array<{ name: string; url: string }> = [];
  for (const b of p.blocks as PublicBlock[]) {
    if (!b.url || b.lock_kind !== 'none' || /^(form|signup|qr)$/.test(b.type)) continue;
    const key = b.url.replace(/\/$/, '');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name: b.title || iconById(b.icon)?.label || siteName(b.url), url: b.url });
  }
  return out;
}

/** Structured data for a page: who it is and what it links to, in the vocabulary search engines and agents read. */
export function structuredData(p: PublicPage, pageUrl: string, imageUrl: string | null): Record<string, unknown> {
  const links = pageLinks(p);
  return {
    '@context': 'https://schema.org',
    '@type': p.schema_kind === 'organization' ? 'Organization' : 'Person',
    name: p.title,
    description: p.seo_description || p.bio || undefined,
    url: pageUrl,
    image: imageUrl ?? undefined,
    sameAs: links.map((l) => l.url),
    mainEntityOfPage: { '@type': 'WebPage', '@id': pageUrl, name: p.seo_title || p.title, hasPart: { '@type': 'ItemList', itemListElement: links.map((l, i) => ({ '@type': 'ListItem', position: i + 1, name: l.name, url: l.url })) } },
  };
}

/** A plain summary of the page for agents: who, what, and the links, one per line. */
export function agentSummary(p: PublicPage, pageUrl: string): string {
  const lines = [`# ${p.seo_title || p.title}`, '', p.seo_description || p.bio || '', '', `Page: ${pageUrl}`, `Kind: ${p.schema_kind === 'organization' ? 'organisation' : 'person'}`, '', '## Links'];
  for (const l of pageLinks(p)) lines.push(`- ${l.name}: ${l.url}`);
  return lines.filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n') + '\n';
}
