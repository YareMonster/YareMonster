/**
 * Every database, storage and function call Yare Groups makes. Row-level security decides what each
 * role may do; this file only speaks to the project.
 */
import { FunctionsHttpError } from '@supabase/supabase-js';
import type { Category, CategoryPatch, Channel, ChannelMember, ChannelPatch, Client, Group, GroupPatch, Invite, Member, MemberPatch, Message, PublicGroup, Reaction, Read } from './supabase';
import { BUCKET } from './supabase';

function fail(error: { message: string; code?: string } | null): asserts error is null {
  if (error) {
    const e = new Error(error.message) as Error & { code?: string };
    e.code = error.code;
    throw e;
  }
}

async function invoke<T>(db: Client, name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await db.functions.invoke<T>(name, { body });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const detail = await error.context.json().catch(() => null) as { error?: string } | null;
      throw new Error(detail?.error ?? 'Something went wrong.');
    }
    throw new Error(error.message);
  }
  return data as T;
}

// ---------------------------------------------------------------- the door
export async function getPublic(db: Client): Promise<PublicGroup | null> {
  const { data, error } = await db.rpc('yaregroups_public', {});
  fail(error);
  return data;
}
export async function peekInvite(db: Client, code: string): Promise<{ valid: boolean; role: 'member' | 'moderator' } | null> {
  const { data, error } = await db.rpc('yaregroups_invite_peek', { p_code: code });
  fail(error);
  return data;
}
/** Creates a member's account through the join function. Resolves with exists: true when the email already has an account. */
export async function signUpMember(db: Client, input: { email: string; password: string; display_name: string; code?: string }): Promise<{ ok?: boolean; exists?: boolean }> {
  return invoke(db, 'yaregroups-join', input);
}
export async function enter(db: Client): Promise<Member> {
  const { data, error } = await db.rpc('yaregroups_enter', {});
  fail(error);
  return data;
}
export async function joinWithCode(db: Client, code: string): Promise<Member> {
  const { data, error } = await db.rpc('yaregroups_join', { p_code: code });
  fail(error);
  return data;
}

// ---------------------------------------------------------------- the group
export async function getGroup(db: Client): Promise<Group> {
  const { data, error } = await db.from('yaregroups_group').select('*').limit(1).single();
  fail(error);
  return data;
}
export async function updateGroup(db: Client, id: string, patch: GroupPatch): Promise<Group> {
  const { data, error } = await db.from('yaregroups_group').update(patch).eq('id', id).select('*').single();
  fail(error);
  return data;
}
export async function uploadBrand(db: Client, kind: 'logo' | 'background', file: File): Promise<string> {
  const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
  const path = `yare-groups/brand/${kind}-${Date.now()}.${ext}`;
  const { error } = await db.storage.from('yare-images').upload(path, file, { upsert: true, contentType: file.type || undefined });
  fail(error);
  return path;
}
export async function uploadAvatar(db: Client, userId: string, file: File): Promise<string> {
  const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
  const path = `yare-groups/avatars/${userId}/${Date.now()}.${ext}`;
  const { error } = await db.storage.from('yare-images').upload(path, file, { upsert: true, contentType: file.type || undefined });
  fail(error);
  return path;
}
export async function removeImage(db: Client, path: string): Promise<void> {
  await db.storage.from('yare-images').remove([path]);
}

// ---------------------------------------------------------------- people
export async function listMembers(db: Client): Promise<Member[]> {
  const { data, error } = await db.from('yaregroups_members').select('*').order('display_name');
  fail(error);
  return data;
}
export async function updateMember(db: Client, userId: string, patch: MemberPatch): Promise<Member> {
  const { data, error } = await db.from('yaregroups_members').update(patch).eq('user_id', userId).select('*').single();
  fail(error);
  return data;
}
export async function acceptRules(db: Client, userId: string): Promise<Member> {
  return updateMember(db, userId, { rules_accepted_at: new Date().toISOString() });
}
export async function removeMember(db: Client, userId: string): Promise<void> {
  const { error } = await db.from('yaregroups_members').delete().eq('user_id', userId);
  fail(error);
}
export async function makeOwner(db: Client, userId: string): Promise<void> {
  const { error } = await db.rpc('yaregroups_make_owner', { p_user: userId });
  fail(error);
}

