import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Client, Envelope, Settings } from '../lib/supabase';
import { createEnvelope, email, getSettings, listEnvelopes, type EmailResult } from '../lib/sign-api';

export type EmailState = { status: 'checking' } | { status: 'ready'; from: string } | { status: 'missing' } | { status: 'error'; detail: string };

interface Ctx {
  db: Client;
  envelopes: Envelope[] | null;
  error: string | null;
  refresh: () => Promise<void>;
  create: (title?: string) => Promise<Envelope>;
  /** Replaces one envelope in the list after an edit, without a round trip. */
  patch: (envelope: Envelope) => void;
  remove: (id: string) => void;
  settings: Settings | null;
  setSettings: (s: Settings) => void;
  /** Whether this deployment can send email, asked once from the Edge Function. */
  emailState: EmailState;
  recheckEmail: () => Promise<void>;
}

const EnvelopesContext = createContext<Ctx | null>(null);

export function EnvelopesProvider({ db, children }: { db: Client; children: ReactNode }) {
  const [envelopes, setEnvelopes] = useState<Envelope[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [emailState, setEmailState] = useState<EmailState>({ status: 'checking' });

  const refresh = useCallback(async () => {
    try { setEnvelopes(await listEnvelopes(db)); setError(null); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not load your documents.'); }
  }, [db]);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => { getSettings(db).then(setSettings).catch(() => undefined); }, [db]);

  const recheckEmail = useCallback(async () => {
    setEmailState({ status: 'checking' });
    try {
      const r: EmailResult = await email(db, { action: 'status' });
      setEmailState(r.configured ? { status: 'ready', from: r.from ?? '' } : { status: 'missing' });
    } catch (err) {
      setEmailState({ status: 'error', detail: err instanceof Error ? err.message : 'The email function did not answer.' });
    }
  }, [db]);
  useEffect(() => { void recheckEmail(); }, [recheckEmail]);

  const create = useCallback(async (title?: string) => {
    const e = await createEnvelope(db, title);
    setEnvelopes((list) => [e, ...(list ?? [])]);
    return e;
  }, [db]);
  const patch = useCallback((e: Envelope) => setEnvelopes((list) => (list ?? []).map((x) => (x.id === e.id ? e : x)).sort((a, b) => b.updated_at.localeCompare(a.updated_at))), []);
  const remove = useCallback((id: string) => setEnvelopes((list) => (list ?? []).filter((x) => x.id !== id)), []);

  return (
    <EnvelopesContext.Provider value={{ db, envelopes, error, refresh, create, patch, remove, settings, setSettings, emailState, recheckEmail }}>
      {children}
    </EnvelopesContext.Provider>
  );
}

export function useEnvelopes(): Ctx {
  const ctx = useContext(EnvelopesContext);
  if (!ctx) throw new Error('useEnvelopes needs EnvelopesProvider');
  return ctx;
}
