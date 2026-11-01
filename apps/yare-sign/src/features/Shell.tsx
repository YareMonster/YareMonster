import { useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Button, toast } from '@heroui/react';
import { FileTextIcon, HouseIcon, PlugsConnectedIcon, PlusIcon } from '@phosphor-icons/react';
import { AppShell, type AppIdentity, type NavSection } from '../yare';
import { useEnvelopes } from './EnvelopesContext';

interface Props {
  app: AppIdentity;
  user: { name: string; detail?: string };
  onSignOut: () => void;
  topbar?: ReactNode;
  children: ReactNode;
}

/** The Yare Sign sidebar: Home, Connections, then every document under "Your documents". */
export function Shell({ app, user, onSignOut, topbar, children }: Props) {
  const { envelopes, create } = useEnvelopes();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [creating, setCreating] = useState(false);

  async function newEnvelope() {
    setCreating(true);
    try {
      const e = await create();
      navigate(`/documents/${e.id}`);
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : 'Could not create the document.');
    } finally {
      setCreating(false);
    }
  }

  const nav: NavSection[] = [
    {
      id: 'main', items: [
        { id: 'home', label: 'Home', icon: <HouseIcon />, isActive: pathname === '/', onPress: () => navigate('/') },
        { id: 'connections', label: 'Connections', icon: <PlugsConnectedIcon />, isActive: pathname === '/connections', onPress: () => navigate('/connections') },
      ],
    },
    {
      id: 'documents', label: 'Your documents', items: (envelopes ?? []).map((e) => ({
        id: e.id, label: e.title, icon: <FileTextIcon />, isActive: pathname.startsWith(`/documents/${e.id}`), onPress: () => navigate(`/documents/${e.id}`),
      })),
    },
  ];

  return (
    <AppShell
      app={app}
      primaryAction={<Button variant="primary" fullWidth isPending={creating} onPress={newEnvelope}><PlusIcon weight="bold" /> New document</Button>}
      nav={nav}
      user={user}
      onSignOut={onSignOut}
      onSettings={() => navigate('/connections')}
      topbar={topbar}
    >
      {children}
    </AppShell>
  );
}
