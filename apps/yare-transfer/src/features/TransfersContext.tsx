import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Client, Settings, Transfer } from '../lib/supabase';
import { cleanupExpired, createTransfer, getSettings, listTransfers } from '../lib/transfer-api';

interface Ctx {
  db: Client;
  transfers: Transfer[] | null;
  error: string | null;
  refresh: () => Promise<void>;
  create: (title?: string) => Promise<Transfer>;
  patch: (t: Transfer) => void;
  remove: (id: string) => void;
  settings: Settings | null;
  setSettings: (s: Settings) => void;
  /** The largest file the app accepts, in bytes. */
  maxBytes: number;
}

const TransfersContext = createContext<Ctx | null>(null);

export function TransfersProvider({ db, children }: { db: Client; children: ReactNode }) {
  const [transfers, setTransfers] = useState<Transfer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);

  const refresh = useCallback(async () => {
    try { setTransfers(await listTransfers(db)); setError(null); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not load your transfers.'); }
  }, [db]);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => { getSettings(db).then(setSettings).catch(() => undefined); }, [db]);
  // Expired transfers lose their files when the owner opens the app. Best effort.
  useEffect(() => { cleanupExpired(db).then((n) => { if (n > 0) void refresh(); }).catch(() => undefined); }, [db, refresh]);

  const create = useCallback(async (title?: string) => {
    const t = await createTransfer(db, title);
    setTransfers((list) => [t, ...(list ?? [])]);
    return t;
  }, [db]);
  const patch = useCallback((t: Transfer) => setTransfers((list) => (list ?? []).map((x) => (x.id === t.id ? t : x)).sort((a, b) => b.updated_at.localeCompare(a.updated_at))), []);
  const remove = useCallback((id: string) => setTransfers((list) => (list ?? []).filter((x) => x.id !== id)), []);

  return <TransfersContext.Provider value={{ db, transfers, error, refresh, create, patch, remove, settings, setSettings, maxBytes: (settings?.max_file_mb ?? 20) * 1048576 }}>{children}</TransfersContext.Provider>;
}

export function useTransfers(): Ctx {
  const ctx = useContext(TransfersContext);
  if (!ctx) throw new Error('useTransfers needs TransfersProvider');
  return ctx;
}
