import type { ReactNode } from 'react';
import { YareMark } from './YareLogo';

export interface MonsterNoteProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

/** A quiet callout with the monster head: a caveat, a hint, a reassurance. Softer than a Notice, friendlier than plain text. */
export function MonsterNote({ title, children, className }: MonsterNoteProps) {
  return (
    <div className={['yare-monster-note', className].filter(Boolean).join(' ')} role="note">
      <YareMark size={40} className="yare-monster-note__mark" />
      <div className="yare-monster-note__body">
        {title && <div className="yare-monster-note__title">{title}</div>}
        <div className="yare-monster-note__text">{children}</div>
      </div>
    </div>
  );
}
