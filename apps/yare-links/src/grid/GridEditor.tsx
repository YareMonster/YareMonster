import { useEffect, useRef, useState } from 'react';
import GridLayout, { type Layout } from 'react-grid-layout';
import type { Block, Page, PublicBlock } from '../lib/supabase';
import { PoweredByYare } from '../yare';
import { COLS, MAX_ROWS, MIN_CELL, screenHeight, usedRows } from '../lib/grid';
import { BlockFace, type FaceContext } from './BlockFace';
import { ensureFonts, fontById } from '../lib/fonts';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import './grid.css';

interface Props {
  page: Page;
  blocks: Block[];
  selectedId: string | null;
  ctx: FaceContext;
  onSelect: (id: string | null) => void;
  onPlace: (id: string, place: { x: number; y: number; w: number; h: number }) => void;
}

/** The phone screen as a canvas: drag a block to move it, pull its corner to size it. */
export function GridEditor({ page, blocks, selectedId, ctx, onSelect, onPlace }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(360);
  const [screenH, setScreenH] = useState(0);
  const moved = useRef(false);
  const gap = page.grid_gap;
  const pad = page.grid_pad === false ? 0 : gap;
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const measure = () => { setWidth(el.clientWidth); setScreenH(screenHeight(el)); };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, []);
  // The canvas may be drawn smaller than a real phone; cells follow it down to 36px so the grid never spills.
  const fontIds = [page.font, ...blocks.map((b) => b.font).filter(Boolean)].filter((v, i, a) => a.indexOf(v) === i).sort().join(',');
  useEffect(() => { ensureFonts(fontIds.split(',')); }, [fontIds]);
  const cell = Math.max(Math.min(MIN_CELL, 36), Math.floor((width - pad * 2 - gap * (COLS - 1)) / COLS));
  // The grid ends with the last block; the credit is the row under it. Dragging past the end grows the grid.
  const rows = usedRows(blocks);

  const layout: Layout[] = [
    ...blocks.map((b) => ({ i: b.id, x: b.x, y: b.y, w: b.w, h: b.h, minW: 1, minH: 1, maxW: COLS })),
  ];
  return (
    <div className="yg-page yg-edit" ref={host} data-tight={gap === 0 ? 'true' : undefined} style={{ '--yg-bg': page.bg_color || '#f7f8fb', '--yg-gap': `${gap}px`, '--yg-pad': `${pad}px`, '--yg-radius': `${page.grid_radius}px`, '--yg-font': fontById(page.font).family, '--cell': `${cell}px`, '--yg-screen-h': screenH ? `${screenH}px` : '100dvh', minHeight: '100%' } as React.CSSProperties} onClick={(e) => { if (e.target === e.currentTarget) onSelect(null); }}>
      {page.wallpaper_kind !== 'none' && page.wallpaper_path && <div className="yg-page__wall" aria-hidden="true">{page.wallpaper_kind === 'video' ? <video src={ctx.mediaUrl(page.wallpaper_path) ?? undefined} muted loop autoPlay playsInline /> : <img src={ctx.mediaUrl(page.wallpaper_path) ?? undefined} alt="" />}</div>}
      <div style={{ position: 'relative', width: '100%' }}>
        <GridLayout
          className="layout"
          layout={layout}
          cols={COLS}
          rowHeight={cell}
          width={width}
          margin={[gap, gap]}
          containerPadding={[pad, pad]}
          compactType={null}
          preventCollision
          isBounded={false}
          maxRows={MAX_ROWS}
          resizeHandles={['se']}
          draggableCancel="input, textarea, button.yg-btn"
          onDragStart={() => { moved.current = false; }}
          onDrag={() => { moved.current = true; }}
          onDragStop={(_l, _o, item) => {
            // A press without a move is a pick; a move is a move.
            if (!moved.current) { onSelect(item.i); return; }
            onPlace(item.i, { x: item.x, y: item.y, w: item.w, h: item.h });
          }}
          onResizeStop={(_l, _o, item) => onPlace(item.i, { x: item.x, y: item.y, w: item.w, h: item.h })}
          style={{ minHeight: pad * 2 + rows * cell + Math.max(0, rows - 1) * gap }}
        >
          {blocks.map((b) => (
            <div key={b.id}>
              <BlockFace block={b as unknown as PublicBlock} ctx={{ ...ctx, edit: true, pageBg: page.bg_color }}>
                {selectedId === b.id && <span data-selected="true" className="yg-block" style={{ position: 'absolute', inset: 0, background: 'transparent', pointerEvents: 'none' }} />}
              </BlockFace>
            </div>
          ))}
        </GridLayout>
      </div>
      <PoweredByYare />
    </div>
  );
}
