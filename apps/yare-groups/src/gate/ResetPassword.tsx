import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { Button, Card, Form } from '@heroui/react';
import { Notice, PasswordField, YareMark, friendlyAuthError, type FriendlyMessage } from '../yare';
import type { Client } from '../lib/supabase';

/** The page the "forgot your password" email points at: choose a new one, then back to the group. */
export function ResetPassword({ db }: { db: Client }) {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<FriendlyMessage | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    db.auth.getSession().then(({ data }) => setReady(!!data.session));
    const { data: sub } = db.auth.onAuthStateChange((event, session) => { if (event === 'PASSWORD_RECOVERY' || session) setReady(!!session); });
    return () => sub.subscription.unsubscribe();
  }, [db]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget).get('password') ?? '');
    setPending(true); setError(null);
    const { error: err } = await db.auth.updateUser({ password });
    setPending(false);
    if (err) { setError(friendlyAuthError(err.message, '')); return; }
    navigate('/', { replace: true });
  }

  return (
    <div className="yare-signin">
      <Card className="yare-signin__card">
        <YareMark size={56} className="mx-auto" />
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl">Choose a new password</h1>
          <p className="text-sm text-muted">{ready ? 'Then you are back in the group.' : 'Open this page from the link in the email we sent you.'}</p>
        </div>
        <Form onSubmit={submit} className="flex flex-col gap-4">
          <PasswordField placeholder="At least 8 characters" autoComplete="new-password" minLength={8} isDisabled={!ready} />
          {error && <Notice status="danger" title={error.title}>{error.body}</Notice>}
          <Button type="submit" variant="primary" size="lg" fullWidth isPending={pending} isDisabled={!ready}>Save and continue</Button>
        </Form>
      </Card>
    </div>
  );
}
