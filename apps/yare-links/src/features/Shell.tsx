import { useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Button } from '@heroui/react';
import { HouseIcon, LinkSimpleIcon, PlugsConnectedIcon, PlusIcon } from '@phosphor-icons/react';
import { AppShell, type AppIdentity, type NavSection } from '../yare';
import { usePages } from './PagesContext';
import { NewPageDialog } from './NewPageDialog';

interface Props { app: AppIdentity; user: { name: string; detail?: string }; onSignOut: () => void; topbar?: ReactNode; children: ReactNode }

/** The Yare Links sidebar: Home, Connections, then every page under "Your pages". */
export function Shell({ app, user, onSignOut, topbar, children }: Props) {
  const { pages } = usePages();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [creating, setCreating] = useState(false);
  const nav: NavSection[] = [
    { id: 'main', items: [
      { id: 'home', label: 'Home', icon: <HouseIcon />, isActive: pathname === '/', onPress: () => navigate('/') },
      { id: 'connections', label: 'Connections', icon: <PlugsConnectedIcon />, isActive: pathname === '/connections', onPress: () => navigate('/connections') },
    ] },
    { id: 'pages', label: 'Your pages', items: (pages ?? []).map((p) => ({ id: p.id, label: p.title, icon: <LinkSimpleIcon />, isActive: pathname.startsWith(`/pages/${p.id}`), onPress: () => navigate(`/pages/${p.id}`) })) },
  ];
  return (
    <AppShell app={app} primaryAction={<Button variant="primary" fullWidth onPress={() => setCreating(true)}><PlusIcon weight="bold" /> New page</Button>} nav={nav} user={user} onSignOut={onSignOut} onSettings={() => navigate('/connections')} topbar={topbar}>
      {children}
      <NewPageDialog isOpen={creating} onOpenChange={setCreating} />
    </AppShell>
  );
}
