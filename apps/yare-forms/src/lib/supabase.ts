import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { PublicEnv } from './env';

export type FormStatus = 'draft' | 'published';
export type BlockType =
  | 'welcome' | 'end'
  | 'short_text' | 'long_text' | 'email' | 'number' | 'date'
  | 'multiple_choice' | 'checkboxes' | 'dropdown' | 'yes_no';

/** Type-specific settings for a block. Every key is optional; the block registry knows which apply. */
export type BlockOptions = {
  choices?: string[];
  maxLength?: number;
  placeholder?: string;
  buttonLabel?: string;
  /** Path inside the yare-images bucket: a picture for this screen. */
  imagePath?: string;
  /** Where the picture sits: beside the screen on the left or the right, half and half; or full, taking its half of the page edge to edge. Unset, a cover shows it above its title. */
  imageSide?: 'left' | 'right' | 'full-left' | 'full-right';
};

export type FormSettings = {
  showProgress?: boolean;
};

/** Mirrors supabase/migrations. Type aliases, not interfaces: supabase-js needs index signatures. */
export type Form = {
  id: string;
  owner_id: string;
  title: string;
  slug: string;
  status: FormStatus;
  theme: string;
  logo_path: string | null;
  settings: FormSettings;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Block = {
  id: string;
  form_id: string;
  position: number;
  type: BlockType;
  title: string;
  description: string;
  required: boolean;
  options: BlockOptions;
  created_at: string;
  updated_at: string;
};

export type AnswerValue = string | number | boolean | string[];

export type FormResponse = {
  id: string;
  form_id: string;
  token: string;
  status: 'started' | 'completed';
  answers: Record<string, AnswerValue>;
  last_block_id: string | null;
  started_at: string;
  completed_at: string | null;
  updated_at: string;
};

type Insertable<T, Required extends keyof T, Optional extends keyof T> = Pick<T, Required> & Partial<Pick<T, Optional>>;

export type Database = {
  public: {
    Tables: {
      yareforms_forms: {
        Row: Form;
        Insert: Insertable<Form, never, 'id' | 'title' | 'slug' | 'status' | 'theme' | 'logo_path' | 'settings'>;
        Update: Partial<Pick<Form, 'title' | 'slug' | 'status' | 'theme' | 'logo_path' | 'settings' | 'published_at'>>;
        Relationships: [];
      };
      yareforms_blocks: {
        Row: Block;
        Insert: Insertable<Block, 'form_id' | 'type', 'id' | 'position' | 'title' | 'description' | 'required' | 'options'>;
        Update: Partial<Pick<Block, 'position' | 'type' | 'title' | 'description' | 'required' | 'options'>>;
        Relationships: [];
      };
      yareforms_responses: {
        Row: FormResponse;
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      yareforms_start_response: { Args: { p_slug: string }; Returns: { response_id: string; token: string }[] };
      yareforms_save_answer: { Args: { p_response_id: string; p_token: string; p_block_id: string | null; p_value: AnswerValue | null; p_complete?: boolean }; Returns: undefined };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Client = SupabaseClient<Database>;

export function createSupabase(env: PublicEnv): Client {
  // The publishable key only grants what row-level security and the two respondent functions allow.
  return createClient<Database>(env.supabaseUrl, env.supabasePublishableKey);
}

/** Public URL of an image stored in the shared bucket. */
export function imageUrl(db: Client, path: string | null | undefined): string | null {
  if (!path) return null;
  return db.storage.from('yare-images').getPublicUrl(path).data.publicUrl;
}
