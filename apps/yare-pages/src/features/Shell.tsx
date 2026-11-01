import { useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Button } from '@heroui/react';
import { GlobeIcon, HouseIcon, PlugsConnectedIcon, PlusIcon } from '@phosphor-icons/react';
import { AppShell, type AppIdentity, type NavSection } from '../yare';
import { useSites } from './SitesContext';
import { NewSiteDialog } from './NewSiteDialog';

interface Props { app: AppIdentity; user: { name: string; detail?: string }; onSignOut: () => void; topbar?: ReactNode; children: ReactNode }

/** The Yare Pages sidebar: Home, Connections, then every website under "Your websites". */
export function Shell({ app, user, onSignOut, topbar, children }: Props) {
  const { sites } = useSites();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [adding, setAdding] = useState(false);
  const nav: NavSection[] = [
    { id: 'main', items: [
      { id: 'home', label: 'Home', icon: <HouseIcon />, isActive: pathname === '/', onPress: () => navigate('/') },
      { id: 'connections', label: 'Connections', icon: <PlugsConnectedIcon />, isActive: pathname === '/connections', onPress: () => navigate('/connections') },
    ] },
    { id: 'sites', label: 'Your websites', items: (sites ?? []).map((s) => ({ id: s.id, label: s.name, icon: <GlobeIcon />, isActive: pathname.startsWith(`/sites/${s.id}`), onPress: () => navigate(`/sites/${s.id}`) })) },
  ];
  return (
    <AppShell app={app} primaryAction={<Button variant="primary" fullWidth onPress={() => setAdding(true)}><PlusIcon weight="bold" /> New website</Button>} nav={nav} user={user} onSignOut={onSignOut} onSettings={() => navigate('/connections')} topbar={topbar}>
      {children}
      <NewSiteDialog key={String(adding)} isOpen={adding} onOpenChange={setAdding} />
    </AppShell>
  );
}
