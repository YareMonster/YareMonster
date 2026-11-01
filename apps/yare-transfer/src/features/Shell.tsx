import { useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Button, toast } from '@heroui/react';
import { HouseIcon, PaperPlaneTiltIcon, PlugsConnectedIcon, PlusIcon } from '@phosphor-icons/react';
import { AppShell, type AppIdentity, type NavSection } from '../yare';
import { useTransfers } from './TransfersContext';

interface Props { app: AppIdentity; user: { name: string; detail?: string }; onSignOut: () => void; topbar?: ReactNode; children: ReactNode }

/** The Yare Transfer sidebar: Home, Connections, then every transfer under "Your transfers". */
export function Shell({ app, user, onSignOut, topbar, children }: Props) {
  const { transfers, create } = useTransfers();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [creating, setCreating] = useState(false);

  async function newTransfer() {
    setCreating(true);
    try { const t = await create(); navigate(`/transfers/${t.id}`); }
    catch (err) { toast.danger(err instanceof Error ? err.message : 'Could not create the transfer.'); }
    finally { setCreating(false); }
  }

  const nav: NavSection[] = [
    { id: 'main', items: [
      { id: 'home', label: 'Home', icon: <HouseIcon />, isActive: pathname === '/', onPress: () => navigate('/') },
      { id: 'connections', label: 'Connections', icon: <PlugsConnectedIcon />, isActive: pathname === '/connections', onPress: () => navigate('/connections') },
    ] },
    { id: 'transfers', label: 'Your transfers', items: (transfers ?? []).map((t) => ({ id: t.id, label: t.title, icon: <PaperPlaneTiltIcon />, isActive: pathname.startsWith(`/transfers/${t.id}`), onPress: () => navigate(`/transfers/${t.id}`) })) },
  ];

  return (
    <AppShell app={app} primaryAction={<Button variant="primary" fullWidth isPending={creating} onPress={newTransfer}><PlusIcon weight="bold" /> New transfer</Button>} nav={nav} user={user} onSignOut={onSignOut} onSettings={() => navigate('/connections')} topbar={topbar}>
      {children}
    </AppShell>
  );
}
