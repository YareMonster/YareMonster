import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useMatch } from 'react-router';
import type { Session } from '@supabase/supabase-js';
import { Button, Spinner } from '@heroui/react';
import { YareMark, yareApp } from './yare';
import { readEnv, type PublicEnv } from './lib/env';
import { createSupabase, type Client, type Group, type Member } from './lib/supabase';
import { enter, getGroup, joinWithCode } from './lib/groups-api';
import { ConfigMissing } from './features/ConfigMissing';
import { GroupProvider } from './features/GroupContext';
import { Gate, CODE_KEY, JoinForm } from './gate/Gate';
import { ResetPassword } from './gate/ResetPassword';
import { GroupView } from './group/GroupView';
import { ManageApp } from './manage/ManageApp';

export const identity = yareApp('groups');

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
        <Route path="/reset" element={<ResetPassword db={db} />} />
        <Route path="/*" element={<Door db={db} env={env} />} />
      </Routes>
    </BrowserRouter>
  );
}

/** One sign-in screen for everyone: admins and members alike. */
function Door({ db, env }: { db: Client; env: PublicEnv }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const invite = useMatch('/join/:code');
  useEffect(() => {
    db.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = db.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => sub.subscription.unsubscribe();
  }, [db]);

  if (session === undefined) return <Centered><Spinner aria-label="Loading" /></Centered>;
  if (!session) return <Gate db={db} code={invite?.params.code} />;
  return <Entered db={db} env={env} session={session} code={invite?.params.code} />;
}

type EnterState = { kind: 'loading' } | { kind: 'ready'; me: Member; group: Group } | { kind: 'not-member' } | { kind: 'removed' } | { kind: 'error'; message: string };

/** Signed in. Operators become owner or admin; members need to be in the group, or carry an invite code. */
function Entered({ db, env, session, code }: { db: Client; env: PublicEnv; session: Session; code?: string }) {
  const [state, setState] = useState<EnterState>({ kind: 'loading' });
  const pendingCode = code ?? sessionStorage.getItem(CODE_KEY) ?? undefined;

  useEffect(() => {
    let gone = false;
    (async () => {
      try {
        let me: Member;
        try {
          me = await enter(db);
        } catch (err) {
          const e = err as Error & { code?: string };
          if (e.code === 'YG403') { if (!gone) setState({ kind: 'removed' }); return; }
          if (e.code !== 'YG404') throw err;
          if (!pendingCode) { if (!gone) setState({ kind: 'not-member' }); return; }
          me = await joinWithCode(db, pendingCode);
        }
        sessionStorage.removeItem(CODE_KEY);
        const group = await getGroup(db);
        if (!gone) setState({ kind: 'ready', me, group });
      } catch (err) {
        if (!gone) setState({ kind: 'error', message: err instanceof Error ? err.message : 'Something went wrong.' });
      }
    })();
    return () => { gone = true; };
  }, [db, pendingCode]);

  const signOut = () => { sessionStorage.removeItem(CODE_KEY); void db.auth.signOut(); };
  const email = session.user.email ?? '';

  if (state.kind === 'loading') return <Centered><Spinner aria-label="Loading" /></Centered>;
  if (state.kind === 'not-member') return <Plain title="Not in this group yet" text={`You are signed in as ${email}, but this group has not added you. Paste the invite link you were given, or ask for one.`} onSignOut={signOut}><JoinForm db={db} onJoined={(me) => getGroup(db).then((group) => setState({ kind: 'ready', me, group }))} /></Plain>;
  if (state.kind === 'removed') return <Plain title="You were removed from this group" text="An admin took you out. If that is a mistake, ask them to let you back in." onSignOut={signOut} />;
  if (state.kind === 'error') return <Plain title="Could not open the group" text={state.message} onSignOut={signOut} />;

  const staff = state.me.role === 'owner' || state.me.role === 'admin';
  return (
    <GroupProvider db={db} userId={session.user.id} email={email} me={state.me} group={state.group} onSignOut={signOut}>
      <Routes>
        <Route path="/manage/*" element={staff ? <ManageApp env={env} /> : <Navigate to="/" replace />} />
        <Route path="/join/:code" element={<Navigate to="/" replace />} />
        <Route path="/c/:name" element={<GroupView />} />
        <Route path="*" element={<GroupView />} />
      </Routes>
    </GroupProvider>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return <div className="grid min-h-dvh place-items-center" aria-busy="true">{children}</div>;
}

function Plain({ title, text, onSignOut, children }: { title: string; text: string; onSignOut: () => void; children?: ReactNode }) {
  return (
    <div className="grid min-h-dvh place-items-center p-6">
      <div className="flex w-full max-w-md flex-col items-center gap-4 text-center">
        <YareMark size={64} />
        <h1 className="text-2xl">{title}</h1>
        <p className="text-sm text-muted">{text}</p>
        {children}
        <Button variant="outline" onPress={onSignOut}>Sign out</Button>
      </div>
    </div>
  );
}
