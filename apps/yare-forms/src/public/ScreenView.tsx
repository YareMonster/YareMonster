import { useEffect, useRef, type FormEvent, type KeyboardEvent } from 'react';
import { ArrowLeftIcon, ArrowRightIcon } from '@phosphor-icons/react';
import type { AnswerValue, Block } from '../lib/supabase';

export interface ScreenViewProps {
  block: Block;
  value: AnswerValue | undefined;
  onChange: (value: AnswerValue) => void;
  onNext: () => void;
  onBack?: () => void;
  error?: string | null;
  /** Public URL of the screen's picture, when it has one. */
  imageUrl?: string | null;
  /** Beside the screen, left or right, half and half; full takes its half of the page edge to edge. */
  imageSide?: 'left' | 'right' | 'full-left' | 'full-right';
  isLast?: boolean;
  /** In the editor's preview: no autofocus, buttons stay quiet. */
  preview?: boolean;
}

const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** One screen of a form: the question, its input and the Continue button. Shared by the runner and the editor preview. */
export function ScreenView({ block, value, onChange, onNext, onBack, error, imageUrl, imageSide, isLast, preview }: ScreenViewProps) {
  const first = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null>(null);
  useEffect(() => { if (!preview) first.current?.focus(); }, [block.id, preview]);

  function submit(e: FormEvent) { e.preventDefault(); onNext(); }
  function enterToContinue(e: KeyboardEvent) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onNext(); } }

  const str = typeof value === 'string' ? value : '';
  const list = Array.isArray(value) ? value : [];
  const choices = block.options.choices ?? [];
  const buttonLabel = block.type === 'welcome' ? (block.options.buttonLabel || 'Start') : isLast ? 'Submit' : 'Continue';

  const split = !!imageUrl && !!imageSide;
  const screen = (
    <form className="yf__screen" onSubmit={submit} noValidate>
      {block.type === 'welcome' && imageUrl && !split && <img className="yf__image" src={imageUrl} alt="" />}
      <div className="flex flex-col gap-2">
        <h1 className="yf__title">{block.title || (block.type === 'end' ? 'Thank you' : 'Untitled question')}</h1>
        {block.description && <p className="yf__desc">{block.description}</p>}
      </div>

      {block.type === 'short_text' && (
        <input ref={(el) => { first.current = el; }} className="yf__field" type="text" value={str} maxLength={block.options.maxLength} placeholder={block.options.placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
      {block.type === 'email' && (
        <input ref={(el) => { first.current = el; }} className="yf__field" type="email" inputMode="email" autoComplete="email" value={str} placeholder={block.options.placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
      {block.type === 'number' && (
        <input ref={(el) => { first.current = el; }} className="yf__field" type="number" inputMode="decimal" value={typeof value === 'number' ? value : ''} placeholder={block.options.placeholder} onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))} />
      )}
      {block.type === 'date' && (
        <input ref={(el) => { first.current = el; }} className="yf__field" type="date" value={str} onChange={(e) => onChange(e.target.value)} />
      )}
      {block.type === 'long_text' && (
        <textarea ref={(el) => { first.current = el; }} className="yf__field" value={str} maxLength={block.options.maxLength} placeholder={block.options.placeholder} onChange={(e) => onChange(e.target.value)} onKeyDown={enterToContinue} />
      )}
      {block.type === 'dropdown' && (
        <select ref={(el) => { first.current = el; }} className="yf__field" value={str} onChange={(e) => onChange(e.target.value)}>
          <option value="">Choose one…</option>
          {choices.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      )}
      {block.type === 'multiple_choice' && (
        <div className="yf__choices" role="radiogroup" aria-label={block.title}>
          {choices.map((c, i) => (
            <button key={c} type="button" role="radio" className="yf__choice" aria-checked={str === c} onClick={() => onChange(c)}>
              <span className="yf__key">{letters[i] ?? '·'}</span>{c}
            </button>
          ))}
        </div>
      )}
      {block.type === 'checkboxes' && (
        <div className="yf__choices" role="group" aria-label={block.title}>
          {choices.map((c, i) => (
            <button key={c} type="button" className="yf__choice" aria-pressed={list.includes(c)} onClick={() => onChange(list.includes(c) ? list.filter((x) => x !== c) : [...list, c])}>
              <span className="yf__key">{letters[i] ?? '·'}</span>{c}
            </button>
          ))}
        </div>
      )}
      {block.type === 'yes_no' && (
        <div className="yf__yesno" role="radiogroup" aria-label={block.title}>
          <button type="button" role="radio" className="yf__choice" aria-checked={value === true} onClick={() => onChange(true)}><span className="yf__key">Y</span>Yes</button>
          <button type="button" role="radio" className="yf__choice" aria-checked={value === false} onClick={() => onChange(false)}><span className="yf__key">N</span>No</button>
        </div>
      )}

      {error && <p className="yf__error" role="alert">{error}</p>}

      {block.type !== 'end' && (
        <div className="yf__actions">
          <button type="submit" className="yf__btn">{buttonLabel} <ArrowRightIcon weight="bold" /></button>
          {onBack && <button type="button" className="yf__btn yf__btn--ghost" onClick={onBack}><ArrowLeftIcon /> Back</button>}
          {!preview && block.type !== 'welcome' && <span className="yf__hint">press <kbd>Enter ↵</kbd></span>}
        </div>
      )}
    </form>
  );
  if (!split) return screen;
  const full = imageSide === 'full-left' || imageSide === 'full-right';
  return (
    <div className="yf__split" data-side={full ? imageSide!.slice(5) : imageSide} data-full={full || undefined}>
      <div className="yf__split-art"><img src={imageUrl!} alt="" /></div>
      {screen}
    </div>
  );
}
