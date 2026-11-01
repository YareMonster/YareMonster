import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { toast } from '@heroui/react';
import type { Client, Wallet } from '../lib/supabase';
import type { Network } from '../lib/networks';
import { addWallet, listWallets, savedKeyStatus, setServiceKey, syncStatus, syncWallet, type ServiceId, type SyncStatus } from '../lib/crypto-api';

export type KeysState = { status: 'checking' } | { status: 'ready'; keys: SyncStatus } | { status: 'missing'; keys: SyncStatus } | { status: 'error'; detail: string };

interface Ctx {
  db: Client;
  wallets: Wallet[] | null;
  error: string | null;
  refresh: () => Promise<void>;
  create: (w: { name: string; network: Network; address: string }) => Promise<Wallet>;
  patch: (w: Wallet) => void;
  remove: (id: string) => void;
  /** Runs the sync for one wallet and refreshes the list when it ends. */
  sync: (id: string) => Promise<void>;
  syncing: Set<string>;
  /** A counter that bumps when any sync finishes, so pages reload their data. */
  dataVersion: number;
  keys: KeysState;
  recheckKeys: () => Promise<void>;
  saveKey: (service: ServiceId, value: string) => Promise<void>;
}

const WalletsContext = createContext<Ctx | null>(null);
const STALE_MS = 60 * 60 * 1000;

export function WalletsProvider({ db, children }: { db: Client; children: ReactNode }) {
  const [wallets, setWallets] = useState<Wallet[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<Set<string>>(new Set());
  const [dataVersion, setDataVersion] = useState(0);
  const [keys, setKeys] = useState<KeysState>({ status: 'checking' });
  const autoSynced = useRef(new Set<string>());

  const refresh = useCallback(async () => {
    try { setWallets(await listWallets(db)); setError(null); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not load your wallets.'); }
  }, [db]);
  useEffect(() => { void refresh(); }, [refresh]);

  const recheckKeys = useCallback(async () => {
    setKeys({ status: 'checking' });
    try {
      // The function knows about pasted keys and project secrets alike; the database alone knows the pasted ones.
      const k = await syncStatus(db).catch(async (err) => { const saved = await savedKeyStatus(db); if (!saved.etherscan) throw err; return saved; });
      setKeys(k.etherscan ? { status: 'ready', keys: k } : { status: 'missing', keys: k });
    } catch (err) {
      setKeys({ status: 'error', detail: err instanceof Error ? err.message : 'The sync function did not answer.' });
    }
  }, [db]);
  const saveKey = useCallback(async (service: ServiceId, value: string) => { await setServiceKey(db, service, value); await recheckKeys(); }, [db, recheckKeys]);
  useEffect(() => { void recheckKeys(); }, [recheckKeys]);

  const sync = useCallback(async (id: string) => {
    setSyncing((s) => new Set(s).add(id));
    try {
      const r = await syncWallet(db, id);
      if (!r.ok) throw new Error(r.error ?? 'The sync failed.');
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : 'The sync failed.');
    } finally {
      setSyncing((s) => { const n = new Set(s); n.delete(id); return n; });
      await refresh();
      setDataVersion((v) => v + 1);
    }
  }, [db, refresh]);

  // Wallets never synced, or stale for an hour, refresh themselves once per visit when the key is in place.
  useEffect(() => {
    if (keys.status !== 'ready' || !wallets) return;
    for (const w of wallets) {
      if (autoSynced.current.has(w.id) || syncing.has(w.id)) continue;
      const stale = !w.last_synced_at || Date.now() - new Date(w.last_synced_at).getTime() > STALE_MS;
      if (w.status === 'syncing' && w.last_synced_at && Date.now() - new Date(w.updated_at).getTime() < 5 * 60 * 1000) continue;
      if (stale) { autoSynced.current.add(w.id); void sync(w.id); }
    }
  }, [keys.status, wallets, sync, syncing]);

  const create = useCallback(async (w: { name: string; network: Network; address: string }) => {
    const created = await addWallet(db, w, wallets?.length ?? 0);
    setWallets((list) => [...(list ?? []), created]);
    if (keys.status === 'ready') void sync(created.id);
    return created;
  }, [db, wallets, keys.status, sync]);
  const patch = useCallback((w: Wallet) => setWallets((list) => (list ?? []).map((x) => (x.id === w.id ? w : x))), []);
  const remove = useCallback((id: string) => { setWallets((list) => (list ?? []).filter((x) => x.id !== id)); setDataVersion((v) => v + 1); }, []);

  return (
    <WalletsContext.Provider value={{ db, wallets, error, refresh, create, patch, remove, sync, syncing, dataVersion, keys, recheckKeys, saveKey }}>
      {children}
    </WalletsContext.Provider>
  );
}

export function useWallets(): Ctx {
  const ctx = useContext(WalletsContext);
  if (!ctx) throw new Error('useWallets needs WalletsProvider');
  return ctx;
}
