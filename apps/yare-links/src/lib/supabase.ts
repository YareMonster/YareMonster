import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { PublicEnv } from './env';

export type PageStatus = 'draft' | 'published';
export type BlockType = 'link' | 'text' | 'image' | 'youtube' | 'spotify' | 'soundcloud' | 'video' | 'form' | 'signup' | 'contact' | 'map' | 'header' | 'embed' | 'product' | 'youtube_feed' | 'substack_feed' | 'qr' | 'giphy' | 'podcast_feed';
export type Effect = 'fill' | 'none' | 'glass';
export type TextSize = 's' | 'm' | 'l' | 'xl';
export type TextAlign = 'left' | 'center' | 'right';
/** auto, light, dark, or a hex colour like #ffe91a. */
export type TextColor = 'auto' | 'light' | 'dark' | (string & {});
export type Highlight = 'none' | 'shake' | 'pulse';
export type LockKind = 'none' | 'code' | 'age';
export type Social = { network: string; url: string };

/** Type-specific block settings. */
export type BlockOptions = {
  /** Video block: path inside the yare-links bucket. */
  videoPath?: string;
  /** A link to an MP4 or WebM that plays muted behind the block. */
  bgVideo?: string;
  /** Form and sign-up: the button's words. */
  buttonLabel?: string;
  /** Form: which fields to ask for. */
  fields?: Array<'name' | 'email' | 'phone' | 'message'>;
  /** Contact card. */
  contact?: { name?: string; phone?: string; email?: string; company?: string; website?: string };
  /** Map: the place to show. */
  place?: string;
};

