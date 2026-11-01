import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Client, Form } from '../lib/supabase';
import { createForm, listForms } from '../lib/forms-api';

interface Ctx {
  db: Client;
  forms: Form[] | null;
  error: string | null;
  refresh: () => Promise<void>;
  create: (title?: string) => Promise<Form>;
  /** Replaces one form in the list after an edit, without a round trip. */
  patch: (form: Form) => void;
  remove: (id: string) => void;
}

const FormsContext = createContext<Ctx | null>(null);

export function FormsProvider({ db, children }: { db: Client; children: ReactNode }) {
  const [forms, setForms] = useState<Form[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    try { setForms(await listForms(db)); setError(null); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not load your forms.'); }
  }, [db]);
  useEffect(() => { void refresh(); }, [refresh]);
  const create = useCallback(async (title?: string) => {
    const form = await createForm(db, title);
    setForms((list) => [form, ...(list ?? [])]);
    return form;
  }, [db]);
  const patch = useCallback((form: Form) => setForms((list) => (list ?? []).map((f) => (f.id === form.id ? form : f)).sort((a, b) => b.updated_at.localeCompare(a.updated_at))), []);
  const remove = useCallback((id: string) => setForms((list) => (list ?? []).filter((f) => f.id !== id)), []);
  return <FormsContext.Provider value={{ db, forms, error, refresh, create, patch, remove }}>{children}</FormsContext.Provider>;
}

export function useForms(): Ctx {
  const ctx = useContext(FormsContext);
  if (!ctx) throw new Error('useForms needs FormsProvider');
  return ctx;
}
