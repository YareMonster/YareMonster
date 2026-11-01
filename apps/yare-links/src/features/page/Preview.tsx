import { PhonePreview } from '../../yare';
import type { Block, Client, Page, PublicBlock, PublicPage } from '../../lib/supabase';
import { imageUrl, mediaUrl } from '../../lib/supabase';
import { fetchFeed } from '../../lib/links-api';
import { GridScreen } from '../../grid/GridScreen';

export const toPublic = (page: Page, blocks: Block[]): PublicPage => ({ ...page, redirect_url: null, blocks: blocks.filter((b) => !b.archived) as unknown as PublicBlock[] });

/** The page in a phone frame, as a visitor would see it right now, with every block shown. */
export function Preview({ db, page, blocks }: { db: Client; page: Page; blocks: Block[] }) {
  return (
    <PhonePreview label="How the page looks" scrollKey={page.id}>
      <GridScreen page={toPublic(page, blocks)} ctx={{ imageUrl: (p) => imageUrl(db, p), mediaUrl: (p) => mediaUrl(db, p), edit: true, feed: (k, u, n) => fetchFeed(db, k, u, n) }} />
    </PhonePreview>
  );
}
