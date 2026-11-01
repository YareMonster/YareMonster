/**
 * The grid every page is made of: six cells wide, ten rows to a phone screen (a 9:16 screen holds
 * ten square cells of six across), and it grows down
 * when a page needs more. A cell is never smaller than 44px, Apple's floor for anything tappable;
 * on an iPhone it comes out at about 59px. What sits inside a block scales with the cell: the icon
 * is 55% of it, the air around it 22%.
 */
import type { Block } from './supabase';

export const COLS = 6;
export const SCREEN_ROWS = 10;
export const MAX_ROWS = 48;
export const MIN_CELL = 44;
/** The grid's width on a computer, where it keeps phone proportions. */
/** On a wide screen the page is a column as wide as a phone, so it looks exactly like the preview. */
export const DESKTOP_WIDTH = 390;

export interface Placed { x: number; y: number; w: number; h: number }

/** A new block starts at 2×2. Any block can be as small as one cell. */
export const DEFAULT_SIZE = { w: 2, h: 2 };

/** What a block's address plays, when the block is big enough to play it. */
export type Embed = { kind: 'youtube' | 'vimeo' | 'spotify' | 'soundcloud'; src: string; poster?: string };
export function embedFor(url: string, w: number, h: number): Embed | null {
  if (!url) return null;
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/))([\w-]{11})/);
  if (yt) return w >= 4 && h >= 3 ? { kind: 'youtube', src: `https://www.youtube-nocookie.com/embed/${yt[1]}`, poster: `https://i.ytimg.com/vi/${yt[1]}/hqdefault.jpg` } : null;
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return w >= 4 && h >= 3 ? { kind: 'vimeo', src: `https://player.vimeo.com/video/${vimeo[1]}` } : null;
  const sp = url.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?(track|album|playlist|episode|show|artist)\/([A-Za-z0-9]+)/);
  if (sp) return w >= 4 && h >= 2 ? { kind: 'spotify', src: `https://open.spotify.com/embed/${sp[1]}/${sp[2]}` } : null;
  if (/soundcloud\.com\/[\w-]+\/[\w-]+/.test(url)) return w >= 4 && h >= 2 ? { kind: 'soundcloud', src: `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23272d39&auto_play=false&show_teaser=false&visual=false` } : null;
  return null;
}

/**
 * A block that collects emails needs a row for the field: 4 wide and 2 tall with its title, or the
 * whole width in a single row with the field alone. One that collects messages needs room to write.
 */
export function formFits(type: string, w: number, h: number): boolean {
  if (type === 'signup') return (w >= 4 && h >= 2) || (w >= 6 && h === 1);
  if (type === 'form') return w >= 4 && h >= 4;
  return false;
}

/** A feed shows its items from 4 wide and 3 tall; smaller, a tap opens the channel, the publication or the podcast. */
export function feedFits(type: string, url: string, w: number, h: number): boolean {
  return (type === 'youtube_feed' || type === 'substack_feed' || type === 'podcast_feed') && !!url && w >= 4 && h >= 3;
}
/** The kind of feed a block reads, for the function that fetches it. */
export type FeedKind = 'youtube' | 'substack' | 'podcast';
export function feedKind(type: string): FeedKind {
  return type === 'youtube_feed' ? 'youtube' : type === 'podcast_feed' ? 'podcast' : 'substack';
}

