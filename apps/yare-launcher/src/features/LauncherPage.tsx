import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Button, Skeleton, toast } from '@heroui/react';
import { DownloadSimpleIcon, PlugsConnectedIcon, SquaresFourIcon } from '@phosphor-icons/react';
import { AppShell, ConnectionsPanel, PageHeader, SetupGuideDialog, catalog, type AppIdentity, type CatalogEntry } from '../yare';
import type { Client, LauncherApp, LauncherSettings } from '../lib/supabase';
import { getSettings, listApps, saveApp, saveSettings, type AppInput } from '../lib/apps';
import { AppCard } from './AppCard';
import { AppStatusDialog } from './AppStatusDialog';

interface Props {
  db: Client;
  session: Session;
  app: AppIdentity;
  supabaseUrl: string;
  supabasePublishableKey: string;
  onSignOut: () => void;
}

type Page = 'collection' | 'connections';

export function LauncherPage({ db, session, app, supabaseUrl, supabasePublishableKey, onSignOut }: Props) {
  const [page, setPage] = useState<Page>('collection');
  const [apps, setApps] = useState<LauncherApp[] | null>(null);
  const [settings, setSettings] = useState<LauncherSettings | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<CatalogEntry | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [dialogKey, setDialogKey] = useState(0);

  const reload = useCallback(async () => {
    try {
      const [rows, s] = await Promise.all([listApps(db), getSettings(db)]);
      setApps(rows);
      setSettings(s);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load the apps.');
    }
  }, [db]);

  useEffect(() => { void reload(); }, [reload]);

  const rowFor = (slug: string) => apps?.find((a) => a.slug === slug);

  async function submitStatus(entry: CatalogEntry, input: AppInput) {
    const saved = await saveApp(db, entry.slug, rowFor(entry.slug)?.id, input);
    setApps((list) => {
      const rest = (list ?? []).filter((a) => a.id !== saved.id);
      return [...rest, saved];
    });
    toast.success(`${entry.name} ${saved.status === 'set_up' ? 'marked as set up' : 'saved'}`);
  }

  async function saveRepo(url: string | null) {
    setSettings(await saveSettings(db, { github_repo_url: url }));
  }

  async function connectSupabase(values: { url: string; key: string } | null) {
    setSettings(await saveSettings(db, { supabase_url: values?.url ?? null, supabase_publishable_key: values?.key ?? null }));
  }

  // The project the apps will use: a saved connection wins over the one this launcher runs on.
  const effectiveSupabase = settings?.supabase_url && settings.supabase_publishable_key
    ? { url: settings.supabase_url, key: settings.supabase_publishable_key, isDefault: false }
    : { url: supabaseUrl, key: supabasePublishableKey, isDefault: true };

  const email = session.user.email ?? 'Signed in';
  const user = { name: (session.user.user_metadata?.full_name as string | undefined) ?? email.split('@')[0] ?? 'You', detail: email };
  const setUpCount = apps?.filter((a) => a.status === 'set_up').length ?? 0;

  return (
    <AppShell
      app={app}
      primaryAction={<Button variant="primary" fullWidth onPress={() => setGuideOpen(true)}><DownloadSimpleIcon weight="bold" /> Setup guide</Button>}
      nav={[{
        id: 'main', label: 'Launcher', items: [
          { id: 'collection', label: 'Yare Monster Apps', icon: <SquaresFourIcon />, isActive: page === 'collection', onPress: () => setPage('collection') },
          { id: 'connections', label: 'Connections', icon: <PlugsConnectedIcon />, isActive: page === 'connections', onPress: () => setPage('connections') },
        ],
      }]}
      user={user}
      onSignOut={onSignOut}
      onSettings={() => setPage('connections')}
      topbar={<PageHeader crumbs={[{ label: 'Launcher' }, { label: page === 'collection' ? 'Yare Monster Apps' : 'Connections' }]} />}
    >
      {loadError && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-(--yare-radius-card) border border-danger/30 bg-danger/5 p-4 text-sm">
          <span>{loadError}</span>
          <Button size="sm" variant="outline" onPress={() => void reload()}>Try again</Button>
        </div>
      )}

      {page === 'connections' && (
        <ConnectionsPanel
          appLabel="this launcher"
          supabase={{ url: effectiveSupabase.url, publishableKey: effectiveSupabase.key, isDefault: effectiveSupabase.isDefault, onConnect: connectSupabase }}
          repoUrl={settings?.github_repo_url ?? null}
          onSaveRepo={saveRepo}
        />
      )}

      {page === 'collection' && apps === null && !loadError && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading the apps">
          {catalog.map((c) => <Skeleton key={c.slug} className="h-56 rounded-(--yare-radius-card)" />)}
        </div>
      )}

      {page === 'collection' && apps !== null && (
        <>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl">Yare Monster Apps</h2>
              <p className="text-sm text-muted">
                {setUpCount === 0
                  ? 'Nine apps, each one its own deployment on your accounts. Download the setup guide to get going, or set them up one by one.'
                  : `${setUpCount} of ${catalog.length} set up. Mark each app as you deploy it; the launcher takes your word for it.`}
              </p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {catalog.map((entry) => (
              <AppCard key={entry.slug} entry={entry} row={rowFor(entry.slug)} onEdit={() => { setDialogKey((k) => k + 1); setEditing(entry); }} />
            ))}
          </div>
        </>
      )}

      {editing && (
        <AppStatusDialog
          key={dialogKey}
          entry={editing}
          row={rowFor(editing.slug)}
          isOpen
          onOpenChange={(o) => { if (!o) setEditing(null); }}
          onSubmit={(input) => submitStatus(editing, input)}
        />
      )}

      <SetupGuideDialog
        key={`guide-${guideOpen}`}
        isOpen={guideOpen}
        onOpenChange={setGuideOpen}
        repoUrl={settings?.github_repo_url ?? null}
        supabaseUrl={effectiveSupabase.url}
        supabasePublishableKey={effectiveSupabase.key}
        email={session.user.email}
        onOpenConnections={() => setPage('connections')}
      />
    </AppShell>
  );
}
