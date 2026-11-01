import { useState, type FormEvent, type ReactNode } from 'react';
import { ClipboardTextIcon, LockSimpleIcon, PlayIcon } from '@phosphor-icons/react';
import type { BlockOptions, PublicBlock } from '../lib/supabase';
import { fontById } from '../lib/fonts';
import { COLS, embedFor, feedFits, fits, formFits, frameFits, giphyFor, qrFits, readableOn, type FeedKind } from '../lib/grid';
import { FeedFace } from './FeedFace';
import { QrFace } from './QrFace';
import type { FeedItem } from '../lib/links-api';
import { iconById } from '../lib/icons';

export interface FaceContext {
  imageUrl: (path: string | null | undefined) => string | null;
  mediaUrl: (path: string | null | undefined) => string | null;
  unlocked?: Record<string, { url: string; options: BlockOptions }>;
  onOpen?: (block: PublicBlock, url: string) => void;
  onUnlock?: (block: PublicBlock, code: string) => Promise<boolean>;
  /** The latest items of a channel, a publication or a podcast, for a feed block. */
  feed?: (kind: FeedKind, url: string, n: number) => Promise<FeedItem[]>;
  /** A visitor filled in a block that collects emails or messages. */
  onSubmit?: (block: PublicBlock, entry: Record<string, string>) => Promise<void>;
  /** In the editor: nothing opens, nothing counts, nothing plays. */
  edit?: boolean;
  /** The page's background, so words on a block without one still read. */
  pageBg?: string;
}

/**
 * One block, whatever its size. The background first; then, if the address plays and the block is
 * big enough, the player fills it; otherwise the icon, the title and the line that fit.
 */
