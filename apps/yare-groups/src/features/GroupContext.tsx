import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Category, Channel, Client, Group, Member } from '../lib/supabase';
import { getGroup, listCategories, listChannels, listMembers, listReads, markRead as apiMarkRead } from '../lib/groups-api';

export type PostCheck = { ok: true } | { ok: false; reason: string };

export interface GroupCtx {
  db: Client;
  userId: string;
  email: string;
  group: Group;
  setGroup: (g: Group) => void;
  me: Member;
  setMe: (m: Member) => void;
  /** Null while loading. */
  members: Member[] | null;
  categories: Category[] | null;
  channels: Channel[] | null;
  memberById: Map<string, Member>;
  /** User ids with the app open right now. */
  online: Set<string>;
  isStaff: boolean;
  isMod: boolean;
  /** The group has rules this person has not accepted yet. */
  needsRules: boolean;
  rulesOpen: boolean;
  setRulesOpen: (open: boolean) => void;
  canInvite: boolean;
  /** Edit and remove one's own posts, change one's own name and picture. */
  canEditOwn: boolean;
  canRemoveOwn: boolean;
  canEditProfile: boolean;
  canPost: (c: Channel) => PostCheck;
  unread: (c: Channel) => boolean;
  markRead: (channelId: string) => void;
  refreshGroup: () => Promise<void>;
  refreshMembers: () => Promise<void>;
  refreshChannels: () => Promise<void>;
  signOut: () => void;
}

const Ctx = createContext<GroupCtx | null>(null);

interface Props { db: Client; userId: string; email: string; me: Member; group: Group; onSignOut: () => void; children: ReactNode }

/** Everything the group view and the admin pages share, kept live through Realtime. */
export function GroupProvider({ db, userId, email, me: initialMe, group: initialGroup, onSignOut, children }: Props) {
  const [group, setGroup] = useState(initialGroup);
  const [me, setMe] = useState(initialMe);
  const [members, setMembers] = useState<Member[] | null>(null);
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [channels, setChannels] = useState<Channel[] | null>(null);
  const [reads, setReads] = useState<Record<string, string>>({});
  const [online, setOnline] = useState<Set<string>>(() => new Set([userId]));
  const [rulesOpen, setRulesOpen] = useState(false);

  const refreshGroup = useCallback(async () => { try { setGroup(await getGroup(db)); } catch { /* keep what we have */ } }, [db]);
  const refreshMembers = useCallback(async () => {
    try {
      const list = await listMembers(db);
      setMembers(list);
      const mine = list.find((m) => m.user_id === userId);
      if (mine) setMe(mine);
    } catch { /* keep what we have */ }
  }, [db, userId]);
  const refreshChannels = useCallback(async () => {
    try {
      const [cats, chans] = await Promise.all([listCategories(db), listChannels(db)]);
      setCategories(cats); setChannels(chans);
    } catch { /* keep what we have */ }
  }, [db]);

  useEffect(() => { void refreshMembers(); void refreshChannels(); }, [refreshMembers, refreshChannels]);
  useEffect(() => { listReads(db).then((rs) => setReads(Object.fromEntries(rs.map((r) => [r.channel_id, r.last_read_at])))).catch(() => undefined); }, [db]);
  useEffect(() => { document.title = `${group.name} · Yare Groups`; }, [group.name]);

  // One live channel for the things everybody sees: the group, the people, the channels.
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  useEffect(() => {
    const later = (key: string, fn: () => void) => { clearTimeout(timers.current[key]); timers.current[key] = setTimeout(fn, 150); };
    const ch = db.channel('yaregroups:meta')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'yaregroups_group' }, () => later('group', () => void refreshGroup()))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'yaregroups_members' }, () => later('members', () => void refreshMembers()))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'yaregroups_channels' }, () => later('channels', () => void refreshChannels()))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'yaregroups_categories' }, () => later('channels', () => void refreshChannels()))
      .subscribe();
    const presence = db.channel('yaregroups:presence', { config: { presence: { key: userId } } });
    presence.on('presence', { event: 'sync' }, () => setOnline(new Set(Object.keys(presence.presenceState()))));
    presence.subscribe((status) => { if (status === 'SUBSCRIBED') void presence.track({ at: Date.now() }); });
    const t = timers.current;
    return () => { Object.values(t).forEach(clearTimeout); void db.removeChannel(ch); void db.removeChannel(presence); };
  }, [db, userId, refreshGroup, refreshMembers, refreshChannels]);

  const memberById = useMemo(() => new Map((members ?? []).map((m) => [m.user_id, m])), [members]);
  const isStaff = me.role === 'owner' || me.role === 'admin';
  const isMod = isStaff || me.role === 'moderator';
  const needsRules = !isStaff && group.rules.trim() !== '' && (!me.rules_accepted_at || me.rules_accepted_at < (group.rules_updated_at ?? group.created_at));
  const canInvite = isStaff || (me.role === 'moderator' && group.invite_policy === 'moderators');
  const canEditOwn = isMod || group.members_edit_posts;
  const canRemoveOwn = isMod || group.members_remove_posts;
  const canEditProfile = isMod || group.members_edit_profile;

  const canPost = useCallback((c: Channel): PostCheck => {
    if (c.archived) return { ok: false, reason: 'This channel is closed.' };
    if (needsRules) return { ok: false, reason: 'Accept the group rules to post.' };
    if (me.muted_until && new Date(me.muted_until).getTime() > Date.now()) return { ok: false, reason: `You are muted until ${new Date(me.muted_until).toLocaleString()}.` };
    if (c.post_policy === 'admins' && !isStaff) return { ok: false, reason: 'Only admins post here.' };
    if (c.post_policy === 'moderators' && !isMod) return { ok: false, reason: 'Only moderators and admins post here.' };
    return { ok: true };
  }, [me.muted_until, isStaff, isMod, needsRules]);

  const unread = useCallback((c: Channel) => !!c.last_message_at && (!reads[c.id] || reads[c.id]! < c.last_message_at), [reads]);
  const markRead = useCallback((channelId: string) => {
    const now = new Date().toISOString();
    setReads((r) => ({ ...r, [channelId]: now }));
    void apiMarkRead(db, userId, channelId).catch(() => undefined);
  }, [db, userId]);

  const value = useMemo<GroupCtx>(() => ({ db, userId, email, group, setGroup, me, setMe, members, categories, channels, memberById, online, isStaff, isMod, needsRules, rulesOpen, setRulesOpen, canInvite, canEditOwn, canRemoveOwn, canEditProfile, canPost, unread, markRead, refreshGroup, refreshMembers, refreshChannels, signOut: onSignOut }),
    [db, userId, email, group, me, members, categories, channels, memberById, online, isStaff, isMod, needsRules, rulesOpen, canInvite, canEditOwn, canRemoveOwn, canEditProfile, canPost, unread, markRead, refreshGroup, refreshMembers, refreshChannels, onSignOut]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGroup(): GroupCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useGroup needs GroupProvider');
  return ctx;
}

export const roleLabel: Record<Member['role'], string> = { owner: 'Owner', admin: 'Admin', moderator: 'Moderator', member: 'Member' };
