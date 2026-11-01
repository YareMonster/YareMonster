import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Client, Page } from '../lib/supabase';
import { createPage, listPages } from '../lib/links-api';

interface Ctx {
  db: Client;
  pages: Page[] | null;
  error: string | null;
  refresh: () => Promise<void>;
  create: (title: string) => Promise<Page>;
  patch: (p: Page) => void;
  remove: (id: string) => void;
}

const PagesContext = createContext<Ctx | null>(null);

export function PagesProvider({ db, children }: { db: Client; children: ReactNode }) {
  const [pages, setPages] = useState<Page[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    try { setPages(await listPages(db)); setError(null); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not load your pages.'); }
  }, [db]);
  useEffect(() => { void refresh(); }, [refresh]);
  const create = useCallback(async (title: string) => { const p = await createPage(db, title); setPages((list) => [p, ...(list ?? [])]); return p; }, [db]);
  const patch = useCallback((p: Page) => setPages((list) => (list ?? []).map((x) => (x.id === p.id ? p : x)).sort((a, b) => b.updated_at.localeCompare(a.updated_at))), []);
  const remove = useCallback((id: string) => setPages((list) => (list ?? []).filter((x) => x.id !== id)), []);
  return <PagesContext.Provider value={{ db, pages, error, refresh, create, patch, remove }}>{children}</PagesContext.Provider>;
}

export function usePages(): Ctx {
  const ctx = useContext(PagesContext);
  if (!ctx) throw new Error('usePages needs PagesProvider');
  return ctx;
}
