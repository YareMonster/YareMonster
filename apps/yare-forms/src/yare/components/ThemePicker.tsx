import { Label } from '@heroui/react';
import { CheckIcon } from '@phosphor-icons/react';
import { publicThemes } from '../public-themes';

/** The grid of nine swatches a public page can wear. One per app that has a public page. */
export function ThemePicker({ value, onChange, label = 'Theme' }: { value: string; onChange: (id: string) => void; label?: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-2 grid grid-cols-3 gap-2" role="radiogroup" aria-label={label}>
        {publicThemes.map((t) => (
          <button key={t.id} type="button" role="radio" className="yare-pick !min-h-0 !p-2" aria-checked={value === t.id} aria-pressed={value === t.id} aria-label={t.name} onClick={() => onChange(t.id)}>
            <span className="flex w-full flex-col gap-1.5">
              <span className="block h-12 w-full rounded-(--yare-radius-control) border border-black/5" style={{ background: t.vars.bg }}>
                <span className="mt-7 ml-2 block h-2.5 w-10 rounded-full" style={{ background: t.vars.accent }} />
              </span>
              <span className="text-xs font-semibold">{t.name}</span>
            </span>
            {value === t.id && <CheckIcon weight="bold" className="yare-pick__check" />}
          </button>
        ))}
      </div>
    </div>
  );
}