/** A Giphy link, in any of the forms Giphy hands out, as the address of the GIF itself; null when it is not one. */
export function giphyFor(url: string): string | null {
  if (!/giphy\.com\//i.test(url)) return null;
  const id = url.match(/\/media\/(?:v\d+\.[^/]+\/)?([A-Za-z0-9]+)\//)?.[1]
    ?? url.match(/i\.giphy\.com\/([A-Za-z0-9]+)/)?.[1]
    ?? url.match(/giphy\.com\/(?:gifs|embed|stickers)\/(?:[\w-]+-)?([A-Za-z0-9]{8,})(?:[/?#]|$)/)?.[1];
  return id ? `https://media.giphy.com/media/${id}/giphy.gif` : null;
}
/** A QR code needs a square of at least two cells to be scanned. */
export function qrFits(type: string, url: string, w: number, h: number): boolean {
  return type === 'qr' && !!url && w >= 2 && h >= 2;
}

/** A block that shows a form from Yare Forms needs room for the form itself. */
export function frameFits(type: string, url: string, w: number, h: number): boolean {
  return type === 'embed' && !!url && w >= 4 && h >= 4;
}

/** What fits in a block of this size: the rules from the design, worked out from width and height. */
export function fits(w: number, h: number): { icon: boolean; title: boolean; subtext: boolean } {
  if (h === 1) return { icon: w <= 2 || w >= 6, title: w >= 3, subtext: false };
  return { icon: true, title: w >= 2, subtext: (w >= 4 && h >= 2) || (w >= 3 && h >= 3) };
}

/** Does this block sit inside the grid without touching another? */
export function isFree(blocks: Placed[], candidate: Placed, ignoreId?: string, list?: Block[]): boolean {
  if (candidate.x < 0 || candidate.y < 0 || candidate.x + candidate.w > COLS || candidate.y + candidate.h > MAX_ROWS) return false;
  return !blocks.some((b, i) => (list?.[i]?.id !== ignoreId || !ignoreId) && overlaps(b, candidate));
}
export const overlaps = (a: Placed, b: Placed) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/** The first empty spot for a block of this size, scanning row by row. */
export function findSpot(blocks: Placed[], w: number, h: number): Placed {
  for (let y = 0; y < MAX_ROWS; y++) for (let x = 0; x <= COLS - w; x++) {
    const c = { x, y, w, h };
    if (!blocks.some((b) => overlaps(b, c))) return c;
  }
  return { x: 0, y: MAX_ROWS - h, w, h };
}

/** The last row a page uses, so the grid can grow and the visitor's page knows its height. */
/**
 * Blocks never sit on top of each other: in reading order, a block that overlaps one placed before
 * it moves down until it is clear. Returns the blocks in the same order, with the moved ones' new y.
 */
export function settle<T extends Placed>(blocks: T[]): T[] {
  const order = blocks.map((_, i) => i).sort((a, b) => blocks[a]!.y - blocks[b]!.y || blocks[a]!.x - blocks[b]!.x);
  const placed: Placed[] = [];
  const out = blocks.slice();
  for (const i of order) {
    let b = { ...blocks[i]! };
    let hit: Placed | undefined;
    while ((hit = placed.find((p) => overlaps(p, b)))) b = { ...b, y: hit.y + hit.h };
    placed.push(b); out[i] = b;
  }
  return out;
}

export function usedRows(blocks: Placed[]): number {
  return Math.max(SCREEN_ROWS, ...blocks.map((b) => b.y + b.h));
}

/** A link that plays as a video in a window over the page, or null to open it as a site. */
export function videoEmbed(url: string): string | null {
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/))([\w-]{11})/);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}?autoplay=1`;
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}?autoplay=1`;
  return null;
}

/** Light or dark words for a colour, so a title stays readable on any background. */
export function readableOn(hex: string): 'light' | 'dark' {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return 'dark';
  const [r, g, b] = [m[1], m[2], m[3]].map((v) => parseInt(v!, 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const lum = 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
  return lum > 0.45 ? 'dark' : 'light';
}

/** A palette for block and page backgrounds: the brand, then soft colours, then neutrals. */
export const palette = ['#ffe91a', '#0073fe', '#272d39', '#ff6b57', '#ffffff', '#f7f1e6', '#ffd9d3', '#ffe3d6', '#fff6c7', '#e6f6d8', '#d9f7ea', '#dcefff', '#e9ddff', '#efe6ff', '#8f7cf8', '#1f6f4a', '#0f1a33', '#17181b'];

/**
 * The height of a page's first screen: the column at a phone's proportion (9:19.5), or the screen
 * it is drawn in when that is taller. So a picture behind the page ends at the same row on a wide
 * window as on a phone, instead of running out early.
 */
export function screenHeight(el: HTMLElement): number {
  const column = el.clientWidth * 19.5 / 9;
  const screen = el.closest<HTMLElement>('.yare-phone__screen');
  if (screen) return Math.max(screen.clientHeight, column);
  const drawn = el.closest<HTMLElement>('[data-screen-h]');
  if (drawn) return Number(drawn.dataset.screenH);
  return Math.max(window.innerHeight, column);
}
