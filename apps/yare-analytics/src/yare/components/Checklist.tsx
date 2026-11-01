import type { ReactNode } from 'react';
import { CheckIcon } from '@phosphor-icons/react';

export interface ChecklistItem {
  id: string;
  title: string;
  /** One line under the title. */
  detail?: ReactNode;
  done: boolean;
}

export interface ChecklistProps {
  items: ChecklistItem[];
  onToggle: (id: string, done: boolean) => void;
  isDisabled?: boolean;
  className?: string;
}

/** Steps a person ticks off at their own pace: a setup, a launch, a move. Each row is a real button. */
export function Checklist({ items, onToggle, isDisabled, className }: ChecklistProps) {
  const done = items.filter((i) => i.done).length;
  return (
    <div className={['yare-checklist', className].filter(Boolean).join(' ')}>
      <div className="yare-checklist__progress" role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={items.length} aria-label="Steps done">
        <div style={{ width: `${items.length ? (done / items.length) * 100 : 0}%` }} />
      </div>
      <ol className="yare-checklist__list">
        {items.map((it, i) => (
          <li key={it.id}>
            <button type="button" className="yare-checklist__row" role="checkbox" aria-checked={it.done} disabled={isDisabled} onClick={() => onToggle(it.id, !it.done)}>
              <span className="yare-checklist__box" aria-hidden="true">{it.done ? <CheckIcon weight="bold" /> : <span className="yare-checklist__n">{i + 1}</span>}</span>
              <span className="yare-checklist__text">
                <span className="yare-checklist__title">{it.title}</span>
                {it.detail && <span className="yare-checklist__detail">{it.detail}</span>}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
