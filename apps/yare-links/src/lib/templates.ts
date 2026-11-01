import type { Block, BlockType, Effect, TextAlign, TextColor, TextSize } from './supabase';

/** A block in a template: where it goes, how big, how it looks. The words are placeholders. */
export type TemplateBlock = Pick<Block, 'x' | 'y' | 'w' | 'h' | 'title' | 'description' | 'icon' | 'bg_color' | 'type' | 'text_color' | 'url' | 'effect' | 'text_size' | 'text_align' | 'font' | 'price' | 'text_valign'>;

export interface Template {
  id: string;
  name: string;
  blurb: string;
  page: { bg_color: string; grid_gap: number; grid_radius: number; font?: string; grid_pad?: boolean };
  /** The design as a picture, shown on the card; without one the card draws the blocks. */
  preview?: string;
  blocks: TemplateBlock[];
}

const b = (x: number, y: number, w: number, h: number, bg: string, o: { title?: string; sub?: string; icon?: string; type?: BlockType; text?: TextColor; effect?: Effect; size?: TextSize; align?: TextAlign; valign?: Block['text_valign']; font?: string; price?: string } = {}): TemplateBlock => ({
  x, y, w, h, bg_color: bg, title: o.title ?? '', description: o.sub ?? '', icon: o.icon ?? '', type: o.type ?? 'link', text_color: o.text ?? 'auto', url: '', effect: o.effect ?? 'fill', text_size: o.size ?? 'm', text_align: o.align ?? 'left', text_valign: o.valign ?? 'bottom', font: o.font ?? '', price: o.price ?? '',
});

const white = '#ffffff';


const socials = (y: number, bg: string, text: TextColor = 'auto') => [b(0, y, 1, 1, bg, { icon: 'instagram', text }), b(1, y, 1, 1, bg, { icon: 'tiktok', text }), b(2, y, 1, 1, bg, { icon: 'youtube', text }), b(3, y, 1, 1, bg, { icon: 'x', text })];

