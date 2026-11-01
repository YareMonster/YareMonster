import { useEffect, useState } from 'react';
import { YARE } from './brand';

/** Which app this is and which version, written into the bundle at build time by the app's vite.config.ts from its package.json. */
declare const __YARE_APP__: { slug: string; version: string } | undefined;
export const thisApp = (): { slug: string; version: string } | null => (typeof __YARE_APP__ === 'undefined' ? null : __YARE_APP__);

/** The published list of apps and their versions. */
export const catalogUrl = YARE.catalog;

export interface VersionCheck { current: string; latest: string | null; unreachable: boolean }

/** This app's version and the repository's, read fresh every time. Nothing stored, nothing hidden. */
export function useVersionCheck(): VersionCheck | null {
  const [latest, setLatest] = useState<string | null>(null);
  const [unreachable, setUnreachable] = useState(false);
  const app = thisApp();
  useEffect(() => {
    if (!app) return;
    let gone = false;
    fetch(catalogUrl, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null))
      .then((cat: { apps?: Array<{ slug: string; version: string }> } | null) => { if (gone) return; const v = cat?.apps?.find((a) => a.slug === app.slug)?.version ?? null; setLatest(v); setUnreachable(!v); })
      .catch(() => { if (!gone) setUnreachable(true); });
    return () => { gone = true; };
  }, [app?.slug]); // eslint-disable-line react-hooks/exhaustive-deps
  return app ? { current: app.version, latest, unreachable } : null;
}
