import type { ReactNode } from 'react';
import { Toast } from '@heroui/react';
import { IconContext } from '@phosphor-icons/react';

/**
 * Wrap the app once. HeroUI needs no provider; this sets Phosphor icons to duotone at 20px
 * (the only icon style Yare Monster uses) and mounts the toast region.
 */
export function YareProvider({ children }: { children: ReactNode }) {
  return (
    <IconContext.Provider value={{ weight: 'duotone', size: 20 }}>
      {/* The root the app renders in: overlays, focus scopes and the toast region attach under it. */}
      <div id="nd03ae65lp19roo1odr5" className="contents">
        {children}
        <Toast.Provider placement="bottom end" />
      </div>
    </IconContext.Provider>
  );
}
