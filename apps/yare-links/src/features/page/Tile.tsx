import { CheckIcon, XIcon } from '@phosphor-icons/react';

/** One choice among a few: a swatch or a picture with a word under it. The same tile on every tab. */
export function Tile({ on, label, onClick, children, remove, removeLabel = 'Remove', disabled }: { on: boolean; label: string; onClick: () => void; children: React.ReactNode; remove?: () => void; removeLabel?: string; /** Greyed out, not pressable: the choice exists, the block cannot take it right now. */ disabled?: boolean }) {
  return (
    <div className="relative">
      <button type="button" role="radio" aria-checked={on} aria-disabled={disabled || undefined} disabled={disabled} className="yare-pick !min-h-0 w-full !p-2 disabled:cursor-not-allowed disabled:opacity-40" aria-label={label} onClick={onClick}>
        <span className="flex w-full flex-col gap-1.5">
          <span className="grid h-12 w-full place-items-center overflow-hidden rounded-(--yare-radius-control) border border-black/5">{children}</span>
          <span className="text-xs font-semibold">{label}</span>
        </span>
        {on && <CheckIcon weight="bold" className="yare-pick__check" />}
      </button>
      {on && remove && <button type="button" className="absolute top-1 left-1 grid size-6 place-items-center rounded-full bg-overlay text-muted shadow hover:text-foreground" aria-label={removeLabel} onClick={remove}><XIcon className="size-3.5" weight="bold" /></button>}
    </div>
  );
}
