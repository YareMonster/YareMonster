/** Small formatting helpers for the group view. */

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1048576).toFixed(n < 10485760 ? 1 : 0)} MB`;
}

const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** "Today", "Yesterday" or the date, for the separators between days. */
export function dayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (sameDay(d, now)) return 'Today';
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (sameDay(d, y)) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric' });
}

export const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
export const dayKey = (iso: string) => iso.slice(0, 10);

export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '?';
}

/** A steady colour for a name, for avatars without a picture. Soft, readable with white text. */
export function nameColor(seed: string): string {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const hues = [212, 262, 160, 28, 190, 330, 96, 240];
  return `hsl(${hues[h % hues.length]} 45% 48%)`;
}

export function isValidChannelName(v: string) { return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(v) && v.length <= 40; }
export const toChannelName = (v: string) => v.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

/** Turns URLs in a post into links. Everything else stays text. */
export function splitLinks(text: string): Array<{ kind: 'text' | 'link'; value: string }> {
  const out: Array<{ kind: 'text' | 'link'; value: string }> = [];
  const re = /https?:\/\/[^\s<>"')\]]+/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index! > last) out.push({ kind: 'text', value: text.slice(last, m.index) });
    out.push({ kind: 'link', value: m[0] });
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push({ kind: 'text', value: text.slice(last) });
  return out;
}
