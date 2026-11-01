import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button, Drawer, toast } from '@heroui/react';
import { GearIcon, LinkIcon, ScrollIcon } from '@phosphor-icons/react';
import { AppShell, PoweredByYare, type NavSection } from '../yare';
import { roleLabel, useGroup } from '../features/GroupContext';
import type { Channel } from '../lib/supabase';
import { imageUrl } from '../lib/supabase';
import { useGroupIdentity } from '../lib/identity';
import { applyGroupTheme, groupThemeById } from '../lib/themes';
import { identity } from '../manage/ManageShell';
import { ChannelIcon } from './ChannelIcon';
import { ChannelPane } from './ChannelPane';
import { MemberPane } from './MemberPane';
import { ProfileDialog } from './ProfileDialog';
import { RulesDialog } from './RulesDialog';
import { InviteDialog, inviteUrl } from '../manage/InvitesPage';
import './group.css';

/**
 * The group itself, in the shell every Yare Monster app uses: the channels are the sidebar, the
 * channel is the page, the people sit in a card on the right. The group's theme recolours the shell.
 */
export function GroupView() {
  const { db, group, channels, categories, me, isStaff, canInvite, setRulesOpen, unread, signOut } = useGroup();
  const { name } = useParams();
  const navigate = useNavigate();
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const channel = channels?.find((c) => c.name === name) ?? null;
  const theme = groupThemeById(group.theme);

  useEffect(() => applyGroupTheme(theme), [theme]);

  useEffect(() => {
    if (!channels || name) return;
    // The landing channel the admins chose, or the first open one.
    const first = channels.find((c) => c.id === group.landing_channel_id && !c.archived) ?? channels.find((c) => !c.archived) ?? channels[0];
    if (first) navigate(`/c/${first.name}`, { replace: true });
  }, [channels, name, navigate, group.landing_channel_id]);

  const nav = useMemo<NavSection[]>(() => {
    const cats = categories ?? [];
    const live = (channels ?? []).filter((c) => !c.archived);
    const item = (c: Channel) => ({ id: c.id, label: c.name, icon: <ChannelIcon channel={c} />, isActive: c.id === channel?.id, onPress: () => navigate(`/c/${c.name}`), badge: c.id !== channel?.id && unread(c) ? <span className="yg-unread" aria-label="New posts" /> : undefined });
    const loose = live.filter((c) => !c.category_id || !cats.some((x) => x.id === c.category_id));
    const extras = group.rules.trim() ? [{ id: 'rules', label: 'Rules', icon: <ScrollIcon />, onPress: () => setRulesOpen(true) }] : [];
    return [
      ...(extras.length || loose.length ? [{ id: 'loose', items: [...extras, ...loose.map(item)] }] : []),
      ...cats.map((cat) => ({ id: cat.id, label: cat.name, items: live.filter((c) => c.category_id === cat.id).map(item) })).filter((s) => s.items.length),
    ];
  }, [categories, channels, channel?.id, unread, navigate, group.rules, setRulesOpen]);

  const logo = imageUrl(db, group.logo_path);
  useGroupIdentity(group.name, logo);
  // The group shows its own logo, or its name. The Yare Groups lockup belongs to the admin pages.
  const brand = <span className="yare-brand">{logo ? <img className="yare-brand__img" src={logo} alt={group.name} /> : <span className="yare-brand__name">{group.name}</span>}</span>;

  return (
    <AppShell
      app={identity}
      brand={brand}
      primaryAction={isStaff
        ? <Button variant="primary" fullWidth onPress={() => navigate('/manage')}><GearIcon weight="bold" /> Manage the group</Button>
        : canInvite ? <Button variant="primary" fullWidth onPress={() => setInviting(true)}><LinkIcon weight="bold" /> Invite people</Button> : undefined}
      nav={nav}
      user={{ name: me.display_name, detail: roleLabel[me.role], avatarUrl: imageUrl(db, me.avatar_path) ?? undefined }}
      onSignOut={signOut}
      onSettings={() => setProfileOpen(true)}
    >
      <div className="yg-layout">
        <section className="yg-room" aria-label={channel ? `#${channel.name}` : 'Channels'}>
          {channels === null ? <RoomSkeleton /> : channel ? <ChannelPane channel={channel} onPeople={() => setPeopleOpen(true)} /> : <Empty text={channels.length === 0 ? 'No channels yet. An admin creates them under Manage.' : name ? 'That channel is not here.' : ''} />}
          <PoweredByYare className="yg-powered yg-powered--narrow" />
        </section>
        <aside className="yg-people-col" aria-label="Members">
          <MemberPane />
          <PoweredByYare className="yg-powered" />
        </aside>
      </div>
      <Drawer isOpen={peopleOpen} onOpenChange={setPeopleOpen}>
        <Drawer.Backdrop>
          <Drawer.Content placement="right">
            <Drawer.Dialog aria-label="Members" className="h-full w-72 max-w-[85vw] p-0">
              <MemberPane />
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>
      <ProfileDialog isOpen={profileOpen} onOpenChange={setProfileOpen} />
      <RulesDialog />
      {inviting && <InviteDialog onClose={() => setInviting(false)} onCreated={(i) => { void navigator.clipboard.writeText(inviteUrl(i.code)).then(() => toast.success('Invite link copied'), () => toast.success(`Invite link: ${inviteUrl(i.code)}`)); }} />}
    </AppShell>
  );
}

function RoomSkeleton() {
  return (
    <div className="flex h-full flex-col" aria-busy="true" aria-label="Loading">
      <div className="yg-room__head"><div className="yg-skel h-5 w-32" /></div>
      <div className="flex flex-1 flex-col justify-end gap-4 p-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="grid grid-cols-[2.5rem_1fr] gap-3">
            <div className="yg-skel h-10 w-10 rounded-full" />
            <div className="flex flex-col gap-2"><div className="yg-skel h-4 w-40" /><div className="yg-skel h-4" style={{ width: `${55 + (i * 17) % 40}%` }} /></div>
          </div>
        ))}
      </div>
      <div className="px-4 pb-3"><div className="yg-skel h-12" /></div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="grid flex-1 place-items-center p-6 text-center text-sm text-muted">{text}</div>;
}