/** Mirrors supabase/migrations. Type aliases, not interfaces: supabase-js needs index signatures. */
export type Page = {
  id: string;
  owner_id: string;
  title: string;
  bio: string;
  slug: string;
  status: PageStatus;
  theme: string;
  avatar_path: string | null;
  logo_path: string | null;
  wallpaper_path: string | null;
  wallpaper_kind: 'none' | 'image' | 'video';
  layout: 'classic' | 'hero';
  button_shape: 'rounded' | 'pill' | 'square';
  button_fill: 'solid' | 'outline' | 'soft';
  /** The id of a font from the app's set. */
  font: string;
  /** Space between the grid and the edges of the screen. Off, blocks touch the edges. */
  grid_pad: boolean;
  socials: Social[];
  socials_position: 'top' | 'bottom';
  seo_title: string;
  seo_description: string;
  share_image_path: string | null;
  /** The page's own icon in the tab and on a home screen. */
  icon_path: string | null;
  /** Whether search engines may list the page. */
  seo_index: boolean;
  /** What the page stands for, for structured data. */
  schema_kind: 'person' | 'organization';
  redirect_block_id: string | null;
  redirect_until: string | null;
  grid_gap: number;
  grid_radius: number;
  bg_color: string;
  views: number;
  clicks: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Block = {
  id: string;
  page_id: string;
  position: number;
  type: BlockType;
  title: string;
  url: string;
  description: string;
  thumbnail_path: string | null;
  options: BlockOptions;
  featured: boolean;
  highlight: Highlight;
  starts_at: string | null;
  ends_at: string | null;
  archived: boolean;
  lock_kind: LockKind;
  lock_hash: string | null;
  lock_salt: string | null;
  min_age: number | null;
  /** Place and size on the grid, in cells. */
  x: number;
  y: number;
  w: number;
  h: number;
  icon: string;
  bg_color: string;
  bg_path: string | null;
  text_color: TextColor;
  /** A thin line around the block. */
  border: boolean;
  /** Fill paints the colour; none leaves the block open with a line in it; glass frosts it. */
  effect: Effect;
  /** The id of a font from the app's set, or empty for the page's. */
  font: string;
  /** Product: the price, written as the person wants it. */
  price: string;
  text_size: TextSize;
  /** The subtext's size, on its own. */
  sub_size: 's' | 'm' | 'l';
  text_align: TextAlign;
  /** Where the words sit: at the top with the icon, in the middle, or at the bottom. */
  text_valign: 'top' | 'middle' | 'bottom';
  /** At the edge of the grid, run over the page's edge space and touch the screen. */
  bleed: boolean;
  /** How big the icon is. */
  icon_size: 's' | 'm' | 'l';
  /** The block's own corners in px, or null for the page's. */
  radius: number | null;
  clicks: number;
  created_at: string;
  updated_at: string;
};

export type Event = { id: string; page_id: string; block_id: string | null; kind: 'view' | 'click'; ref_host: string | null; country: string | null; device: string | null; created_at: string };
export type Entry = { id: string; page_id: string; block_id: string | null; kind: 'form' | 'signup'; data: Record<string, string>; created_at: string };

/** What a visitor gets from yarelinks_open. A code-locked block comes without its address. */
export type PublicBlock = Pick<Block, 'id' | 'type' | 'title' | 'description' | 'thumbnail_path' | 'featured' | 'highlight' | 'lock_kind' | 'min_age' | 'url' | 'options' | 'x' | 'y' | 'w' | 'h' | 'icon' | 'bg_color' | 'bg_path' | 'text_color' | 'border' | 'text_size' | 'text_align' | 'effect' | 'font' | 'price' | 'sub_size' | 'text_valign' | 'bleed' | 'icon_size' | 'radius'>;
export type PublicPage = Pick<Page, 'id' | 'title' | 'bio' | 'theme' | 'avatar_path' | 'logo_path' | 'wallpaper_path' | 'wallpaper_kind' | 'layout' | 'button_shape' | 'button_fill' | 'font' | 'socials' | 'socials_position' | 'seo_title' | 'seo_description' | 'share_image_path' | 'icon_path' | 'seo_index' | 'schema_kind' | 'grid_gap' | 'grid_radius' | 'bg_color' | 'grid_pad'> & { redirect_url: string | null; blocks: PublicBlock[] };

type Insertable<T, Required extends keyof T, Optional extends keyof T> = Pick<T, Required> & Partial<Pick<T, Optional>>;

export type PagePatch = Partial<Pick<Page, 'title' | 'bio' | 'slug' | 'status' | 'theme' | 'avatar_path' | 'logo_path' | 'wallpaper_path' | 'wallpaper_kind' | 'layout' | 'button_shape' | 'button_fill' | 'font' | 'socials' | 'socials_position' | 'seo_title' | 'seo_description' | 'share_image_path' | 'icon_path' | 'seo_index' | 'schema_kind' | 'redirect_block_id' | 'redirect_until' | 'published_at' | 'grid_gap' | 'grid_radius' | 'bg_color' | 'grid_pad'>>;
export type BlockPatch = Partial<Pick<Block, 'type' | 'position' | 'title' | 'url' | 'description' | 'thumbnail_path' | 'options' | 'featured' | 'highlight' | 'starts_at' | 'ends_at' | 'archived' | 'lock_kind' | 'lock_hash' | 'lock_salt' | 'min_age' | 'x' | 'y' | 'w' | 'h' | 'icon' | 'bg_color' | 'bg_path' | 'text_color' | 'border' | 'text_size' | 'text_align' | 'effect' | 'font' | 'price' | 'sub_size' | 'text_valign' | 'bleed' | 'icon_size' | 'radius'>>;

export type Database = {
  public: {
    Tables: {
      yarelinks_pages: { Row: Page; Insert: Insertable<Page, 'slug', 'id' | 'title' | 'bio' | 'theme'>; Update: PagePatch; Relationships: [] };
      yarelinks_blocks: { Row: Block; Insert: Insertable<Block, 'page_id' | 'type', 'id' | 'position' | 'title' | 'url' | 'description' | 'options' | 'x' | 'y' | 'w' | 'h' | 'icon' | 'bg_color' | 'bg_path' | 'text_color' | 'border' | 'text_size' | 'text_align' | 'effect' | 'font' | 'price' | 'sub_size' | 'text_valign' | 'bleed' | 'icon_size' | 'radius'>; Update: BlockPatch; Relationships: [] };
      yarelinks_events: { Row: Event; Insert: never; Update: never; Relationships: [] };
      yarelinks_entries: { Row: Entry; Insert: never; Update: never; Relationships: [] };
    };
    Views: { [_ in never]: never };
    Functions: {
      yarelinks_open: { Args: { p_slug: string }; Returns: PublicPage };
      yarelinks_track: { Args: { p_page_id: string; p_block_id: string | null; p_kind: 'view' | 'click'; p_ref: string | null; p_country: string | null; p_device: string | null }; Returns: undefined };
      yarelinks_unlock: { Args: { p_block_id: string; p_code: string }; Returns: { url: string; options: BlockOptions } };
      yarelinks_submit: { Args: { p_block_id: string; p_data: Record<string, string> }; Returns: undefined };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Client = SupabaseClient<Database>;
export const MEDIA_BUCKET = 'yare-links';

export function createSupabase(env: PublicEnv): Client {
  // The publishable key only grants what row-level security and the public functions allow.
  return createClient<Database>(env.supabaseUrl, env.supabasePublishableKey);
}

/** Public URL of a picture in the shared bucket. */
export function imageUrl(db: Client, path: string | null | undefined): string | null {
  if (!path) return null;
  return db.storage.from('yare-images').getPublicUrl(path).data.publicUrl;
}
/** Public URL of a wallpaper or video in the app's own bucket. */
export function mediaUrl(db: Client, path: string | null | undefined): string | null {
  if (!path) return null;
  return db.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
}