export function BlockFace({ block: b, ctx, children }: { block: PublicBlock; ctx: FaceContext; children?: ReactNode }) {
  const unlocked = ctx.unlocked?.[b.id];
  const url = unlocked?.url ?? b.url;
  const [ageOk, setAgeOk] = useState(false);
  const locked = !ctx.edit && ((b.lock_kind === 'code' && !unlocked) || (b.lock_kind === 'age' && !ageOk));
  const bgVideo = b.options?.bgVideo || null;
  // A Giphy block's GIF is its background; an uploaded picture, if any, gives way to it.
  const gif = b.type === 'giphy' ? giphyFor(url) : null;
  const bgImage = gif ?? ctx.imageUrl(b.bg_path);
  const colour = b.bg_color || '#ffffff';
  const effect = b.effect ?? 'fill';
  // Words read against the fill or the glass tint; on an open block, against the page.
  const customFg = /^#[0-9a-f]{6}$/i.test(b.text_color) ? b.text_color : null;
  const tone = customFg ? (readableOn(customFg) === 'light' ? 'dark' : 'light') : b.text_color !== 'auto' ? b.text_color : bgImage || bgVideo ? 'light' : readableOn(effect === 'none' ? ctx.pageBg || '#f7f8fb' : colour);
  const embed = !locked ? embedFor(url, b.w, b.h) : null;
  const can = fits(b.w, b.h);
  const entry = iconById(b.icon);
  const own = ctx.imageUrl(b.thumbnail_path);
  const Icon = entry?.icon;
  const showIcon = can.icon && (!!Icon || !!own);
  const showTitle = can.title && !!b.title;
  const showSub = can.subtext && !!b.description;
  const hasWords = showIcon || showTitle || showSub;
  const common = {
    className: `yg-block${embed ? ' yg-block--embed' : ''}`,
    style: { background: effect === 'fill' ? colour : undefined, '--yg-tint': colour, ...(customFg ? { '--yg-block-fg': customFg } : {}), ...(b.font ? { '--yg-font': fontById(b.font).family } : {}), ...(b.radius != null ? { '--yg-radius': `${b.radius}px` } : {}) } as React.CSSProperties,
    'data-effect': effect !== 'fill' ? effect : undefined,
    'data-border': b.border ? 'true' : undefined,
    'data-size': b.text_size && b.text_size !== 'm' ? b.text_size : undefined,
    'data-icon-size': b.icon_size && b.icon_size !== 'm' ? b.icon_size : undefined,
    'data-sub-size': b.sub_size && b.sub_size !== 'm' ? b.sub_size : undefined,
    'data-valign': b.text_valign && b.text_valign !== 'bottom' ? b.text_valign : undefined,
    // Which screen edges the block runs to, when it bleeds: only the ones it sits against.
    'data-bleed': b.bleed ? [b.y === 0 ? 't' : '', b.x === 0 ? 'l' : '', b.x + b.w >= COLS ? 'r' : ''].join('') || undefined : undefined,
    'data-align': b.text_align && b.text_align !== 'left' ? b.text_align : undefined,
    'data-light': !customFg && tone === 'light' ? 'true' : undefined,
    'data-dark': !customFg && tone === 'dark' ? 'true' : undefined,
    'data-shade': (bgImage || bgVideo) && (showTitle || showSub) ? 'true' : undefined,
  };
  const bg = bgVideo
    ? <video className="yg-block__bg" src={bgVideo} autoPlay muted loop playsInline poster={bgImage ?? undefined} />
    : bgImage && <img className="yg-block__bg" src={bgImage} alt="" draggable={false} />;
  const label = b.title || b.description || entry?.label || 'Block';

  if (locked) return <div {...common} aria-label={label}>{bg}<LockedFace block={b} ctx={ctx} onAge={() => setAgeOk(true)} />{children}</div>;

  if (!locked && formFits(b.type, b.w, b.h)) return <div {...common} aria-label={label}>{bg}<FormFace block={b} ctx={ctx} />{children}</div>;
  if (!locked && feedFits(b.type, url, b.w, b.h)) return <div {...common} aria-label={label}>{bg}<FeedFace block={{ ...b, url }} ctx={ctx} />{children}</div>;
  if (!locked && qrFits(b.type, url, b.w, b.h)) {
    const fg = customFg ?? (tone === 'light' ? '#ffffff' : '#272d39');
    // With no fill or glass the code sits on the block as it is: a clear background, not a painted one.
    const inner = <QrFace block={{ ...b, url }} fg={fg} bg={effect === 'fill' ? colour : '#0000'} />;
    return ctx.edit ? <div {...common} aria-label={label}>{bg}{inner}{children}</div> : <a {...common} href={url} target="_blank" rel="noopener noreferrer" aria-label={label} onClick={(e) => { e.preventDefault(); ctx.onOpen?.(b, url); }}>{bg}{inner}{children}</a>;
  }

  if (!locked && frameFits(b.type, url, b.w, b.h)) {
    const inner = ctx.edit
      ? <span className="yg-block__face yg-block__face--poster" style={{ color: 'inherit', filter: 'none' }}><span className="yg-block__icon"><ClipboardTextIcon weight="fill" style={{ width: '100%', height: '100%' }} /></span><span className="yg-block__words" style={{ alignItems: 'center' }}><span className="yg-block__title">{b.title || 'Form'}</span><span className="yg-block__sub">Shows on the page</span></span></span>
      : <iframe src={url} title={label} loading="lazy" />;
    return <div {...common} className={`${common.className} yg-block--embed yg-block--frame`} aria-label={label}>{bg}{inner}{children}</div>;
  }

  if (embed) {
    const inner = ctx.edit
      ? embed.poster
        ? <><img className="yg-block__bg" src={embed.poster} alt="" draggable={false} /><span className="yg-block__face yg-block__face--poster"><span className="yg-block__icon"><PlayIcon weight="fill" style={{ width: '100%', height: '100%' }} /></span></span></>
        : <span className="yg-block__face"><span className="yg-block__icon"><PlayIcon weight="fill" style={{ width: '100%', height: '100%' }} /></span>{can.title && <span className="yg-block__words"><span className="yg-block__title">{b.title || (embed.kind === 'spotify' ? 'Spotify' : embed.kind === 'soundcloud' ? 'SoundCloud' : 'Video')}</span><span className="yg-block__sub">Plays on the page</span></span>}</span>
      : <iframe src={embed.src} title={label} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen loading="lazy" />;
    return <div {...common} aria-label={label}>{bg}{inner}{children}</div>;
  }

  const row = b.h === 1 && b.w >= 6 && showIcon && showTitle;
  const face = hasWords && (
    <span className="yg-block__face" data-row={row ? 'true' : undefined} data-mid={b.w >= 2 && b.h >= 2 ? 'true' : undefined} data-big={b.w >= 4 && b.h >= 3 ? 'true' : undefined}>
      {showIcon && <span className="yg-block__icon" aria-hidden="true">{own ? <img src={own} alt="" draggable={false} /> : Icon && <Icon weight="fill" style={{ width: '100%', height: '100%' }} />}</span>}
      {(showTitle || showSub) && <span className="yg-block__words">{showTitle && <span className="yg-block__title">{b.title}</span>}{showSub && <span className="yg-block__sub">{b.description}</span>}</span>}
      {b.type === 'product' && b.price && b.w >= 2 && b.h >= 2 && <span className="yg-block__price">{b.price}</span>}
    </span>
  );
  // A GIF block's link is the GIF itself: nothing to open.
  if (ctx.edit || !url || gif) return <div {...common} aria-label={label}>{bg}{face}{children}</div>;
  return <a {...common} href={url} target="_blank" rel="noopener noreferrer" aria-label={label} onClick={(e) => { e.preventDefault(); ctx.onOpen?.(b, url); }}>{bg}{face}{children}</a>;
}

