import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { PublicEnv } from './env';

export type EnvelopeStatus = 'draft' | 'sent' | 'completed' | 'voided';
export type ParticipantRole = 'signer' | 'viewer';
export type ParticipantStatus = 'pending' | 'sent' | 'viewed' | 'signed';
export type FieldType = 'signature' | 'name' | 'date' | 'text';
export type EventType = 'created' | 'sent' | 'emailed' | 'viewed' | 'signed' | 'completed' | 'voided' | 'email_failed';

export type EnvelopeSettings = Record<string, never>;

/** Mirrors supabase/migrations. Type aliases, not interfaces: supabase-js needs index signatures. */
export type Envelope = {
  id: string;
  owner_id: string;
  title: string;
  status: EnvelopeStatus;
  ordered: boolean;
  message: string;
  settings: EnvelopeSettings;
  sent_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PageSize = { w: number; h: number };

export type Document = {
  id: string;
  envelope_id: string;
  position: number;
  name: string;
  storage_path: string;
  page_count: number;
  page_sizes: PageSize[];
  size_bytes: number;
  created_at: string;
};

export type Participant = {
  id: string;
  envelope_id: string;
  position: number;
  role: ParticipantRole;
  first_name: string;
  last_name: string;
  email: string;
  company: string;
  job_title: string;
  token: string;
  status: ParticipantStatus;
  typed_name: string;
  sent_at: string | null;
  viewed_at: string | null;
  signed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Field = {
  id: string;
  envelope_id: string;
  document_id: string;
  participant_id: string;
  page: number;
  type: FieldType;
  x: number;
  y: number;
  w: number;
  h: number;
  required: boolean;
  label: string;
  value: string | null;
  created_at: string;
  updated_at: string;
};

export type SignEvent = {
  id: string;
  envelope_id: string;
  participant_id: string | null;
  type: EventType;
  detail: Record<string, unknown>;
  created_at: string;
};

export type Settings = {
  owner_id: string;
  from_email: string;
  sender_name: string;
  app_url: string;
  updated_at: string;
};

/** What yaresign_open returns to a participant: the envelope without anyone else's email. */
export type SigningPacket = {
  envelope: { id: string; title: string; status: EnvelopeStatus; ordered: boolean; message: string; sent_at: string | null; completed_at: string | null; sender: string };
  me: { id: string; role: ParticipantRole; first_name: string; last_name: string; email: string; status: ParticipantStatus; position: number; typed_name: string; signed_at: string | null; can_sign: boolean };
  documents: Array<Pick<Document, 'id' | 'name' | 'page_count' | 'page_sizes' | 'position'>>;
  participants: Array<Pick<Participant, 'id' | 'role' | 'first_name' | 'last_name' | 'status' | 'position' | 'signed_at'>>;
  fields: Array<Pick<Field, 'id' | 'document_id' | 'participant_id' | 'page' | 'type' | 'x' | 'y' | 'w' | 'h' | 'required' | 'label' | 'value'>>;
};

type Insertable<T, Required extends keyof T, Optional extends keyof T> = Pick<T, Required> & Partial<Pick<T, Optional>>;

export type Database = {
  public: {
    Tables: {
      yaresign_envelopes: {
        Row: Envelope;
        Insert: Insertable<Envelope, never, 'id' | 'title' | 'ordered' | 'message' | 'settings'>;
        Update: Partial<Pick<Envelope, 'title' | 'ordered' | 'message' | 'settings' | 'status'>>;
        Relationships: [];
      };
      yaresign_documents: {
        Row: Document;
        Insert: Insertable<Document, 'envelope_id' | 'name' | 'storage_path' | 'page_count', 'id' | 'position' | 'page_sizes' | 'size_bytes'>;
        Update: Partial<Pick<Document, 'position' | 'name'>>;
        Relationships: [];
      };
      yaresign_participants: {
        Row: Participant;
        Insert: Insertable<Participant, 'envelope_id', 'id' | 'position' | 'role' | 'first_name' | 'last_name' | 'email' | 'company' | 'job_title'>;
        Update: Partial<Pick<Participant, 'position' | 'role' | 'first_name' | 'last_name' | 'email' | 'company' | 'job_title' | 'status' | 'sent_at'>>;
        Relationships: [];
      };
      yaresign_fields: {
        Row: Field;
        Insert: Insertable<Field, 'envelope_id' | 'document_id' | 'participant_id' | 'page' | 'type' | 'x' | 'y' | 'w' | 'h', 'id' | 'required' | 'label'>;
        Update: Partial<Pick<Field, 'participant_id' | 'page' | 'type' | 'x' | 'y' | 'w' | 'h' | 'required' | 'label'>>;
        Relationships: [];
      };
      yaresign_events: {
        Row: SignEvent;
        Insert: Insertable<SignEvent, 'envelope_id' | 'type', 'id' | 'participant_id' | 'detail'>;
        Update: never;
        Relationships: [];
      };
      yaresign_settings: {
        Row: Settings;
        Insert: Insertable<Settings, never, 'owner_id' | 'from_email' | 'sender_name' | 'app_url'>;
        Update: Partial<Pick<Settings, 'from_email' | 'sender_name' | 'app_url'>>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      yaresign_publish: { Args: { p_envelope_id: string }; Returns: undefined };
      yaresign_open: { Args: { p_token: string }; Returns: SigningPacket };
      yaresign_sign: { Args: { p_token: string; p_values: Record<string, string>; p_typed_name: string }; Returns: { completed: boolean } };
      yaresign_turn: { Args: { p_participant_id: string }; Returns: boolean };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Client = SupabaseClient<Database>;

export function createSupabase(env: PublicEnv): Client {
  // The publishable key only grants what row-level security and the signer functions allow.
  return createClient<Database>(env.supabaseUrl, env.supabasePublishableKey);
}

export const BUCKET = 'yare-sign';
