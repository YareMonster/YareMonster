import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { toast } from '@heroui/react';

export type SaveState = 'saved' | 'saving' | 'error';

interface Ctx {
  state: SaveState;
  /** Runs a save; the top bar shows Saving… then All changes saved, or an error toast. */
  run: <T>(work: () => Promise<T>, failMessage?: string) => Promise<T | undefined>;
}

const SaveStatusContext = createContext<Ctx>({ state: 'saved', run: async (w) => w() });

export function SaveStatusProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SaveState>('saved');
  const inflight = useRef(0);
  const run = useCallback(async <T,>(work: () => Promise<T>, failMessage = 'Could not save that change.') => {
    inflight.current += 1;
    setState('saving');
    try {
      const out = await work();
      inflight.current -= 1;
      if (inflight.current === 0) setState('saved');
      return out;
    } catch (err) {
      inflight.current -= 1;
      setState('error');
      toast.danger(err instanceof Error ? err.message : failMessage);
      return undefined;
    }
  }, []);
  return <SaveStatusContext.Provider value={{ state, run }}>{children}</SaveStatusContext.Provider>;
}

export const useSaveStatus = () => useContext(SaveStatusContext);

/** Debounces a value by `ms` and calls `onSettle` when it stops changing. */
export function useDebouncedCallback<A extends unknown[]>(fn: (...args: A) => void, ms = 600) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(fn);
  latest.current = fn;
  return useCallback((...args: A) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => latest.current(...args), ms);
  }, [ms]);
}

/**
 * Debounces small patches and saves them merged, so typing a name, tabbing and typing a surname
 * within the delay saves both. Flushes whatever is pending when the component unmounts.
 */
export function useDebouncedPatch<P extends object>(fn: (patch: P) => void, ms = 600) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<P | null>(null);
  const latest = useRef(fn);
  latest.current = fn;
  const flush = useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    if (pending.current) { const p = pending.current; pending.current = null; latest.current(p); }
  }, []);
  useEffect(() => flush, [flush]);
  const push = useCallback((patch: P) => {
    pending.current = { ...(pending.current ?? {}), ...patch } as P;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, ms);
  }, [flush, ms]);
  return push;
}
