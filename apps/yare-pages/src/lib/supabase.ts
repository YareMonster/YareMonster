import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { PublicEnv } from './env';

export type SiteKind = 'new' | 'existing';
export type SiteStatus = 'building' | 'live';
export type SiteSource = 'zone' | 'beacon' | 'none';
export type SyncStatus = 'new' | 'syncing' | 'ready' | 'error';

/** Mirrors supabase/migrations. Type aliases, not interfaces: supabase-js needs index signatures. */
export type Site = {
  id: string;
  owner_id: string;
  name: string;
  url: string;
  host: string;
  kind: SiteKind;
  status: SiteStatus;
  source: SiteSource;
  zone_id: string | null;
  site_tag: string | null;
  repo_url: string;
  preview_url: string | null;
  preview_path: string | null;
  page_title: string;
  page_description: string;
  checklist: Record<string, boolean>;
  notes: string;
  position: number;
  sync_status: SyncStatus;
  sync_error: string | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Day = { site_id: string; day: string; visits: number; page_views: number; uniques: number };
export type Top = { id: string; site_id: string; kind: 'page' | 'country' | 'referrer'; label: string; visits: number; position: number };

type Insertable<T, Required extends keyof T, Optional extends keyof T> = Pick<T, Required> & Partial<Pick<T, Optional>>;

export type Database = {
  public: {
    Tables: {
      yarepages_sites: {
        Row: Site;
        Insert: Insertable<Site, 'name', 'id' | 'url' | 'host' | 'kind' | 'status' | 'repo_url' | 'position' | 'checklist' | 'notes'>;
        Update: Partial<Pick<Site, 'name' | 'url' | 'host' | 'status' | 'repo_url' | 'preview_path' | 'checklist' | 'notes' | 'position' | 'zone_id' | 'site_tag' | 'sync_status'>>;
        Relationships: [];
      };
      yarepages_days: { Row: Day; Insert: never; Update: never; Relationships: [] };
      yarepages_tops: { Row: Top; Insert: never; Update: never; Relationships: [] };
    };
    Views: { [_ in never]: never };
    Functions: {
      yarepages_set_key: { Args: { p_service: string; p_value: string }; Returns: undefined };
      yarepages_key_status: { Args: Record<string, never>; Returns: { cloudflare: boolean } };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Client = SupabaseClient<Database>;

export function createSupabase(env: PublicEnv): Client {
  // The publishable key only grants what row-level security allows: the owner's own rows.
  return createClient<Database>(env.supabaseUrl, env.supabasePublishableKey);
}

/** Public URL of a picture stored in the shared bucket. */
export function imageUrl(db: Client, path: string | null | undefined): string | null {
  if (!path) return null;
  return db.storage.from('yare-images').getPublicUrl(path).data.publicUrl;
}
