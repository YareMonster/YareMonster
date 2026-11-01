import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { PublicEnv } from './env';

/**
 * Table types for Yare Persona. Empty until the app's schema exists; add tables here as migrations
 * create them, prefixed yarepersona_ (see docs/SUPABASE.md at the repository root).
 */
export type Database = {
  public: {
    Tables: { [_ in never]: never };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Client = SupabaseClient<Database>;

export function createSupabase(env: PublicEnv): Client {
  // The publishable key only grants what row-level security allows.
  return createClient<Database>(env.supabaseUrl, env.supabasePublishableKey);
}
