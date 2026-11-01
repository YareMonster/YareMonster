import { useState, type FormEvent } from 'react';
import { Button, Card, Description, Form, Input, Label, TextField, toast } from '@heroui/react';
import { ArrowSquareOutIcon, EnvelopeSimpleIcon } from '@phosphor-icons/react';
import { Steps } from './ConnectionsPanel';
import { Notice } from './Notice';

export type EmailStatus = 'checking' | 'ready' | 'missing' | 'error';

export interface EmailConnectionCardProps {
  /** Short name used in copy, e.g. "Yare Sign". */
  appLabel: string;
  /** Whether the deployment can send: the key is in place (ready), absent (missing), or the check failed (error). */
  status: EmailStatus;
  /** Shown under the status when something is wrong. */
  detail?: string;
  /** What the emails say in the From line, e.g. hello@yourdomain.com. */
  fromEmail: string;
  /** The public address of this deployment, used in the links the emails carry. */
  appUrl: string;
  onSave: (values: { fromEmail: string; appUrl: string }) => Promise<void>;
  /** Sends a test email to the signed-in person. */
  onTest?: () => Promise<void>;
}

/**
 * The fourth connection, for apps that send email: a long card in two parts. Left, what this
 * deployment sends from and the address its links point at. Right, how to get a free Resend
 * account and hand the key to the deployment. The key itself never appears here: it lives in
 * Supabase as a secret the person sets from their own terminal.
 */
export function EmailConnectionCard({ appLabel, status, detail, fromEmail, appUrl, onSave, onTest }: EmailConnectionCardProps) {
  const [pending, setPending] = useState(false);
  const [testing, setTesting] = useState(false);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setPending(true);
    try {
      await onSave({ fromEmail: String(data.get('from') ?? '').trim(), appUrl: String(data.get('app') ?? '').trim().replace(/\/+$/, '') });
      toast.success('Email settings saved');
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setPending(false);
    }
  }

  async function test() {
    if (!onTest) return;
    setTesting(true);
    try { await onTest(); toast.success('Test email sent. Check your inbox.'); }
    catch (err) { toast.danger(err instanceof Error ? err.message : 'Could not send the test.'); }
    finally { setTesting(false); }
  }

  return (
    <Card className="gap-5 p-5 lg:flex-row">
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="flex items-center gap-3">
          <EnvelopeSimpleIcon size={28} />
          <div>
            <h3 className="text-lg">Email</h3>
            <p className="text-sm text-muted">How {appLabel} sends its messages.</p>
          </div>
        </div>
        {status === 'ready' && <Notice status="success" icon={false} title="Ready to send">Emails go out from {fromEmail || 'the address below'} through your own Resend account.</Notice>}
        {status === 'missing' && <Notice status="warning" icon={false} title="Not set up yet">{appLabel} works without email: copy each link and send it yourself. Add a Resend key, on the right, and it sends for you.</Notice>}
        {status === 'error' && <Notice status="danger" title="Could not check">{detail ?? 'The email function did not answer. Deploy the functions as the install guide shows, then reload.'}</Notice>}
        {status === 'checking' && <Notice status="default" icon={false} title="Checking">Asking your deployment whether it can send.</Notice>}
        <Form onSubmit={save} className="flex flex-col gap-3">
          <TextField name="from" type="email" fullWidth defaultValue={fromEmail}>
            <Label>Sender address</Label>
            <Input placeholder="hello@yourdomain.com" inputMode="email" />
            <Description>On a domain you verified in Resend. People reply to it.</Description>
          </TextField>
          <TextField name="app" type="url" fullWidth defaultValue={appUrl}>
            <Label>Address of this deployment</Label>
            <Input placeholder="https://sign.yourdomain.com" inputMode="url" />
            <Description>The links in every email start with it.</Description>
          </TextField>
          <div className="mt-auto grid grid-cols-2 gap-2">
            <Button type="submit" variant="primary" fullWidth isPending={pending}>Save</Button>
            {onTest
              ? <Button variant="outline" fullWidth isPending={testing} isDisabled={status !== 'ready'} onPress={() => void test()}>Send me a test</Button>
              : <Button variant="outline" fullWidth onPress={() => window.open('https://resend.com', '_blank', 'noopener,noreferrer')}>Open Resend <ArrowSquareOutIcon /></Button>}
          </div>
        </Form>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-4 border-t border-border pt-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-5">
        <div>
          <h4 className="text-base">Set it up once, with Resend</h4>
          <p className="text-sm text-muted">Free for 3,000 emails a month. Your assistant can do every step except typing the key.</p>
        </div>
        <Steps items={[
          'Create a free account at resend.com.',
          'Add the domain you send from and create the three DNS records it shows. If your DNS is on Cloudflare, your assistant can add them.',
          'Create an API key with sending permission. Copy it once; it is shown only then.',
          `Give the key to your deployment from your own terminal: npx supabase secrets set RESEND_API_KEY=<the key>. Never paste it into a chat.`,
          'Fill in the sender address and this deployment’s address on the left, save, and send yourself a test.',
        ]} />
        <p className="text-xs text-muted">The key lives in your Supabase project, where the sending function runs. It is never in the app, the code or the browser.</p>
        <Button variant="outline" fullWidth className="mt-auto" onPress={() => window.open('https://resend.com', '_blank', 'noopener,noreferrer')}>Open Resend <ArrowSquareOutIcon /></Button>
      </div>
    </Card>
  );
}
