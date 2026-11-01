import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Spinner } from '@heroui/react';
import { SignIn, yareApp } from './yare';
import { readEnv } from './lib/env';
import { createSupabase } from './lib/supabase';
import { ConfigMissing } from './features/ConfigMissing';
import { HomePage } from './features/HomePage';

const identitySlug = 'flash' as const;
export const identity = yareApp(identitySlug);

export function App() {
  const config = useMemo(readEnv, []);
  if (!config.ok) return <ConfigMissing missing={config.missing} />;
  return <Authenticated supabaseUrl={config.env.supabaseUrl} supabasePublishableKey={config.env.supabasePublishableKey} />;
}

function Authenticated(env: { supabaseUrl: string; supabasePublishableKey: string }) {
  const db = useMemo(() => createSupabase(env), [env.supabaseUrl, env.supabasePublishableKey]);
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    db.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = db.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => sub.subscription.unsubscribe();
  }, [db]);

  if (session === undefined) {
    return (
      <div className="grid min-h-dvh place-items-center" aria-busy="true">
        <Spinner aria-label="Loading" />
      </div>
    );
  }

  if (!session) {
    return (
      <SignIn
        app={identity}
        onSignIn={async ({ email, password }) => {
          const { error } = await db.auth.signInWithPassword({ email, password });
          if (error) throw error;
        }}
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
  return <HomePage app={identity} slug={identitySlug} user={user} onSignOut={() => db.auth.signOut()} supabase={{ url: env.supabaseUrl, publishableKey: env.supabasePublishableKey }} />;
}
