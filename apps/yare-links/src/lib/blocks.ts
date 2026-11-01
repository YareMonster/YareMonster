import type { BlockType } from './supabase';

export interface BlockKind { type: BlockType; label: string; hint: string; group: 'links' | 'media' | 'collect' | 'more' }

/** Every block a page can hold, in the order the Add menu shows them. */
export const blockKinds: BlockKind[] = [
  { type: 'link', label: 'Link', hint: 'An icon, a title, an address', group: 'links' },
  { type: 'text', label: 'Text', hint: 'A title and a line, no link', group: 'links' },
  { type: 'image', label: 'Picture', hint: 'A picture that fills the block', group: 'links' },
  { type: 'youtube', label: 'YouTube', hint: 'A video that plays on the page', group: 'media' },
  { type: 'spotify', label: 'Spotify', hint: 'A song, album, playlist or show', group: 'media' },
  { type: 'soundcloud', label: 'SoundCloud', hint: 'A track or a set', group: 'media' },
  { type: 'video', label: 'Video file', hint: 'Your own video, from your storage', group: 'media' },
  { type: 'form', label: 'Contact form', hint: 'Name, email, phone, message', group: 'collect' },
  { type: 'signup', label: 'Email sign-up', hint: 'One field, a growing list', group: 'collect' },
  { type: 'contact', label: 'Contact card', hint: 'Save your details to a phone', group: 'more' },
  { type: 'map', label: 'Map', hint: 'A place, on a map', group: 'more' },
];
export const kindOf = (type: BlockType) => blockKinds.find((k) => k.type === type) ?? blockKinds[0]!;
export const hasUrl = (type: BlockType) => ['link', 'youtube', 'spotify', 'soundcloud'].includes(type);
export const isClickable = (type: BlockType) => ['link', 'contact', 'image'].includes(type);

/** Turns a pasted address into what the embed needs, or null when it is not one. */
export function youtubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/))([\w-]{11})/);
  return m?.[1] ?? null;
}
export function spotifyEmbed(url: string): string | null {
  const m = url.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?(track|album|playlist|episode|show|artist)\/([A-Za-z0-9]+)/);
  return m ? `https://open.spotify.com/embed/${m[1]}/${m[2]}` : null;
}
export function soundcloudEmbed(url: string): string | null {
  return /soundcloud\.com\/[\w-]+\/[\w-]+/.test(url) ? `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23272d39&auto_play=false&show_teaser=false&visual=false` : null;
}
export const mapEmbed = (place: string) => `https://www.google.com/maps?q=${encodeURIComponent(place)}&output=embed`;

/** Adds https:// to a bare domain. */
export function normalizeUrl(v: string): string {
  const t = v.trim();
  if (!t) return '';
  return /^[a-z][a-z0-9+.-]*:/i.test(t) ? t : `https://${t}`;
}
export const isValidUrl = (v: string) => { try { const u = new URL(v); return u.protocol === 'https:' || u.protocol === 'http:' || u.protocol === 'mailto:' || u.protocol === 'tel:'; } catch { return false; } };

/** A vCard for the contact block. */
export function vcard(c: { name?: string; phone?: string; email?: string; company?: string; website?: string }): string {
  const esc = (s: string) => s.replace(/[\;,]/g, (ch) => `\\${ch}`).replace(/\n/g, '\\n');
  return ['BEGIN:VCARD', 'VERSION:3.0', `FN:${esc(c.name ?? '')}`, c.company ? `ORG:${esc(c.company)}` : '', c.phone ? `TEL;TYPE=CELL:${esc(c.phone)}` : '', c.email ? `EMAIL:${esc(c.email)}` : '', c.website ? `URL:${esc(c.website)}` : '', 'END:VCARD'].filter(Boolean).join('\r\n');
}
