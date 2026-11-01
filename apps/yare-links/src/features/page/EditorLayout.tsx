import type { ReactNode } from 'react';
import type { Block, Client, Page } from '../../lib/supabase';
import { Preview } from './Preview';

/** Half and half: the settings on the left, the phone in a frame on the right, staying in view while you scroll. */
export function EditorLayout({ db, page, blocks, aside, children }: { db: Client; page: Page; blocks: Block[]; aside?: ReactNode; children: ReactNode }) {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <div className="flex min-w-0 flex-col gap-4">{children}</div>
      <div className="yare-phone-dock hidden lg:block">
        <div className="yare-phone-stage">{aside ?? <Preview db={db} page={page} blocks={blocks} />}</div>
      </div>
    </div>
  );
}
