import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { toast } from '@heroui/react';
import type { Client, Site } from '../lib/supabase';
import { addSite, listSites, savedKeyStatus, setServiceKey, syncSite, syncStatus } from '../lib/pages-api';

export type KeyState = { status: 'checking' } | { status: 'ready' } | { status: 'missing' } | { status: 'error'; detail: string };

interface Ctx {
  db: Client;
  sites: Site[] | null;
  error: string | null;
  refresh: () => Promise<void>;
  create: (s: { name: string; url: string; kind: Site['kind']; repoUrl?: string }) => Promise<Site>;
  patch: (s: Site) => void;
  remove: (id: string) => void;
  sync: (id: string) => Promise<void>;
  syncing: Set<string>;
  /** Bumps when a sync ends, so pages reload their data. */
  dataVersion: number;
  key: KeyState;
  saveKey: (value: string) => Promise<void>;
}

const SitesContext = createContext<Ctx | null>(null);
const STALE_MS = 6 * 60 * 60 * 1000;

export function SitesProvider({ db, children }: { db: Client; children: ReactNode }) {
  const [sites, setSites] = useState<Site[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<Set<string>>(new Set());
  const [dataVersion, setDataVersion] = useState(0);
  const [key, setKey] = useState<KeyState>({ status: 'checking' });
  const autoSynced = useRef(new Set<string>());

  const refresh = useCallback(async () => {
    try { setSites(await listSites(db)); setError(null); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not load your websites.'); }
  }, [db]);
  useEffect(() => { void refresh(); }, [refresh]);

  const recheckKey = useCallback(async () => {
    setKey({ status: 'checking' });
    try {
      const k = await syncStatus(db).catch(async (err) => { const saved = await savedKeyStatus(db); if (!saved.cloudflare) throw err; return saved; });
      setKey(k.cloudflare ? { status: 'ready' } : { status: 'missing' });
    } catch (err) {
      setKey({ status: 'error', detail: err instanceof Error ? err.message : 'The sync function did not answer.' });
    }
  }, [db]);
  useEffect(() => { void recheckKey(); }, [recheckKey]);
  const saveKey = useCallback(async (value: string) => { await setServiceKey(db, value); await recheckKey(); }, [db, recheckKey]);

  const sync = useCallback(async (id: string) => {
    setSyncing((s) => new Set(s).add(id));
    try {
      const r = await syncSite(db, id);
      if (!r.ok) throw new Error(r.error ?? 'The read failed.');
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : 'The read failed.');
    } finally {
      setSyncing((s) => { const n = new Set(s); n.delete(id); return n; });
      await refresh();
      setDataVersion((v) => v + 1);
    }
  }, [db, refresh]);

  // Live sites refresh themselves once per visit when their figures are a few hours old.
  useEffect(() => {
    if (!sites) return;
    for (const s of sites) {
      if (!s.url || autoSynced.current.has(s.id) || syncing.has(s.id)) continue;
      const stale = !s.last_synced_at || Date.now() - new Date(s.last_synced_at).getTime() > STALE_MS;
      if (stale && (key.status === 'ready' || !s.last_synced_at)) { autoSynced.current.add(s.id); void sync(s.id); }
    }
  }, [key.status, sites, sync, syncing]);

  const create = useCallback(async (s: { name: string; url: string; kind: Site['kind']; repoUrl?: string }) => {
    const created = await addSite(db, s, sites?.length ?? 0);
    setSites((list) => [...(list ?? []), created]);
    if (created.url) void sync(created.id);
    return created;
  }, [db, sites, sync]);
  const patch = useCallback((s: Site) => setSites((list) => (list ?? []).map((x) => (x.id === s.id ? s : x))), []);
  const remove = useCallback((id: string) => { setSites((list) => (list ?? []).filter((x) => x.id !== id)); setDataVersion((v) => v + 1); }, []);

  return <SitesContext.Provider value={{ db, sites, error, refresh, create, patch, remove, sync, syncing, dataVersion, key, saveKey }}>{children}</SitesContext.Provider>;
}

export function useSites(): Ctx {
  const ctx = useContext(SitesContext);
  if (!ctx) throw new Error('useSites needs SitesProvider');
  return ctx;
}