/** Ten starting points, each laid out like its design: the blocks, their sizes, colours and fonts. Every word is a placeholder. */
export const templates: Template[] = [
  { id: 'creator', name: 'Creator', blurb: 'Your photo behind everything, your name over it, the channels, one video, one sign-up.', preview: '/samples/creator-preview.jpg', page: { bg_color: '#1a1410', grid_gap: 8, grid_radius: 16 }, blocks: [
    b(0, 6, 6, 2, white, { title: 'Your title', sub: 'Your subtext', effect: 'none', text: 'light', size: 'xl' }),
    ...socials(8, white, 'light').map((s) => ({ ...s, effect: 'none' as Effect })), b(4, 8, 2, 1, white, { title: 'Your title', icon: 'bag', effect: 'glass', text: 'light' }),
    b(0, 9, 6, 3, '#1a1410', { title: 'Your title', icon: 'play', type: 'video', text: 'light' }),
    b(0, 12, 6, 2, white, { title: 'Your title', sub: 'Your subtext', type: 'signup', effect: 'glass', text: 'light' }),
  ] },
  { id: 'shop', name: 'Shop', blurb: 'One big picture, a line, three objects with their prices, the whole shop one tap away.', preview: '/samples/shop-preview.jpg', page: { bg_color: '#f5f0e8', grid_gap: 8, grid_radius: 10, font: 'playfair-display' }, blocks: [
    b(0, 0, 6, 6, '#e9dcc9', { icon: 'image' }),
    b(0, 6, 6, 1, '#f5f0e8', { title: 'Your title', effect: 'none', size: 'l' }),
    b(0, 7, 2, 3, '#e9dcc9', { title: 'Your title', price: 'Price', type: 'product', font: 'inter', size: 's' }),
    b(2, 7, 2, 3, '#e9dcc9', { title: 'Your title', price: 'Price', type: 'product', font: 'inter', size: 's' }),
    b(4, 7, 2, 3, '#e9dcc9', { title: 'Your title', price: 'Price', type: 'product', font: 'inter', size: 's' }),
    b(0, 10, 6, 1, '#3b2430', { title: 'Your title', text: 'light', align: 'center' }),
    b(1, 11, 1, 1, '#f5f0e8', { icon: 'instagram', effect: 'none' }), b(2, 11, 1, 1, '#f5f0e8', { icon: 'tiktok', effect: 'none' }), b(3, 11, 1, 1, '#f5f0e8', { icon: 'youtube', effect: 'none' }), b(4, 11, 1, 1, '#f5f0e8', { icon: 'x', effect: 'none' }),
  ] },
  { id: 'musician', name: 'Musician', blurb: 'Black and chrome: the record playing, the film, the dates, the merch.', preview: '/samples/musician-preview.jpg', page: { bg_color: '#0b0b0b', grid_gap: 8, grid_radius: 14, font: 'playfair-display' }, blocks: [
    b(0, 9, 6, 2, white, { title: 'Your title', sub: 'Your subtext', icon: 'spotify', type: 'video', effect: 'glass', text: 'light', font: 'jetbrains-mono' }),
    b(0, 11, 6, 1, white, { title: 'Your title', effect: 'none', text: 'light', size: 'l' }),
    b(0, 12, 6, 1, white, { title: 'Your title', effect: 'none', text: 'light', size: 'l' }),
    b(0, 13, 1, 1, white, { icon: 'instagram', effect: 'none', text: 'light' }), b(1, 13, 1, 1, white, { icon: 'tiktok', effect: 'none', text: 'light' }), b(2, 13, 1, 1, white, { icon: 'youtube', effect: 'none', text: 'light' }), b(3, 13, 1, 1, white, { icon: 'soundcloud', effect: 'none', text: 'light' }),
    b(4, 13, 2, 1, white, { title: 'Your title', icon: 'bag', effect: 'none', text: 'light' }),
  ] },
  { id: 'minimal', name: 'Minimal', blurb: 'Paper, one big line, a numbered list of links.', preview: '/samples/minimal-preview.jpg', page: { bg_color: '#f7f5f0', grid_gap: 8, grid_radius: 4, font: 'nunito' }, blocks: [
    b(0, 0, 6, 2, white, { title: 'Your title', sub: 'Your subtext', effect: 'none', size: 's', valign: 'top' }),
    b(0, 2, 6, 3, white, { title: 'Your title', sub: 'Your subtext', effect: 'none', size: 'xl', valign: 'top' }),
    b(0, 5, 6, 1, white, { title: 'Your title', effect: 'none', size: 'l' }), b(0, 6, 6, 1, white, { title: 'Your title', effect: 'none', size: 'l' }), b(0, 7, 6, 1, white, { title: 'Your title', effect: 'none', size: 'l' }), b(0, 8, 6, 1, white, { title: 'Your title', effect: 'none', size: 'l' }),
    b(0, 9, 1, 1, white, { icon: 'linkedin', effect: 'none' }), b(1, 9, 1, 1, white, { icon: 'x', effect: 'none' }), b(2, 9, 1, 1, white, { icon: 'github', effect: 'none' }),
  ] },
  { id: 'podcast', name: 'Podcast', blurb: 'The latest episode, the three apps to follow on, the notes by email.', preview: '/samples/podcast-preview.jpg', page: { bg_color: '#1b0f17', grid_gap: 8, grid_radius: 18, font: 'playfair-display' }, blocks: [
    b(0, 8, 6, 3, white, { title: 'Your title', sub: 'Your subtext', icon: 'play', type: 'video', effect: 'glass', text: 'light' }),
    b(0, 11, 2, 2, white, { title: 'Your title', icon: 'podcast', effect: 'none', text: 'light' }), b(2, 11, 2, 2, white, { title: 'Your title', icon: 'spotify', effect: 'none', text: 'light' }), b(4, 11, 2, 2, white, { title: 'Your title', icon: 'youtube', effect: 'none', text: 'light' }),
    b(0, 13, 6, 2, white, { title: 'Your title', sub: 'Your subtext', type: 'signup', effect: 'glass', text: 'light' }),
  ] },
  { id: 'cafe', name: 'Café', blurb: 'The room, one warm line, the menu and a table, where to find you.', preview: '/samples/cafe-preview.jpg', page: { bg_color: '#fbf3dc', grid_gap: 8, grid_radius: 28, font: 'playfair-display' }, blocks: [
    b(0, 0, 6, 1, '#fbf3dc', { icon: 'image' }),
    b(0, 1, 6, 5, '#e8dcc0', { icon: 'image' }),
    b(0, 6, 6, 2, white, { title: 'Your title', effect: 'none', size: 'xl', text: '#1f3d2b', valign: 'middle' }),
    b(0, 8, 3, 1, '#1f3d2b', { title: 'Your title', text: 'light', align: 'center' }), b(3, 8, 3, 1, '#1f3d2b', { title: 'Your title', effect: 'none', text: '#1f3d2b', align: 'center' }),
    b(0, 9, 6, 1, white, { title: 'Your title', effect: 'none', text: '#1f3d2b', size: 's', align: 'center' }),
    b(0, 10, 6, 2, white, { title: 'Your title', sub: 'Your subtext', icon: 'mappin', effect: 'none', text: '#1f3d2b' }),
    b(0, 12, 1, 1, white, { icon: 'instagram', effect: 'none', text: '#1f3d2b' }), b(1, 12, 1, 1, white, { icon: 'whatsapp', effect: 'none', text: '#1f3d2b' }), b(2, 12, 4, 1, white, { title: 'Your title', icon: 'gift', effect: 'none', text: '#1f3d2b' }),
  ] },
  { id: 'portfolio', name: 'Portfolio', blurb: 'Four pieces of work, big, and a form to start a project.', preview: '/samples/portfolio-preview.jpg', page: { bg_color: '#f4f2ee', grid_gap: 8, grid_radius: 4, font: 'playfair-display' }, blocks: [
    b(0, 0, 6, 2, white, { title: 'Your title', sub: 'Your subtext', effect: 'none', size: 'l', valign: 'top' }),
    b(0, 2, 6, 3, '#e3e6ee', { icon: 'image' }),
    b(0, 5, 3, 3, '#dfe2d9', { icon: 'image' }), b(3, 5, 3, 3, '#e9e6df', { icon: 'image' }),
    b(0, 8, 6, 2, '#e3e6ee', { icon: 'image' }),
    b(0, 10, 6, 4, white, { title: 'Your title', sub: 'Your subtext', type: 'form', effect: 'none', size: 'l' }),
    b(0, 14, 1, 1, white, { icon: 'behance', effect: 'none' }), b(1, 14, 1, 1, white, { icon: 'dribbble', effect: 'none' }), b(2, 14, 1, 1, white, { icon: 'instagram', effect: 'none' }),
  ] },
  { id: 'event', name: 'Event', blurb: 'The night, the date and the place, tickets in acid yellow.', preview: '/samples/event-preview.jpg', page: { bg_color: '#07110b', grid_gap: 8, grid_radius: 28, font: 'playfair-display' }, blocks: [
    b(0, 9, 6, 2, white, { title: 'Your title', sub: 'Your subtext', effect: 'none', text: 'light', size: 'l', align: 'center', valign: 'middle' }),
    b(0, 11, 6, 1, '#e6ff2e', { title: 'Your title', icon: 'ticket', align: 'center' }),
    b(0, 12, 6, 1, white, { title: 'Your title', effect: 'none', text: 'light', align: 'center' }), b(0, 13, 6, 1, white, { title: 'Your title', effect: 'none', text: 'light', align: 'center' }),
    b(1, 14, 1, 1, white, { icon: 'instagram', effect: 'none', text: 'light' }), b(2, 14, 1, 1, white, { icon: 'tiktok', effect: 'none', text: 'light' }), b(3, 14, 1, 1, white, { icon: 'youtube', effect: 'none', text: 'light' }), b(4, 14, 1, 1, white, { icon: 'x', effect: 'none', text: 'light' }),
  ] },
  { id: 'writer', name: 'Writer', blurb: 'A name, a letter to join, two essays with their pictures.', preview: '/samples/writer-preview.jpg', page: { bg_color: '#efe6ee', grid_gap: 8, grid_radius: 6, font: 'playfair-display' }, blocks: [
    b(0, 0, 4, 3, white, { title: 'Your title', sub: 'Your subtext', effect: 'none', size: 'xl', text: '#2a1230', valign: 'top' }),
    b(4, 0, 2, 3, '#d9cfd8', { icon: 'image' }),
    b(0, 3, 6, 2, white, { title: 'Your title', sub: 'Your subtext', effect: 'none', size: 'l', text: '#2a1230', valign: 'middle' }),
    b(0, 5, 6, 2, '#3b1f3d', { title: 'Your title', sub: 'Your subtext', type: 'signup', text: 'light' }),
    b(0, 7, 4, 3, white, { title: 'Your title', sub: 'Your subtext', effect: 'none', text: '#2a1230', valign: 'top' }), b(4, 7, 2, 3, '#d9cfd8', { icon: 'image' }),
    b(0, 10, 4, 3, white, { title: 'Your title', sub: 'Your subtext', effect: 'none', text: '#2a1230', valign: 'top' }), b(4, 10, 2, 3, '#d9cfd8', { icon: 'image' }),
    b(0, 13, 1, 1, white, { icon: 'x', effect: 'none', text: '#2a1230' }), b(1, 13, 1, 1, white, { icon: 'threads', effect: 'none', text: '#2a1230' }), b(2, 13, 1, 1, white, { icon: 'medium', effect: 'none', text: '#2a1230' }), b(3, 13, 3, 1, white, { icon: 'email', effect: 'none', text: '#2a1230' }),
  ] },
  { id: 'filmmaker', name: 'Filmmaker', blurb: 'Your photo behind, your name on it, the channels, one film, postcards by email.', preview: '/samples/filmmaker-preview.jpg', page: { bg_color: '#1f2a1f', grid_gap: 8, grid_radius: 18, font: 'playfair-display' }, blocks: [
    b(0, 8, 1, 1, white, { icon: 'instagram', effect: 'none', text: 'light' }), b(1, 8, 1, 1, white, { icon: 'tiktok', effect: 'none', text: 'light' }), b(2, 8, 1, 1, white, { icon: 'youtube', effect: 'none', text: 'light' }), b(3, 8, 1, 1, white, { icon: 'x', effect: 'none', text: 'light' }), b(4, 8, 2, 1, white, { title: 'Your title', icon: 'bag', effect: 'none', text: '#d8673f' }),
    b(0, 9, 6, 3, '#1f2a1f', { title: 'Your title', icon: 'play', type: 'video', text: 'light' }),
    b(0, 12, 6, 2, white, { title: 'Your title', sub: 'Your subtext', type: 'signup', effect: 'glass', text: 'light' }),
  ] },
];