/** The block as a small form: a title, a line, the fields, a button. Emails take one row; messages take a few. In a single row, the field and the button alone. */
function FormFace({ block: b, ctx }: { block: PublicBlock; ctx: FaceContext }) {
  const [data, setData] = useState<Record<string, string>>({});
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const messages = b.type === 'form';
  const slim = b.h === 1;
  const field = (k: string) => ({ value: data[k] ?? '', onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setData((d) => ({ ...d, [k]: e.target.value })) });
  async function go(e: FormEvent) {
    e.preventDefault();
    if (ctx.edit || !ctx.onSubmit) return;
    setState('busy');
    try { await ctx.onSubmit(b, data); setState('done'); } catch { setState('error'); }
  }
  if (state === 'done') return <div className="yg-block__form" data-slim={slim ? 'true' : undefined} role="status"><span className="yg-block__title">{messages ? 'Sent. Thank you.' : 'You are in. Thank you.'}</span></div>;
  return (
    <form className="yg-block__form" data-messages={messages ? 'true' : undefined} data-slim={slim ? 'true' : undefined} onSubmit={go} style={ctx.edit ? { pointerEvents: 'none' } : undefined}>
      {b.title && !slim && <span className="yg-block__title">{b.title}</span>}
      {b.description && b.h >= 3 && <span className="yg-block__sub">{b.description}</span>}
      {messages && <div className="yg-row"><input className="yg-field" placeholder="Name" aria-label="Name" {...field('name')} /><input className="yg-field" type="email" placeholder="Email" aria-label="Email" required {...field('email')} /></div>}
      {messages && <textarea className="yg-field" placeholder="Your message" aria-label="Your message" required {...field('message')} />}
      {messages
        ? <div className="yg-row" style={{ justifyContent: 'flex-end' }}><button type="submit" className="yg-btn" disabled={state === 'busy'}>Send</button></div>
        : <div className="yg-row"><input className="yg-field" type="email" placeholder={slim && b.title ? b.title : 'Your email'} aria-label="Your email" required {...field('email')} /><button type="submit" className="yg-btn" disabled={state === 'busy'}>Join</button></div>}
      {state === 'error' && <span className="yg-note" role="alert">That did not go through. Try again.</span>}
    </form>
  );
}

function LockedFace({ block: b, ctx, onAge }: { block: PublicBlock; ctx: FaceContext; onAge: () => void }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const can = fits(b.w, b.h);
  async function go(e: FormEvent) {
    e.preventDefault(); setError(null);
    if (b.lock_kind === 'age') {
      const year = Number(value); const age = new Date().getFullYear() - year;
      if (!year || year < 1900) { setError('Type the year you were born.'); return; }
      if (age < (b.min_age ?? 18)) { setError(`For people ${b.min_age ?? 18} and over.`); return; }
      onAge(); return;
    }
    const ok = (await ctx.onUnlock?.(b, value)) ?? false;
    if (!ok) setError('That is not the code.');
  }
  if (!open || b.w < 4 || b.h < 2) return (
    <button type="button" className="yg-block__face" style={{ width: '100%', background: 'transparent', color: 'inherit' }} aria-label={b.title || 'Locked'} onClick={() => { if (b.w >= 4 && b.h >= 2) setOpen(true); else { const v = window.prompt(b.lock_kind === 'age' ? 'What year were you born?' : 'Code?'); if (v !== null) { setValue(v); void (async () => { if (b.lock_kind === 'age') { const age = new Date().getFullYear() - Number(v); if (Number(v) >= 1900 && age >= (b.min_age ?? 18)) onAge(); else window.alert(`For people ${b.min_age ?? 18} and over.`); } else if (!(await ctx.onUnlock?.(b, v))) window.alert('That is not the code.'); })(); } } }}>
      <span className="yg-block__icon"><LockSimpleIcon weight="fill" style={{ width: '100%', height: '100%' }} /></span>
      {can.title && b.title && <span className="yg-block__words"><span className="yg-block__title">{b.title}</span></span>}
    </button>
  );
  return (
    <form className="yg-block--form" style={{ height: '100%' }} onSubmit={go}>
      <span className="yg-block__title">{b.lock_kind === 'age' ? `For people ${b.min_age ?? 18} and over` : b.title || 'Locked'}</span>
      <div className="yg-row"><input className="yg-field" value={value} onChange={(e) => setValue(e.target.value)} placeholder={b.lock_kind === 'age' ? 'Year of birth' : 'Code'} inputMode={b.lock_kind === 'age' ? 'numeric' : 'text'} aria-label={b.lock_kind === 'age' ? 'Year of birth' : 'Code'} autoFocus /><button type="submit" className="yg-btn">Open</button></div>
      {error && <span className="yg-note" role="alert">{error}</span>}
    </form>
  );
}
