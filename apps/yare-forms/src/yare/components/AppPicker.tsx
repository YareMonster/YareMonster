import { CheckCircleIcon } from '@phosphor-icons/react';
import { appLogoSrc } from '../brand';
import type { CatalogEntry } from '../catalog';

/** A grid of app lockups that toggle on and off. The lockup already names the app, so there is no label; a check marks the selected ones. */
export function AppPicker({ apps, selected, onChange }: { apps: CatalogEntry[]; selected: Set<string>; onChange: (next: Set<string>) => void }) {
  function toggle(slug: string) {
    const next = new Set(selected);
    if (next.has(slug)) next.delete(slug); else next.add(slug);
    onChange(next);
  }
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-label="Apps to include">
      {apps.map((app) => {
        const on = selected.has(app.slug);
        return (
          <button
            key={app.slug}
            type="button"
            className="yare-pick"
            aria-pressed={on}
            aria-label={app.name}
            onClick={() => toggle(app.slug)}
          >
            <img src={appLogoSrc(app.slug)} alt="" className="h-11 w-auto" draggable={false} />
            {on && <CheckCircleIcon weight="fill" className="yare-pick__check" aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  );
}
