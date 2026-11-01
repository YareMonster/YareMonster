import { useEffect, useState, type FormEvent } from 'react';
import { Button, Card, FieldError, Form, Input, Label, TextField } from '@heroui/react';
import { Notice, PasswordField, PoweredByYare, friendlyAuthError, type FriendlyMessage } from '../yare';
import type { Client, Member, PublicGroup } from '../lib/supabase';
import { imageUrl } from '../lib/supabase';
import { useGroupIdentity } from '../lib/identity';
import { getPublic, joinWithCode, peekInvite, signUpMember } from '../lib/groups-api';
import { applyGroupTheme, groupThemeById } from '../lib/themes';
import '../group/group.css';

/** Where an invite code waits while the person signs in or creates the account. */
export const CODE_KEY = 'yaregroups.invite';

type Mode = 'signin' | 'create' | 'forgot';
type Invite = { valid: boolean; role: 'member' | 'moderator' } | null;

/**
 * The one door of the group, in the group's own look: admins and members sign in here. With an
 * invite link (or an open group) the same card creates the account.
 */
export function Gate({ db, code }: { db: Client; code?: string }) {
  const [pub, setPub] = useState<PublicGroup | null | undefined>(undefined);
  const [invite, setInvite] = useState<Invite | undefined>(code ? undefined : null);
  const [mode, setMode] = useState<Mode>('signin');
  const [error, setError] = useState<FriendlyMessage | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    getPublic(db).then(setPub).catch(() => setPub(null));
    if (code) { sessionStorage.setItem(CODE_KEY, code); peekInvite(db, code).then(setInvite).catch(() => setInvite(null)); }
  }, [db, code]);

  const theme = groupThemeById(pub?.theme ?? 'paper');
  useEffect(() => applyGroupTheme(theme), [theme]);
  const canCreate = !!pub && pub.join_mode !== 'closed' && (pub.join_mode === 'open' || (!!code && invite?.valid === true));
  useEffect(() => { if (canCreate && code) setMode('create'); }, [canCreate, code]);
  const loading = pub === undefined || invite === undefined;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const email = String(data.get('email') ?? '').trim();
    const password = String(data.get('password') ?? '');
    const name = String(data.get('name') ?? '').trim();
    setError(null); setNotice(null); setPending(true);
    try {
      if (mode === 'forgot') {
        const { error: err } = await db.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset` });
        if (err) throw err;
        setNotice(`If ${email} has an account here, a link to choose a new password is on its way.`);
      } else if (mode === 'create') {
        const out = await signUpMember(db, { email, password, display_name: name, code });
        if (out.exists) { setMode('signin'); setNotice('That email already has an account. Sign in with it and you are added to the group.'); return; }
        const { error: err } = await db.auth.signInWithPassword({ email, password });
        if (err) throw err;
      } else {
        const { error: err } = await db.auth.signInWithPassword({ email, password });
        if (err) throw err;
      }
    } catch (err) {
      setError(friendlyAuthError(err instanceof Error ? err.message : String(err), email));
    } finally {
      setPending(false);
    }
  }

  const background = imageUrl(db, pub?.background_path);
  const logo = imageUrl(db, pub?.logo_path);
  useGroupIdentity(pub?.name, logo);
  return (
    <div className={`yg-gate${background ? ' yg-gate--photo' : ''}`}>
      {background && <div className="yg-gate__bg" style={{ backgroundImage: `url(${background})` }} aria-hidden="true" />}
      <main className="yare-signin">
        <Card className="yare-signin__card">
          {loading ? <GateSkeleton /> : (
            <>
              {logo && <img className="yg-gate__logo" src={logo} alt="" />}
              <div className="flex flex-col gap-1 text-center">
                <h1 className="text-2xl">{pub?.name ?? 'Yare Groups'}</h1>
                {pub?.tagline && <p className="text-sm text-muted">{pub.tagline}</p>}
              </div>
              {!pub && <p className="yg-gate__welcome text-muted">This group is being set up. If you are its admin, sign in.</p>}
              {pub && mode !== 'forgot' && pub.welcome && <p className="yg-gate__welcome">{pub.welcome}</p>}
              {code && invite && !invite.valid && <Notice status="warning" title="This invite link is not valid any more">Ask for a new one. If you already have an account, sign in.</Notice>}
              {code && invite?.valid && mode === 'create' && <Notice status="success" icon={false} title={`You are invited${invite.role === 'moderator' ? ' as a moderator' : ''}`}>Choose a name and a password, and you are in.</Notice>}
              <Form onSubmit={submit} className="flex flex-col gap-4">
                {mode === 'create' && (
                  <TextField name="name" isRequired fullWidth maxLength={40} autoComplete="nickname">
                    <Label>Your name in the group</Label>
                    <Input placeholder="How people will see you" />
                    <FieldError />
                  </TextField>
                )}
                <TextField name="email" type="email" isRequired fullWidth autoComplete="username">
                  <Label>Email</Label>
                  <Input placeholder="you@domain.com" />
                  <FieldError />
                </TextField>
                {mode !== 'forgot' && (
                  <PasswordField placeholder={mode === 'create' ? 'At least 8 characters' : 'Your password'} autoComplete={mode === 'create' ? 'new-password' : 'current-password'} minLength={mode === 'create' ? 8 : undefined} />
                )}
                {error && <Notice status="danger" title={error.title}>{error.body}</Notice>}
                {notice && <Notice status="success" icon={false} title="One more step">{notice}</Notice>}
                <Button type="submit" variant="primary" size="lg" fullWidth isPending={pending}>
                  {mode === 'create' ? 'Join the group' : mode === 'forgot' ? 'Send me a link' : 'Sign in'}
                </Button>
              </Form>
              <div className="yg-gate__links">
                {mode === 'signin' && canCreate && <button type="button" onClick={() => { setMode('create'); setError(null); setNotice(null); }}>New here? Create your account</button>}
                {mode === 'signin' && !canCreate && pub && pub.join_mode !== 'open' && <span className="text-muted">New people join with an invite link.</span>}
                {mode !== 'signin' && <button type="button" onClick={() => { setMode('signin'); setError(null); setNotice(null); }}>Already have your account? Sign in</button>}
                {mode === 'signin' && <button type="button" onClick={() => { setMode('forgot'); setError(null); setNotice(null); }}>Forgot your password?</button>}
              </div>
            </>
          )}
        </Card>
      </main>
      <PoweredByYare className="yg-gate__powered" />
    </div>
  );
}

function GateSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading">
      <div className="yg-skel mx-auto h-14 w-14 rounded-full" />
      <div className="yg-skel mx-auto h-7 w-48" />
      <div className="yg-skel mx-auto h-4 w-64" />
      <div className="yg-skel mt-2 h-12 w-full" />
      <div className="yg-skel h-12 w-full" />
      <div className="yg-skel h-12 w-full" />
    </div>
  );
}

/** For someone signed in but not in the group: paste the invite link or its code. */
export function JoinForm({ db, onJoined }: { db: Client; onJoined: (me: Member) => void }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  async function join(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const code = value.trim().split('/').filter(Boolean).pop() ?? '';
    if (!code) return;
    setPending(true); setError(null);
    try { onJoined(await joinWithCode(db, code)); }
    catch (err) { setError(err instanceof Error ? err.message : 'That did not work.'); }
    finally { setPending(false); }
  }
  return (
    <Form onSubmit={join} className="flex w-full flex-col gap-3 text-left">
      <TextField value={value} onChange={setValue} fullWidth aria-label="Invite link">
        <Input placeholder="Paste the invite link" />
      </TextField>
      {error && <Notice status="danger" title="Could not join">{error}</Notice>}
      <Button type="submit" variant="primary" fullWidth isPending={pending} isDisabled={!value.trim()}>Join with this link</Button>
    </Form>
  );
}
