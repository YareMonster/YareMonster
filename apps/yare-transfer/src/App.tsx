import { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import type { Session } from '@supabase/supabase-js';
import { Spinner } from '@heroui/react';
import { PageHeader, SetupGuideButton, SignIn, catalog, yareApp } from './yare';
import { readEnv, type PublicEnv } from './lib/env';
import { createSupabase, type Client } from './lib/supabase';
import { ConfigMissing } from './features/ConfigMissing';
import { TransfersProvider } from './features/TransfersContext';
import { Shell } from './features/Shell';
import { HomePage } from './features/HomePage';
import { ConnectionsPage } from './features/ConnectionsPage';
import { TransferPage } from './features/transfer/TransferPage';
import { PublicTransfer } from './public/PublicTransfer';

export const identity = yareApp('transfer');

export function App() {
  const config = useMemo(readEnv, []);
  if (!config.ok) return <ConfigMissing missing={config.missing} />;
  return <Root env={config.env} />;
}

function Root({ env }: { env: PublicEnv }) {
  const db = useMemo(() => createSupabase(env), [env]);
  return (
    <BrowserRouter>
      <Routes>
        {/* A recipient's page: no sign-in, no shell. */}
        <Route path="/t/:slug" element={<PublicTransfer db={db} />} />
        <Route path="/*" element={<Authenticated db={db} env={env} />} />
      </Routes>
    </BrowserRouter>
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
    <TransfersProvider db={db}>
      <Routes>
        <Route path="/transfers/:id" element={<TransferPage shell={shell} />} />
        <Route path="/connections" element={
          <Shell {...shell} topbar={<PageHeader crumbs={[{ label: 'Transfer' }, { label: 'Connections' }]} actions={<SetupGuideButton apps={catalog.filter((c) => c.slug === 'transfer')} repoUrl={null} supabaseUrl={supabase.url} supabasePublishableKey={supabase.publishableKey} email={user.detail} />} />}>
            <ConnectionsPage supabase={supabase} />
          </Shell>
        } />
        <Route path="/" element={<Shell {...shell} topbar={<PageHeader crumbs={[{ label: 'Transfer' }, { label: 'Home' }]} />}><HomePage /></Shell>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </TransfersProvider>
  );
}
