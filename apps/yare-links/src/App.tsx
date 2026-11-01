import { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useMatch } from 'react-router';
import type { Session } from '@supabase/supabase-js';
import { Spinner } from '@heroui/react';
import { PageHeader, SetupGuideButton, SignIn, catalog, yareApp } from './yare';
import { readEnv, type PublicEnv } from './lib/env';
import { createSupabase, type Client } from './lib/supabase';
import { ConfigMissing } from './features/ConfigMissing';
import { PagesProvider } from './features/PagesContext';
import { Shell } from './features/Shell';
import { HomePage } from './features/HomePage';
import { ConnectionsPage } from './features/ConnectionsPage';
import { PageEditor } from './features/page/PageEditor';
import { PublicLinks } from './public/PublicLinks';

export const identity = yareApp('links');

export function App() {
  const config = useMemo(readEnv, []);
  if (!config.ok) return <ConfigMissing missing={config.missing} />;
  return <Root env={config.env} />;
}

function Root({ env }: { env: PublicEnv }) {
  const db = useMemo(() => createSupabase(env), [env]);
  return <BrowserRouter><AppRoutes db={db} env={env} /></BrowserRouter>;
}

/** Home, Connections and the editor need sign-in; any other single word is a visitor's page. */
export function AppRoutes({ db, env }: { db: Client; env: PublicEnv }) {
  return (
      <Routes>
        <Route path="/" element={<Authenticated db={db} env={env} />} />
        <Route path="/connections" element={<Authenticated db={db} env={env} />} />
        <Route path="/pages/:id" element={<Authenticated db={db} env={env} />} />
        {/* A visitor's page: no sign-in, no shell. */}
        <Route path="/:slug" element={<PublicLinks db={db} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
  );
}

function Authenticated({ db, env }: { db: Client; env: PublicEnv }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    db.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = db.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => sub.subscription.unsubscribe();
  }, [db]);

  if (session === undefined) return <div className="grid min-h-dvh place-items-center" aria-busy="true"><Spinner aria-label="Loading" /></div>;
  if (!session) {
    return (
      <SignIn
        app={identity}
        onSignIn={async ({ email, password }) => { const { error } = await db.auth.signInWithPassword({ email, password }); if (error) throw error; }}
        onCreateAccount={async ({ email, password }) => {
          // The database accepts only emails on the deployment's allow list.
          const { data, error } = await db.auth.signUp({ email, password });
          if (error) throw error;
          if (data.session) return;
          return `We sent a confirmation link to ${email}. Open it, then sign in.`;
        }}
      />
    );
  }

  const email = session.user.email ?? 'Signed in';
  const user = { name: (session.user.user_metadata?.full_name as string | undefined) ?? email.split('@')[0] ?? 'You', detail: email };
  const supabase = { url: env.supabaseUrl, publishableKey: env.supabasePublishableKey };
  const shell = { app: identity, user, onSignOut: () => db.auth.signOut() };

  return (
    <PagesProvider db={db}>
      <Signed shell={shell} supabase={supabase} email={user.detail} />
    </PagesProvider>
  );
}

/** Picks the screen from the address. The outer routes already matched it, so no nested routes here. */
function Signed({ shell, supabase, email }: { shell: { app: typeof identity; user: { name: string; detail: string }; onSignOut: () => void }; supabase: { url: string; publishableKey: string }; email: string }) {
  const editing = useMatch('/pages/:id');
  const connections = useMatch('/connections');
  if (editing) return <PageEditor key={editing.params.id} shell={shell} />;
  if (connections) return (
    <Shell {...shell} topbar={<PageHeader crumbs={[{ label: 'Links' }, { label: 'Connections' }]} actions={<SetupGuideButton apps={catalog.filter((c) => c.slug === 'links')} repoUrl={null} supabaseUrl={supabase.url} supabasePublishableKey={supabase.publishableKey} email={email} />} />}>
      <ConnectionsPage supabase={supabase} />
    </Shell>
  );
  return <Shell {...shell} topbar={<PageHeader crumbs={[{ label: 'Links' }, { label: 'Home' }]} />}><HomePage /></Shell>;
}
