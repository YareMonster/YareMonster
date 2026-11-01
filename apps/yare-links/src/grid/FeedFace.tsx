import { useEffect, useState } from 'react';
import type { PublicBlock } from '../lib/supabase';
import type { FeedItem } from '../lib/links-api';
import type { FaceContext } from './BlockFace';
import { feedKind } from '../lib/grid';

/** The latest videos of a channel, posts of a Substack or episodes of a podcast, as many rows as the block has room for. */
export function FeedFace({ block: b, ctx }: { block: PublicBlock; ctx: FaceContext }) {
  const kind = feedKind(b.type);
  const rows = Math.max(1, b.h - (b.title ? 1 : 0));
  const [items, setItems] = useState<FeedItem[] | null | 'error'>(null);
  useEffect(() => {
    let gone = false;
    if (!ctx.feed) { setItems([]); return; }
    ctx.feed(kind, b.url, rows).then((list) => { if (!gone) setItems(list); }).catch(() => { if (!gone) setItems('error'); });
    return () => { gone = true; };
  }, [kind, b.url, rows]); // eslint-disable-line react-hooks/exhaustive-deps
  const when = (iso: string) => { const d = new Date(iso); return isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }); };
  return (
    <span className="yg-feed">
      {b.title && <span className="yg-block__title yg-feed__title">{b.title}</span>}
      {items === null && <span className="yg-feed__note">Loading…</span>}
      {items === 'error' && <span className="yg-feed__note">{kind === 'youtube' ? 'The channel could not be read.' : kind === 'podcast' ? 'The podcast could not be read.' : 'The feed could not be read.'}</span>}
      {Array.isArray(items) && items.length === 0 && <span className="yg-feed__note">{ctx.edit ? (b.url ? 'Nothing here yet.' : kind === 'youtube' ? 'Paste the channel address in Link.' : kind === 'podcast' ? 'Paste the podcast RSS address in Link.' : 'Paste the Substack address in Link.') : 'Nothing here yet.'}</span>}
      {Array.isArray(items) && items.slice(0, rows).map((it) => (
        <a key={it.id} className="yg-feed__item" href={it.url} target="_blank" rel="noopener noreferrer" onClick={(e) => { if (ctx.edit) e.preventDefault(); else e.stopPropagation(); }}>
          {it.image ? <img className="yg-feed__thumb" src={it.image} alt="" loading="lazy" /> : <span className="yg-feed__thumb" />}
          <span className="yg-feed__words"><span className="yg-feed__name">{it.title}</span>{it.date && <span className="yg-feed__date">{when(it.date)}</span>}</span>
        </a>
      ))}
    </span>
  );
}
