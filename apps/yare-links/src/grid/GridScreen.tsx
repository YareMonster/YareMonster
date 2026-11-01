import { useEffect, useRef, useState } from 'react';
import { PoweredByYare } from '../yare';
import type { PublicBlock, PublicPage } from '../lib/supabase';
import { COLS, DESKTOP_WIDTH, MIN_CELL, screenHeight, settle, usedRows } from '../lib/grid';
import { BlockFace, type FaceContext } from './BlockFace';
import { ensureFonts, fontById } from '../lib/fonts';
import './grid.css';

/** The page as visitors see it: the grid, its background, the credit under it. */
export function GridScreen({ page, ctx }: { page: PublicPage; ctx: FaceContext }) {
  const body = useRef<HTMLDivElement>(null);
  const [cell, setCell] = useState(56);
  const [screenH, setScreenH] = useState(0);
  const gap = page.grid_gap;
  const pad = page.grid_pad === false ? 0 : gap;
  useEffect(() => {
    const el = body.current;
    if (!el) return;
    // A visitor's cells never go under 44px; the editor's phone may be drawn smaller, so there the floor is the canvas's 36px.
    const floor = ctx.edit ? Math.min(MIN_CELL, 36) : MIN_CELL;
    const measure = () => { const inner = el.clientWidth - pad * 2; setCell(Math.max(floor, Math.floor((inner - gap * (COLS - 1)) / COLS))); setScreenH(screenHeight(el)); };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, [gap, pad, ctx.edit]);
  const fontIds = [page.font, ...page.blocks.map((b) => b.font).filter(Boolean)].filter((v, i, a) => a.indexOf(v) === i).sort().join(',');
  useEffect(() => { ensureFonts(fontIds.split(',')); }, [fontIds]);
  const wall = page.wallpaper_kind !== 'none' && page.wallpaper_path ? ctx.mediaUrl(page.wallpaper_path) : null;
  // Stored places may overlap; shown, they never do.
  const blocks = settle(page.blocks);
  const rows = usedRows(blocks);
  return (
    <div className="yg-page" data-edit={ctx.edit ? 'true' : undefined} data-colour={page.bg_color ? 'true' : undefined} data-tight={gap === 0 ? 'true' : undefined} style={{ '--yg-bg': page.bg_color || '#f7f8fb', '--yg-gap': `${gap}px`, '--yg-pad': `${pad}px`, '--yg-radius': `${page.grid_radius}px`, '--yg-font': fontById(page.font).family, '--cell': `${cell}px`, '--yg-screen-h': screenH ? `${screenH}px` : '100dvh' } as React.CSSProperties}>
      {/* On a wide screen the page is a phone-wide column; around it, the page colour with a soft vignette and grain, or the picture blurred. */}
      <div className="yg-page__backdrop" aria-hidden="true" style={wall && page.wallpaper_kind !== 'video' ? { backgroundImage: `url("${wall}")` } : undefined} />
      <div className="yg-page__column" style={{ '--yg-col': `${DESKTOP_WIDTH}px` } as React.CSSProperties}>
      {wall && <div className="yg-page__wall" aria-hidden="true">{page.wallpaper_kind === 'video' ? <video src={wall} autoPlay muted loop playsInline /> : <img src={wall} alt="" />}</div>}
      <div className="yg-page__body" ref={body}>
        <div className="yg-grid" style={{ gridTemplateRows: `repeat(${rows}, var(--cell))` }}>
          {blocks.map((b: PublicBlock) => (
            <div key={b.id} style={{ gridColumn: `${b.x + 1} / span ${b.w}`, gridRow: `${b.y + 1} / span ${b.h}`, minWidth: 0, minHeight: 0 }}>
              <BlockFace block={b} ctx={{ ...ctx, pageBg: page.bg_color }} />
            </div>
          ))}
        </div>
      </div>
      <PoweredByYare />
      </div>
    </div>
  );
}
