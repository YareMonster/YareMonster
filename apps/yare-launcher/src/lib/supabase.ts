import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { PublicEnv } from './env';

export type LauncherDatabase = {
  public: {
    Tables: {
      launcher_apps: {
        Row: LauncherApp;
        Insert: { slug: LauncherSlug; status?: AppStatus; name?: string | null; url?: string | null; note?: string | null; position?: number; id?: string };
        Update: Partial<Omit<LauncherApp, 'id' | 'owner_id' | 'created_at' | 'updated_at'>>;
        Relationships: [];
      };
      launcher_settings: {
        Row: LauncherSettings;
        Insert: { owner_id?: string; github_repo_url?: string | null; supabase_url?: string | null; supabase_publishable_key?: string | null };
        Update: Partial<Omit<LauncherSettings, 'owner_id' | 'updated_at'>>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export const launcherSlugs = ['forms', 'sign', 'pages', 'contacts', 'meet', 'transfer', 'bill', 'book', 'looks', 'analytics', 'blocks', 'canvas', 'coms', 'crypto', 'dash', 'fit', 'flash', 'fonts', 'lingo', 'persona', 'groups', 'links', 'custom'] as const;
export type LauncherSlug = (typeof launcherSlugs)[number];
export type AppStatus = 'not_set_up' | 'set_up';

/** One app in the operator's collection. Mirrors the launcher_apps migrations. (A type alias: supabase-js needs an index signature.) */
export type LauncherApp = {
  id: string;
  owner_id: string;
  slug: LauncherSlug;
  /** Set by the operator; the launcher does not check deployments. */
  status: AppStatus;
  name: string | null;
  /** Where it is deployed, once it is. */
  url: string | null;
  note: string | null;
  position: number;
  created_at: string;
  updated_at: string;
};

/** The operator's connections. */
export type LauncherSettings = {
  owner_id: string;
  github_repo_url: string | null;
  /** Optional override of the project the launcher runs on, for the setup guide. Public values only. */
  supabase_url: string | null;
  supabase_publishable_key: string | null;
  updated_at: string;
};

export type Client = SupabaseClient<LauncherDatabase>;

export function createSupabase(env: PublicEnv): Client {
  // The publishable key only grants what row-level security allows. See supabase/migrations.
  return createClient<LauncherDatabase>(env.supabaseUrl, env.supabasePublishableKey);
}