// ---------------------------------------------------------------- channels
export async function listCategories(db: Client): Promise<Category[]> {
  const { data, error } = await db.from('yaregroups_categories').select('*').order('position').order('created_at');
  fail(error);
  return data;
}
export async function createCategory(db: Client, name: string, position: number): Promise<Category> {
  const { data, error } = await db.from('yaregroups_categories').insert({ name, position }).select('*').single();
  fail(error);
  return data;
}
export async function updateCategory(db: Client, id: string, patch: CategoryPatch): Promise<Category> {
  const { data, error } = await db.from('yaregroups_categories').update(patch).eq('id', id).select('*').single();
  fail(error);
  return data;
}
export async function deleteCategory(db: Client, id: string): Promise<void> {
  const { error } = await db.from('yaregroups_categories').delete().eq('id', id);
  fail(error);
}
export async function listChannels(db: Client): Promise<Channel[]> {
  const { data, error } = await db.from('yaregroups_channels').select('*').order('position').order('created_at');
  fail(error);
  return data;
}
export async function createChannel(db: Client, input: { name: string; category_id: string | null; topic?: string; post_policy?: Channel['post_policy']; is_private?: boolean; position: number }): Promise<Channel> {
  const { data, error } = await db.from('yaregroups_channels').insert(input).select('*').single();
  fail(error);
  return data;
}
export async function updateChannel(db: Client, id: string, patch: ChannelPatch): Promise<Channel> {
  const { data, error } = await db.from('yaregroups_channels').update(patch).eq('id', id).select('*').single();
  fail(error);
  return data;
}
export async function deleteChannel(db: Client, id: string): Promise<void> {
  const { error } = await db.from('yaregroups_channels').delete().eq('id', id);
  fail(error);
}
export async function listChannelMembers(db: Client, channelId: string): Promise<ChannelMember[]> {
  const { data, error } = await db.from('yaregroups_channel_members').select('*').eq('channel_id', channelId);
  fail(error);
  return data;
}
export async function setChannelMembers(db: Client, channelId: string, userIds: string[]): Promise<void> {
  const current = (await listChannelMembers(db, channelId)).map((m) => m.user_id);
  const add = userIds.filter((u) => !current.includes(u));
  const drop = current.filter((u) => !userIds.includes(u));
  if (add.length) { const { error } = await db.from('yaregroups_channel_members').insert(add.map((user_id) => ({ channel_id: channelId, user_id }))); fail(error); }
  if (drop.length) { const { error } = await db.from('yaregroups_channel_members').delete().eq('channel_id', channelId).in('user_id', drop); fail(error); }
}

// ---------------------------------------------------------------- posts
export const PAGE = 50;
/** The latest posts of a channel, oldest first; pass the oldest you have to get the page before it. */
export async function listMessages(db: Client, channelId: string, before?: string): Promise<Message[]> {
  let q = db.from('yaregroups_messages').select('*').eq('channel_id', channelId).is('deleted_at', null).order('created_at', { ascending: false }).limit(PAGE);
  if (before) q = q.lt('created_at', before);
  const { data, error } = await q;
  fail(error);
  return data.reverse();
}
export async function listPinned(db: Client, channelId: string): Promise<Message[]> {
  const { data, error } = await db.from('yaregroups_messages').select('*').eq('channel_id', channelId).is('deleted_at', null).not('pinned_at', 'is', null).order('pinned_at', { ascending: false }).limit(50);
  fail(error);
  return data;
}
export async function uploadAttachment(db: Client, channelId: string, file: File): Promise<{ path: string; name: string; type: string; size: number }> {
  const safe = file.name.replace(/[^\w.\-() ]+/g, '_').slice(-120);
  const path = `channels/${channelId}/${crypto.randomUUID()}-${safe}`;
  const { error } = await db.storage.from(BUCKET).upload(path, file, { contentType: file.type || 'application/octet-stream' });
  if (error) throw new Error(/exceeded|too large|size/i.test(error.message) ? 'That file is over the limit.' : error.message);
  return { path, name: file.name, type: file.type || 'application/octet-stream', size: file.size };
}
export async function sendMessage(db: Client, input: { channel_id: string; author_id: string; body: string; attachment?: { path: string; name: string; type: string; size: number } }): Promise<Message> {
  const row = { channel_id: input.channel_id, author_id: input.author_id, body: input.body, attachment_path: input.attachment?.path ?? null, attachment_name: input.attachment?.name ?? null, attachment_type: input.attachment?.type ?? null, attachment_size: input.attachment?.size ?? null };
  const { data, error } = await db.from('yaregroups_messages').insert(row).select('*').single();
  if (error && input.attachment) await db.storage.from(BUCKET).remove([input.attachment.path]);
  fail(error);
  return data;
}
export async function editMessage(db: Client, id: string, body: string): Promise<Message> {
  const { data, error } = await db.from('yaregroups_messages').update({ body }).eq('id', id).select('*').single();
  fail(error);
  return data;
}
export async function removeMessage(db: Client, m: Message): Promise<void> {
  const { error } = await db.from('yaregroups_messages').update({ deleted_at: new Date().toISOString() }).eq('id', m.id);
  fail(error);
  if (m.attachment_path) await db.storage.from(BUCKET).remove([m.attachment_path]);
}
export async function pinMessage(db: Client, id: string, pinned: boolean): Promise<Message> {
  const { data, error } = await db.from('yaregroups_messages').update({ pinned_at: pinned ? new Date().toISOString() : null }).eq('id', id).select('*').single();
  fail(error);
  return data;
}
/** Short-lived addresses for the pictures and files of the posts on screen. */
export async function signedUrls(db: Client, paths: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!paths.length) return out;
  const { data, error } = await db.storage.from(BUCKET).createSignedUrls(paths, 3600);
  fail(error);
  for (const s of data) if (s.path && s.signedUrl) out.set(s.path, s.signedUrl);
  return out;
}

