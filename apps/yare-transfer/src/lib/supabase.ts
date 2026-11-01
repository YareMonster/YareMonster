import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { PublicEnv } from './env';

export type TransferStatus = 'draft' | 'published';

/** Mirrors supabase/migrations. Type aliases, not interfaces: supabase-js needs index signatures. */
export type Transfer = {
  id: string;
  owner_id: string;
  title: string;
  body: string;
  slug: string;
  status: TransferStatus;
  theme: string;
  logo_path: string | null;
  image_path: string | null;
  expiry_days: number;
  expires_at: string | null;
  password_hash: string | null;
  password_salt: string | null;
  button_label: string;
  opens: number;
  downloads: number;
  files_removed: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TransferFile = {
  id: string;
  transfer_id: string;
  position: number;
  name: string;
  size_bytes: number;
  content_type: string;
  storage_path: string;
  downloads: number;
  created_at: string;
};

export type Download = { id: string; transfer_id: string; file_id: string | null; created_at: string };
export type Settings = { owner_id: string; max_file_mb: number; updated_at: string };

/** What yaretransfer_open returns to a recipient: never a storage path. */
export type OpenTransfer = {
  id: string; title: string; body: string; theme: string; logo_path: string | null; image_path: string | null; button_label: string;
  expires_at: string | null; open: boolean; needs_password: boolean;
  files: Array<Pick<TransferFile, 'id' | 'name' | 'size_bytes' | 'content_type'>>;
};

type Insertable<T, Required extends keyof T, Optional extends keyof T> = Pick<T, Required> & Partial<Pick<T, Optional>>;

export type Database = {
  public: {
    Tables: {
      yaretransfer_transfers: {
        Row: Transfer;
        Insert: Insertable<Transfer, 'slug', 'id' | 'title' | 'body' | 'theme' | 'expiry_days' | 'button_label'>;
        Update: Partial<Pick<Transfer, 'title' | 'body' | 'slug' | 'status' | 'theme' | 'logo_path' | 'image_path' | 'expiry_days' | 'expires_at' | 'password_hash' | 'password_salt' | 'button_label' | 'published_at'>>;
        Relationships: [];
      };
      yaretransfer_files: {
        Row: TransferFile;
        Insert: Insertable<TransferFile, 'transfer_id' | 'name' | 'storage_path', 'id' | 'position' | 'size_bytes' | 'content_type'>;
        Update: Partial<Pick<TransferFile, 'position' | 'name'>>;
        Relationships: [];
      };
      yaretransfer_downloads: { Row: Download; Insert: never; Update: never; Relationships: [] };
      yaretransfer_settings: {
        Row: Settings;
        Insert: Insertable<Settings, never, 'owner_id' | 'max_file_mb'>;
        Update: Partial<Pick<Settings, 'max_file_mb'>>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      yaretransfer_publish: { Args: { p_id: string }; Returns: undefined };
      yaretransfer_open: { Args: { p_slug: string }; Returns: OpenTransfer };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Client = SupabaseClient<Database>;
export const BUCKET = 'yare-transfer';

export function createSupabase(env: PublicEnv): Client {
  // The publishable key only grants what row-level security and the open function allow.
  return createClient<Database>(env.supabaseUrl, env.supabasePublishableKey);
}

/** Public URL of a picture stored in the shared bucket. */
export function imageUrl(db: Client, path: string | null | undefined): string | null {
  if (!path) return null;
  return db.storage.from('yare-images').getPublicUrl(path).data.publicUrl;
}
