import type { ReactNode } from 'react';
import type { StatusTone } from './StatusChip';

export interface TimelineItem {
  id: string;
  title: ReactNode;
  detail?: ReactNode;
  /** ISO timestamp, shown as a local date and time. */
  at?: string | null;
  tone?: StatusTone;
}

/** A vertical list of what happened, newest first or oldest first as given: dot, line, title, time. */
export function Timeline({ items, className }: { items: TimelineItem[]; className?: string }) {
  return (
    <ol className={['yare-timeline', className].filter(Boolean).join(' ')}>
      {items.map((it) => (
        <li key={it.id} className="yare-timeline__item" data-tone={it.tone ?? 'default'}>
          <span className="yare-timeline__dot" aria-hidden="true" />
          <div className="yare-timeline__body">
            <div className="yare-timeline__title">{it.title}</div>
            {it.detail && <div className="yare-timeline__detail">{it.detail}</div>}
            {it.at && <time className="yare-timeline__time" dateTime={it.at}>{new Date(it.at).toLocaleString()}</time>}
          </div>
        </li>
      ))}
    </ol>
  );
}
