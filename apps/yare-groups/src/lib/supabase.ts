import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { PublicEnv } from './env';

export type Role = 'owner' | 'admin' | 'moderator' | 'member';
export type JoinMode = 'open' | 'invite' | 'closed';
export type PostPolicy = 'everyone' | 'moderators' | 'admins';

/** Mirrors supabase/migrations. Type aliases, not interfaces: supabase-js needs index signatures. */
export type Group = {
  id: string;
  one: boolean;
  name: string;
  tagline: string;
  welcome: string;
  logo_path: string | null;
  background_path: string | null;
  theme: string;
  join_mode: JoinMode;
  max_upload_mb: number;
  allow_images: boolean;
  allow_gifs: boolean;
  allow_files: boolean;
  allow_reactions: boolean;
  landing_channel_id: string | null;
  rules: string;
  rules_updated_at: string | null;
  invite_policy: 'admins' | 'moderators';
  members_edit_posts: boolean;
  members_remove_posts: boolean;
  members_edit_profile: boolean;
  created_at: string;
  updated_at: string;
};

export type Member = {
  user_id: string;
  display_name: string;
  avatar_path: string | null;
  role: Role;
  flair: string | null;
  flair_color: string | null;
  status: 'active' | 'banned';
  muted_until: string | null;
  rules_accepted_at: string | null;
  joined_at: string;
  last_seen_at: string;
};

export type Category = { id: string; name: string; position: number; created_at: string };

export type Channel = {
  id: string;
  category_id: string | null;
  name: string;
  topic: string;
  position: number;
  post_policy: PostPolicy;
  is_private: boolean;
  archived: boolean;
  last_message_at: string | null;
  created_at: string;
};

export type ChannelMember = { channel_id: string; user_id: string; added_by: string | null; added_at: string };

export type Message = {
  id: string;
  channel_id: string;
  author_id: string | null;
  body: string;
  attachment_path: string | null;
  attachment_name: string | null;
  attachment_type: string | null;
  attachment_size: number | null;
  edited_at: string | null;
  deleted_at: string | null;
  pinned_at: string | null;
  pinned_by: string | null;
  created_at: string;
};

export type Reaction = { message_id: string; user_id: string; emoji: string; created_at: string };

export type Invite = {
  id: string;
  code: string;
  created_by: string | null;
  role: 'member' | 'moderator';
  note: string;
  max_uses: number | null;
  uses: number;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

export type Read = { user_id: string; channel_id: string; last_read_at: string };

/** What yaregroups_public returns to the sign-in page. */
export type PublicGroup = Pick<Group, 'name' | 'tagline' | 'welcome' | 'logo_path' | 'background_path' | 'theme' | 'join_mode'> & { members: number };

type Insertable<T, Required extends keyof T, Optional extends keyof T> = Pick<T, Required> & Partial<Pick<T, Optional>>;

export type Database = {
  public: {
    Tables: {
      yaregroups_group: {
        Row: Group; Insert: never;
        Update: Partial<Pick<Group, 'name' | 'tagline' | 'welcome' | 'logo_path' | 'background_path' | 'theme' | 'join_mode' | 'max_upload_mb' | 'allow_images' | 'allow_gifs' | 'allow_files' | 'allow_reactions' | 'landing_channel_id' | 'rules' | 'invite_policy' | 'members_edit_posts' | 'members_remove_posts' | 'members_edit_profile'>>;
        Relationships: [];
      };
      yaregroups_members: {
        Row: Member; Insert: never;
        Update: Partial<Pick<Member, 'display_name' | 'avatar_path' | 'role' | 'flair' | 'flair_color' | 'status' | 'muted_until' | 'last_seen_at' | 'rules_accepted_at'>>;
        Relationships: [];
      };
      yaregroups_categories: {
        Row: Category; Insert: Insertable<Category, 'name', 'id' | 'position'>; Update: Partial<Pick<Category, 'name' | 'position'>>; Relationships: [];
      };
      yaregroups_channels: {
        Row: Channel;
        Insert: Insertable<Channel, 'name', 'id' | 'category_id' | 'topic' | 'position' | 'post_policy' | 'is_private'>;
        Update: Partial<Pick<Channel, 'category_id' | 'name' | 'topic' | 'position' | 'post_policy' | 'is_private' | 'archived'>>;
        Relationships: [];
      };
      yaregroups_channel_members: {
        Row: ChannelMember; Insert: Insertable<ChannelMember, 'channel_id' | 'user_id', 'added_by'>; Update: never; Relationships: [];
      };
      yaregroups_messages: {
        Row: Message;
        Insert: Insertable<Message, 'channel_id' | 'author_id', 'id' | 'body' | 'attachment_path' | 'attachment_name' | 'attachment_type' | 'attachment_size'>;
        Update: Partial<Pick<Message, 'body' | 'deleted_at' | 'pinned_at'>>;
        Relationships: [];
      };
      yaregroups_reactions: { Row: Reaction; Insert: Insertable<Reaction, 'message_id' | 'emoji', 'user_id'>; Update: never; Relationships: [] };
      yaregroups_invites: {
        Row: Invite; Insert: Insertable<Invite, never, 'role' | 'note' | 'max_uses' | 'expires_at'>; Update: Partial<Pick<Invite, 'revoked_at' | 'note'>>; Relationships: [];
      };
      yaregroups_reads: { Row: Read; Insert: Insertable<Read, 'channel_id', 'user_id' | 'last_read_at'>; Update: Partial<Pick<Read, 'last_read_at'>>; Relationships: [] };
    };
    Views: { [_ in never]: never };
    Functions: {
      yaregroups_public: { Args: Record<string, never>; Returns: PublicGroup | null };
      yaregroups_invite_peek: { Args: { p_code: string }; Returns: { valid: boolean; role: 'member' | 'moderator' } | null };
      yaregroups_enter: { Args: Record<string, never>; Returns: Member };
      yaregroups_join: { Args: { p_code: string }; Returns: Member };
      yaregroups_make_owner: { Args: { p_user: string }; Returns: undefined };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Client = SupabaseClient<Database>;
export type GroupPatch = Database['public']['Tables']['yaregroups_group']['Update'];
export type MemberPatch = Database['public']['Tables']['yaregroups_members']['Update'];
export type CategoryPatch = Database['public']['Tables']['yaregroups_categories']['Update'];
export type ChannelPatch = Database['public']['Tables']['yaregroups_channels']['Update'];
export const BUCKET = 'yare-groups';

export function createSupabase(env: PublicEnv): Client {
  // The publishable key only grants what row-level security and the functions allow.
  return createClient<Database>(env.supabaseUrl, env.supabasePublishableKey);
}

/** Public URL of a picture stored in the shared bucket. */
export function imageUrl(db: Client, path: string | null | undefined): string | null {
  if (!path) return null;
  return db.storage.from('yare-images').getPublicUrl(path).data.publicUrl;
}
