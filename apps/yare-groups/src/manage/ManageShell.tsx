import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Button } from '@heroui/react';
import { ArrowLeftIcon, HashIcon, HouseIcon, LinkIcon, PaintBrushIcon, PlugsConnectedIcon, SlidersHorizontalIcon, UsersThreeIcon } from '@phosphor-icons/react';
import { AppShell, PageHeader, yareApp, type NavSection } from '../yare';
import { useGroup } from '../features/GroupContext';

export const identity = yareApp('groups');

/** The admin side wears the shell every Yare Monster app wears. The group itself is one click away. */
export function ManageShell({ crumb, actions, children }: { crumb: string; actions?: ReactNode; children: ReactNode }) {
  const { group, me, email, signOut } = useGroup();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const item = (id: string, label: string, icon: ReactNode, path: string) => ({ id, label, icon, isActive: path === '/manage' ? pathname === path : pathname.startsWith(path), onPress: () => navigate(path) });
  const nav: NavSection[] = [{ id: 'main', items: [
    item('home', 'Home', <HouseIcon />, '/manage'),
    item('channels', 'Channels', <HashIcon />, '/manage/channels'),
    item('members', 'Members', <UsersThreeIcon />, '/manage/members'),
    item('invites', 'Invites', <LinkIcon />, '/manage/invites'),
    item('look', 'Look', <PaintBrushIcon />, '/manage/look'),
    item('settings', 'Settings', <SlidersHorizontalIcon />, '/manage/settings'),
    item('connections', 'Connections', <PlugsConnectedIcon />, '/manage/connections'),
  ] }];
  return (
    <AppShell
      app={identity}
      primaryAction={<Button variant="primary" fullWidth onPress={() => navigate('/')}><ArrowLeftIcon weight="bold" /> Open the group</Button>}
      nav={nav}
      user={{ name: me.display_name, detail: email }}
      onSignOut={signOut}
      onSettings={() => navigate('/manage/settings')}
      topbar={<PageHeader crumbs={[{ label: group.name }, { label: crumb }]} actions={actions} />}
    >
      {children}
    </AppShell>
  );
}