// ---------------------------------------------------------------- reactions
export async function listReactions(db: Client, messageIds: string[]): Promise<Reaction[]> {
  if (!messageIds.length) return [];
  const { data, error } = await db.from('yaregroups_reactions').select('*').in('message_id', messageIds);
  fail(error);
  return data;
}
export async function addReaction(db: Client, messageId: string, emoji: string): Promise<void> {
  const { error } = await db.from('yaregroups_reactions').insert({ message_id: messageId, emoji });
  if (error && error.code !== '23505') fail(error);
}
export async function removeReaction(db: Client, messageId: string, userId: string, emoji: string): Promise<void> {
  const { error } = await db.from('yaregroups_reactions').delete().eq('message_id', messageId).eq('user_id', userId).eq('emoji', emoji);
  fail(error);
}

// ---------------------------------------------------------------- read marks
export async function listReads(db: Client): Promise<Read[]> {
  const { data, error } = await db.from('yaregroups_reads').select('*');
  fail(error);
  return data;
}
export async function markRead(db: Client, userId: string, channelId: string): Promise<void> {
  const { error } = await db.from('yaregroups_reads').upsert({ user_id: userId, channel_id: channelId, last_read_at: new Date().toISOString() }, { onConflict: 'user_id,channel_id' });
  fail(error);
}

// ---------------------------------------------------------------- invites
export async function listInvites(db: Client): Promise<Invite[]> {
  const { data, error } = await db.from('yaregroups_invites').select('*').order('created_at', { ascending: false });
  fail(error);
  return data;
}
export async function createInvite(db: Client, input: { role: Invite['role']; note: string; max_uses: number | null; expires_at: string | null }): Promise<Invite> {
  const { data, error } = await db.from('yaregroups_invites').insert(input).select('*').single();
  fail(error);
  return data;
}
export async function revokeInvite(db: Client, id: string): Promise<Invite> {
  const { data, error } = await db.from('yaregroups_invites').update({ revoked_at: new Date().toISOString() }).eq('id', id).select('*').single();
  fail(error);
  return data;
}

// ---------------------------------------------------------------- figures for the admin home
export async function countMessagesSince(db: Client, iso: string): Promise<number> {
  const { count, error } = await db.from('yaregroups_messages').select('id', { count: 'exact', head: true }).is('deleted_at', null).gte('created_at', iso);
  fail(error);
  return count ?? 0;
}
export async function countMessages(db: Client): Promise<number> {
  const { count, error } = await db.from('yaregroups_messages').select('id', { count: 'exact', head: true }).is('deleted_at', null);
  fail(error);
  return count ?? 0;
}
