import { useState, type FormEvent, type ReactNode } from 'react';
import { Button, Card, Description, FieldError, Form, Input, Label, TextField, toast } from '@heroui/react';
import { ArrowSquareOutIcon, CloudIcon, CopyIcon, DatabaseIcon, GithubLogoIcon, PlugsConnectedIcon } from '@phosphor-icons/react';
import { YARE, monsterSrc, yareLicenceUrl } from '../brand';
import { ConnectSupabaseDialog } from './ConnectSupabaseDialog';
import { Notice } from './Notice';
import { useVersionCheck } from '../update';

export interface ConnectionsPanelProps {
  /** Short name used in copy, e.g. "this launcher" or "Yare Forms". */
  appLabel: string;
  /**
   * The Supabase project the app uses. Leave undefined for an app without a database (the
   * Database card then says so).
   */
  supabase?: {
    url: string;
    publishableKey: string;
    /** Whether the values come from the app's own configuration rather than a saved override. */
    isDefault: boolean;
    /** When provided, a Connect button lets the operator point at another project (or back). */
    onConnect?: (values: { url: string; key: string } | null) => Promise<void>;
  };
  /** The operator's copy of the repository. */
  repoUrl: string | null;
  /** When provided, the Code card gets an editable address field. Without it, the card only explains the steps. */
  onSaveRepo?: (url: string | null) => Promise<void>;
  /** More connections this app needs, shown under the three cards and above the small print: an EmailConnectionCard, for instance. */
  children?: ReactNode;
}

export function projectRef(supabaseUrl: string): string | null {
  const m = /^https:\/\/([a-z0-9-]+)\.supabase\.co/i.exec(supabaseUrl);
  return m?.[1] ?? null;
}

/** A numbered list in the Yare Monster style: blue circle, then the sentence. */
export function Steps({ items }: { items: string[] }) {
  return (
    <ol className="flex flex-col gap-1.5 text-sm text-muted">
      {items.map((t, i) => (
        <li key={i} className="flex gap-2">
          <span className="yare-step-n">{i + 1}</span>
          <span>{t}</span>
        </li>
      ))}
    </ol>
  );
}

async function copy(label: string, value: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  } catch {
    toast.danger('Could not copy. Select the text and copy it yourself.');
  }
}

/** A value you can copy, masked as dots until you click it. Public values, but no need to show them to whoever walks past. */
function Value({ label, value }: { label: string; value: string }) {
  const [shown, setShown] = useState(false);
  return (
    <div className="flex items-center justify-between gap-3 rounded-(--yare-radius-control) border border-border bg-surface-secondary px-3 py-2">
      <div className="min-w-0">
        <div className="text-xs font-medium text-muted">{label}</div>
        <button type="button" className="yare-secret block w-full truncate text-start font-mono text-sm" aria-pressed={shown} aria-label={shown ? `Hide ${label}` : `Show ${label}`} title={shown ? 'Click to hide' : 'Click to show'} onClick={() => setShown((v) => !v)}>
          {shown ? value : '•'.repeat(Math.min(value.length, 32))}
        </button>
      </div>
      <Button variant="ghost" size="sm" isIconOnly aria-label={`Copy ${label}`} onPress={() => copy(label, value)}><CopyIcon /></Button>
    </div>
  );
}

/**
 * The three accounts behind every Yare Monster deployment, as the website's guided setup lists them:
 * code, database, hosting. Plus the operator-responsibility note. Every app shows this page;
 * the launcher additionally lets the operator save a repository and connect another project.
 */
