import { useState, type FormEvent, type ReactNode } from 'react';
import { Button, Card, FieldError, Form, Input, Label, Link, TextField } from '@heroui/react';
import { friendlyAuthError, type FriendlyMessage } from '../auth-messages';
import { Notice } from './Notice';
import { PasswordField } from './PasswordField';
import type { AppIdentity } from '../brand';
import { YARE } from '../brand';
import { YareLogo } from './YareLogo';

export interface Credentials {
  email: string;
  password: string;
}

export interface SignInProps {
  app: AppIdentity;
  /** Resolve on success. Throw the provider's Error; the card turns its message into plain words. */
  onSignIn: (credentials: Credentials) => Promise<void>;
  /**
   * Account creation. The database only accepts emails on the deployment's allow list (see the
   * app's access migration). Resolve with a message when something must happen next, such as
   * confirming an email; resolve with nothing when the account is ready to use.
   */
  onCreateAccount?: (credentials: Credentials) => Promise<string | void>;
  /** Replaces the default explanation under the heading. */
  description?: ReactNode;
}

/**
 * The sign-in screen every Yare Monster app shares. The same card creates an account, which the
 * database accepts only for emails on the deployment's allow list.
 */
export function SignIn({ app, onSignIn, onCreateAccount, description }: SignInProps) {
  const [mode, setMode] = useState<'signin' | 'create'>('signin');
  const [error, setError] = useState<FriendlyMessage | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const creating = mode === 'create' && onCreateAccount;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const credentials = { email: String(data.get('email') ?? '').trim(), password: String(data.get('password') ?? '') };
    setError(null);
    setNotice(null);
    setPending(true);
    try {
      if (creating) {
        const next = await onCreateAccount(credentials);
        if (next) setNotice(next);
      } else {
        await onSignIn(credentials);
      }
    } catch (err) {
      setError(friendlyAuthError(err instanceof Error ? err.message : String(err), credentials.email));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="yare-signin">
      <Card className="yare-signin__card">
        <YareLogo app={app} height={56} align="center" />
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl">{creating ? `Create your ${app.name} account` : 'Sign in'}</h1>
          {!creating && <p className="text-sm text-muted">{description ?? `Sign in to your ${app.name}.`}</p>}
        </div>
        <Form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <TextField name="email" type="email" isRequired fullWidth autoComplete="username">
            <Label>Email</Label>
            <Input placeholder="you@domain.com" />
            <FieldError />
          </TextField>
          <PasswordField
            placeholder={creating ? 'At least 8 characters' : 'Your password'}
            autoComplete={creating ? 'new-password' : 'current-password'}
            minLength={creating ? 8 : undefined}
          />
          {error && <Notice status="danger" title={error.title}>{error.body}</Notice>}
          {notice && <Notice status="success" icon={false} title="One more step">{notice}</Notice>}
          <Button type="submit" variant="primary" size="lg" fullWidth isPending={pending}>
            {creating ? 'Create account' : 'Sign in'}
          </Button>
        </Form>
        {onCreateAccount && (
          <p className="text-center text-sm text-muted">
            {creating ? 'Already have your account? ' : 'First time here? '}
            <button type="button" className="font-medium text-accent hover:underline" onClick={() => { setMode(creating ? 'signin' : 'create'); setError(null); setNotice(null); }}>
              {creating ? 'Sign in' : 'Create your account'}
            </button>
          </p>
        )}
        <p className="text-center text-xs text-muted">
          {app.name} is part of{' '}
          <Link href={YARE.url} target="_blank" rel="noopener noreferrer" className="text-xs text-accent">Yare Monster</Link>.
        </p>
      </Card>
    </div>
  );
}
