import { useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Button, toast } from '@heroui/react';
import { FileTextIcon, HouseIcon, PlugsConnectedIcon, PlusIcon } from '@phosphor-icons/react';
import { AppShell, type AppIdentity, type NavSection } from '../yare';
import { useForms } from './FormsContext';

interface Props {
  app: AppIdentity;
  user: { name: string; detail?: string };
  onSignOut: () => void;
  topbar?: ReactNode;
  children: ReactNode;
}

/** The Yare Forms sidebar: Home, Connections, Setup guide, then every form under "Your forms". */
export function Shell({ app, user, onSignOut, topbar, children }: Props) {
  const { forms, create } = useForms();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [creating, setCreating] = useState(false);

  async function newForm() {
    setCreating(true);
    try {
      const form = await create();
      navigate(`/forms/${form.id}`);
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : 'Could not create the form.');
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
      id: 'forms', label: 'Your forms', items: (forms ?? []).map((f) => ({
        id: f.id, label: f.title, icon: <FileTextIcon />, isActive: pathname.startsWith(`/forms/${f.id}`), onPress: () => navigate(`/forms/${f.id}`),
      })),
    },
  ];

  return (
    <AppShell
      app={app}
      primaryAction={<Button variant="primary" fullWidth isPending={creating} onPress={newForm}><PlusIcon weight="bold" /> New form</Button>}
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