export function ConnectionsPanel({ appLabel, supabase, repoUrl, onSaveRepo, children }: ConnectionsPanelProps) {
  const version = useVersionCheck();
  const who = appLabel.startsWith('Yare') ? appLabel : 'This app';
  // Sits between the steps and the buttons: which version runs here, and whether the repository holds a newer one.
  const versionNotice = version && (
    version.latest && version.latest !== version.current
      ? <Notice status="success" icon={false} title="A newer version is out">{who} runs v{version.current}; the repository is at v{version.latest}. Pull the latest into your copy and deploy again to get it.</Notice>
      : version.latest
        ? <Notice status="success" icon={false} title="Up to date">{who} runs v{version.current}, the latest in the repository.</Notice>
        : <Notice status="success" icon={false} title={version.unreachable ? 'Your version' : 'Checking'}>{who} runs v{version.current}.{version.unreachable ? ' The repository could not be reached to compare.' : ' Comparing with the repository…'}</Notice>
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectOpen, setConnectOpen] = useState(false);
  const ref = supabase ? projectRef(supabase.url) : null;

  async function saveRepo(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = String(new FormData(e.currentTarget).get('repo') ?? '').trim();
    setError(null);
    setPending(true);
    try {
      await onSaveRepo?.(value || null);
      toast.success(value ? 'Repository saved' : 'Repository cleared');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="gap-4 p-5">
        <div className="flex items-center gap-3">
          <GithubLogoIcon size={28} />
          <div>
            <h3 className="text-lg">Code</h3>
            <p className="text-sm text-muted">Your copy of the repository.</p>
          </div>
        </div>
        {versionNotice}
        <Steps items={[
          'Sign in to GitHub, or create a free account.',
          'Fork the Yare Monster repository so you have your own copy.',
          onSaveRepo ? 'Paste the address of your copy below. The setup guide will clone it.' : 'Deploy from your copy so the code you run is yours.',
        ]} />
        {onSaveRepo ? (
          <Form onSubmit={saveRepo} className="flex flex-1 flex-col gap-3">
            <TextField name="repo" type="url" fullWidth defaultValue={repoUrl ?? ''} pattern="https://github\.com/.*">
              <Label>Repository address</Label>
              <Input placeholder="https://github.com/you/yare" inputMode="url" />
              <Description>Leave empty to use the official repository.</Description>
              <FieldError />
            </TextField>
            {error && <Notice status="danger" title="Could not save">{error}</Notice>}
            <div className="mt-auto grid grid-cols-2 gap-2">
              <Button type="submit" variant="primary" fullWidth isPending={pending}>Save</Button>
              <Button variant="outline" fullWidth onPress={() => window.open(YARE.repo, '_blank', 'noopener,noreferrer')}>Official repo <ArrowSquareOutIcon /></Button>
            </div>
          </Form>
        ) : (
          <>
            <div className="mt-auto grid grid-cols-2 gap-2">
              {repoUrl && <Button variant="primary" fullWidth onPress={() => window.open(repoUrl, '_blank', 'noopener,noreferrer')}>Your copy <ArrowSquareOutIcon /></Button>}
              <Button variant="outline" fullWidth className={repoUrl ? '' : 'col-span-2'} onPress={() => window.open(YARE.repo, '_blank', 'noopener,noreferrer')}>Official repo <ArrowSquareOutIcon /></Button>
            </div>
          </>
        )}
      </Card>

      <Card className="gap-4 p-5">
        <div className="flex items-center gap-3">
          <DatabaseIcon size={28} />
          <div>
            <h3 className="text-lg">Database</h3>
            <p className="text-sm text-muted">Your Supabase project.</p>
          </div>
        </div>
        {supabase ? (
          <>
            <Notice status="success" icon={false} title="Connected">
              {supabase.isDefault
                ? `Your apps keep their data in the same Supabase project as ${appLabel}${ref ? ` (${ref})` : ''}. One project is enough for all of them.`
                : `Your apps keep their data in the Supabase project you connected${ref ? ` (${ref})` : ''}. One project is enough for all of them.`}
            </Notice>
            <Value label="Project URL" value={supabase.url} />
            <Value label="Publishable key" value={supabase.publishableKey} />
            <p className="text-xs text-muted">
              These two values are safe to share; they only open the door that your sign-in unlocks. Your database password stays with you and is asked for during setup.
            </p>
            <div className="mt-auto grid grid-cols-2 gap-2">
              {supabase.onConnect && <Button variant="primary" fullWidth onPress={() => setConnectOpen(true)}><PlugsConnectedIcon /> Connect</Button>}
              <Button variant="outline" fullWidth className={supabase.onConnect ? '' : 'col-span-2'} aria-label="Open Supabase" onPress={() => window.open(ref ? `https://supabase.com/dashboard/project/${ref}` : 'https://supabase.com/dashboard', '_blank', 'noopener,noreferrer')}>
                {supabase.onConnect ? 'Open' : 'Open Supabase'} <ArrowSquareOutIcon />
              </Button>
            </div>
            {supabase.onConnect && (
              <ConnectSupabaseDialog
                key={String(connectOpen)}
                isOpen={connectOpen}
                onOpenChange={setConnectOpen}
                current={{ url: supabase.url, key: supabase.publishableKey }}
                isDefault={supabase.isDefault}
                onSubmit={async (values) => { await supabase.onConnect!(values); toast.success(values ? 'Supabase connected' : `Back to ${appLabel}'s project`); }}
              />
            )}
          </>
        ) : (
          <>
            <Notice status="default" icon={false} title="No database">
              {appLabel} keeps nothing on a server. It is published as plain pages, so there is no Supabase project to connect.
            </Notice>
            <Button variant="outline" fullWidth className="mt-auto" onPress={() => window.open('https://supabase.com', '_blank', 'noopener,noreferrer')}>
              About Supabase <ArrowSquareOutIcon />
            </Button>
          </>
        )}
      </Card>

      <Card className="gap-4 p-5">
        <div className="flex items-center gap-3">
          <CloudIcon size={28} />
          <div>
            <h3 className="text-lg">Hosting</h3>
            <p className="text-sm text-muted">Your Cloudflare account.</p>
          </div>
        </div>
        <Notice status="success" icon={false} title="Nothing stored">Nothing about your Cloudflare account is kept here. The app only runs on it.</Notice>
        <Steps items={[
          'Sign in to Cloudflare, or create a free account.',
          'Each app deploys from its folder with one command; your assistant runs it and Cloudflare asks you to sign in.',
          'Optional: give an app your own domain under Worker → Settings → Domains & Routes.',
        ]} />
        <Button variant="outline" fullWidth className="mt-auto" onPress={() => window.open('https://dash.cloudflare.com/', '_blank', 'noopener,noreferrer')}>
          Open Cloudflare <ArrowSquareOutIcon />
        </Button>
      </Card>
    </div>

    {children}

    <Card className="flex-row items-center gap-6 p-5">
      <img src={monsterSrc('puzzled')} alt="" className="hidden h-28 w-auto flex-none sm:block" draggable={false} />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg">All yours, including the small print</h3>
          <Button variant="outline" size="sm" onPress={() => window.open(yareLicenceUrl, '_blank', 'noopener,noreferrer')}>
            Read the licence <ArrowSquareOutIcon />
          </Button>
        </div>
        <p className="text-sm text-muted">
          Everything you connect here is your own: your code, your database, your hosting, your domains, your bills. Yare Monster never sees your accounts, your keys or your data, and it does not run or watch your apps. That also means the care is yours: check what you deploy, keep your passwords to yourself, make backups, and know that free plans have limits. The software comes as it is, with no promise it fits your situation.
        </p>
      </div>
    </Card>
    </div>
  );
}
