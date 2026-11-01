import { useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Button } from '@heroui/react';
import { HouseIcon, PlugsConnectedIcon, PlusIcon, WalletIcon } from '@phosphor-icons/react';
import { AppShell, type AppIdentity, type NavSection } from '../yare';
import { useWallets } from './WalletsContext';
import { NewWalletDialog } from './NewWalletDialog';

interface Props { app: AppIdentity; user: { name: string; detail?: string }; onSignOut: () => void; topbar?: ReactNode; children: ReactNode }

/** The Yare Crypto sidebar: Home, Connections, then every wallet under "Your wallets". */
export function Shell({ app, user, onSignOut, topbar, children }: Props) {
  const { wallets } = useWallets();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [adding, setAdding] = useState(false);

  const nav: NavSection[] = [
    { id: 'main', items: [
      { id: 'home', label: 'Home', icon: <HouseIcon />, isActive: pathname === '/', onPress: () => navigate('/') },
      { id: 'connections', label: 'Connections', icon: <PlugsConnectedIcon />, isActive: pathname === '/connections', onPress: () => navigate('/connections') },
    ] },
    { id: 'wallets', label: 'Your wallets', items: (wallets ?? []).map((w) => ({ id: w.id, label: w.name, icon: <WalletIcon />, isActive: pathname.startsWith(`/wallets/${w.id}`), onPress: () => navigate(`/wallets/${w.id}`) })) },
  ];

  return (
    <AppShell app={app} primaryAction={<Button variant="primary" fullWidth onPress={() => setAdding(true)}><PlusIcon weight="bold" /> New wallet</Button>} nav={nav} user={user} onSignOut={onSignOut} onSettings={() => navigate('/connections')} topbar={topbar}>
      {children}
      <NewWalletDialog key={String(adding)} isOpen={adding} onOpenChange={setAdding} />
    </AppShell>
  );
}
