import { useState } from 'react';
import { Button } from '@heroui/react';
import { ArrowSquareOutIcon, HouseIcon, PlugsConnectedIcon } from '@phosphor-icons/react';
import { AppShell, ConnectionsPanel, PageHeader, SetupGuideButton, YareMark, catalog, type AppIdentity } from '../yare';

interface Props {
  app: AppIdentity;
  /** This app's entry in the catalogue, for the setup guide. */
  slug: (typeof catalog)[number]['slug'];
  user?: { name: string; detail?: string };
  onSignOut?: () => void;
  /** The Supabase project this app runs on, from its configuration. Undefined for an app without a database. */
  supabase?: { url: string; publishableKey: string };
}

type Page = 'home' | 'connections';

/** The shell with the shared Connections page and an empty home. Replace the home when the app's scope is defined. */
export function HomePage({ app, slug, user, onSignOut, supabase }: Props) {
  const [page, setPage] = useState<Page>('home');
  const short = app.name.replace('Yare ', '');
  const entry = catalog.filter((c) => c.slug === slug);
  const guide = (
    <SetupGuideButton apps={entry} repoUrl={null} supabaseUrl={supabase?.url} supabasePublishableKey={supabase?.publishableKey} email={user?.detail} />
  );
  return (
    <AppShell
      app={app}
      nav={[{
        id: 'main', items: [
          { id: 'home', label: 'Home', icon: <HouseIcon />, isActive: page === 'home', onPress: () => setPage('home') },
          { id: 'connections', label: 'Connections', icon: <PlugsConnectedIcon />, isActive: page === 'connections', onPress: () => setPage('connections') },
        ],
      }]}
      user={user}
      onSignOut={onSignOut}
      onSettings={() => setPage('connections')}
      topbar={<PageHeader crumbs={[{ label: short }, { label: page === 'home' ? 'Home' : 'Connections' }]} actions={page === 'connections' ? guide : undefined} />}
    >
      {page === 'connections' ? (
        <ConnectionsPanel
          appLabel={app.name}
          supabase={supabase ? { url: supabase.url, publishableKey: supabase.publishableKey, isDefault: true } : undefined}
          repoUrl={null}
        />
      ) : (
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
          <YareMark size={72} />
          <h2 className="text-2xl">Nothing built here yet</h2>
          <p className="text-sm text-muted">
            {app.name} is scaffolded but its features are still being defined. This folder already carries the shared design system and deployment setup it will use.
          </p>
          {app.docsUrl && (
            <Button variant="outline" onPress={() => window.open(app.docsUrl, '_blank', 'noopener,noreferrer')}>
              Read the plan <ArrowSquareOutIcon />
            </Button>
          )}
        </div>
      )}
    </AppShell>
  );
}
