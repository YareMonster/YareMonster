import { useEffect, useRef, useState } from 'react';
import { Card, Description, Input, Label, Switch, TextField, toast } from '@heroui/react';
import { FilmStripIcon, ImageIcon, ProhibitIcon } from '@phosphor-icons/react';
import type { Block, Client, Page, PagePatch } from '../../lib/supabase';
import { mediaUrl } from '../../lib/supabase';
import { removeMedia, updatePage, uploadMedia } from '../../lib/links-api';
import { palette } from '../../lib/grid';
import { CUSTOM, cleanFamily, customName, ensureFonts, fontById, fonts, isCustom } from '../../lib/fonts';
import { useDebouncedPatch } from '../../lib/save-status';
import { EditorLayout } from './EditorLayout';
import { Tile } from './Tile';

type Run = <T>(work: () => Promise<T>, failMessage?: string) => Promise<T | undefined>;
interface Props { db: Client; page: Page; blocks: Block[]; onPage: (p: Page) => void; run: Run }

const gaps = [0, 2, 4, 8, 12, 16];
const corners = [{ v: 0, label: 'Square' }, { v: 6, label: 'Slight' }, { v: 12, label: 'Rounded' }, { v: 20, label: 'Round' }, { v: 32, label: 'Pill' }];
const lightOnes = ['#ffffff', '#f7f1e6', '#ffe91a', '#ffd9d3', '#ffe3d6', '#fff6c7', '#e6f6d8', '#d9f7ea', '#dcefff', '#e9ddff', '#efe6ff'];

/** The grid itself: what sits behind it, the gap between blocks, how round the corners are. Every choice is a tile. */
export function LookTab({ db, page, blocks, onPage, run }: Props) {
  const [, setHex] = useState(page.bg_color);
  const wallPicker = useRef<HTMLInputElement>(null);
  const colourPicker = useRef<HTMLInputElement>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [customDraft, setCustomDraft] = useState(customName(page.font));
  // The picker shows every font in itself, so the whole set loads while Look is open.
  useEffect(() => { ensureFonts(fonts.map((f) => f.id)); }, []);
  const save = async (patch: PagePatch) => { const next = await run(() => updatePage(db, page.id, patch)); if (next) onPage(next); };
  const wall = mediaUrl(db, page.wallpaper_path);

  async function pickWall(file: File | undefined) {
    if (!file) return;
    if (file.size > 52428800) { toast.danger('Keep it under 50 MB.'); return; }
    const isVideo = file.type.startsWith('video/');
    const path = await run(() => uploadMedia(db, page.id, 'wallpaper', file), 'Could not upload the background.');
    if (!path) return;
    const old = page.wallpaper_path;
    await save({ wallpaper_path: path, wallpaper_kind: isVideo ? 'video' : 'image' });
    if (old && old !== path) await removeMedia(db, old);
  }
  function chooseWall(kind: 'image' | 'video' | 'none') {
    if (kind === 'none') { const old = page.wallpaper_path; void save({ wallpaper_kind: 'none', wallpaper_path: null }).then(() => { if (old) void removeMedia(db, old); }); return; }
    wallPicker.current?.setAttribute('accept', kind === 'video' ? 'video/mp4,video/webm,video/quicktime' : 'image/png,image/jpeg,image/webp,image/gif');
    wallPicker.current?.click();
  }
  function pickColor(c: string) { setHex(c); void save({ bg_color: c }); }
  // The native picker fires on every move; save when it settles.
  const pushColor = useDebouncedPatch<PagePatch>((p) => void save(p), 400);
  const pushColorHex = (c: string) => pushColor({ bg_color: c.toLowerCase() });


  return (
    <EditorLayout db={db} page={page} blocks={blocks}>
      <Card className="gap-5 p-5">
        <div><h3 className="text-base">Background</h3><p className="text-sm text-muted">A colour behind the whole page, and on top of it a picture or a short clip that fills the first screen. Both at once is fine: a picture that fades into the colour reads as one piece.</p></div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5" role="radiogroup" aria-label="Background">
          <Tile on={!page.bg_color} label="None" onClick={() => pickColor('')}><span className="grid size-full place-items-center" style={{ background: 'repeating-conic-gradient(#e5e7eb 0 25%, #ffffff 0 50%) 0 0 / 12px 12px' }}><ProhibitIcon className="size-5 text-muted" /></span></Tile>
          {palette.filter((c) => c !== '#17181b' && c !== '#0f1a33').map((c) => (
            <Tile key={c} on={page.bg_color === c} label={c} onClick={() => pickColor(c)}><span className="size-full" style={{ background: c, color: lightOnes.includes(c) ? '#272d39' : '#fff' }} /></Tile>
          ))}
          <Tile on={!palette.includes(page.bg_color) && !!page.bg_color} label="Any colour" onClick={() => colourPicker.current?.click()}>
            <span className="relative grid size-full place-items-center" style={{ background: !palette.includes(page.bg_color) && page.bg_color ? page.bg_color : 'conic-gradient(from 90deg, #ff6b57, #ffe91a, #3f8f3a, #0073fe, #8f7cf8, #ff6b57)' }}>
              <input ref={colourPicker} type="color" className="absolute inset-0 size-full cursor-pointer opacity-0" aria-label="Any colour" value={page.bg_color || '#f7f8fb'} onChange={(e) => { setHex(e.target.value); pushColorHex(e.target.value); }} onClick={(e) => e.stopPropagation()} />
            </span>
          </Tile>
          {(['image', 'video'] as const).map((kind) => { const on = page.wallpaper_kind === kind && !!wall; return (
            <Tile key={kind} on={on} label={kind === 'video' ? 'Video' : 'Picture'} onClick={() => chooseWall(kind)} remove={() => chooseWall('none')} removeLabel="Remove the background">
              {on ? (kind === 'video' ? <video src={wall!} muted className="size-full object-cover" /> : <img src={wall!} alt="" className="size-full object-cover" />) : <span className="grid size-full place-items-center border border-dashed border-border bg-surface-secondary">{kind === 'video' ? <FilmStripIcon className="size-5 text-muted" /> : <ImageIcon className="size-5 text-muted" />}</span>}
            </Tile>
          ); })}
        </div>
        <input ref={wallPicker} type="file" hidden onChange={(e) => { void pickWall(e.target.files?.[0]); e.target.value = ''; }} />
      </Card>

      <Card className="gap-5 p-5">
        <div><h3 className="text-base">Font</h3><p className="text-sm text-muted">The page's font. A block can pick its own under Build. Nunito and Inter ship with the app; the others come from Google Fonts when a visitor opens the page.</p></div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Font">
          {fonts.map((f) => (
            <Tile key={f.id} on={page.font === f.id} label={f.label} onClick={() => void save({ font: f.id })}>
              <span className="grid size-full place-items-center bg-surface-secondary text-xl font-bold" style={{ fontFamily: f.family }}>Aa</span>
            </Tile>
          ))}
          <Tile on={isCustom(page.font)} label={isCustom(page.font) ? customName(page.font) : 'Custom'} onClick={() => setCustomOpen(true)}>
            <span className="grid size-full place-items-center border border-dashed border-border bg-surface-secondary text-xl font-bold" style={isCustom(page.font) ? { fontFamily: fontById(page.font).family } : undefined}>Aa</span>
          </Tile>
        </div>
        {(customOpen || isCustom(page.font)) && (
          <TextField value={customDraft} onChange={setCustomDraft} onBlur={() => { const n = cleanFamily(customDraft); if (n) { ensureFonts([CUSTOM + n]); void save({ font: CUSTOM + n }); } }} fullWidth>
            <Label>Font name</Label><Input placeholder="Oswald" />
            <Description>Any family from fonts.google.com, spelled as it is there. It loads when a visitor opens the page.</Description>
          </TextField>
        )}
      </Card>

      <Card className="gap-5 p-5">
        <div className="flex items-start justify-between gap-3">
          <div><h3 className="text-base">Gap between blocks</h3><p className="text-sm text-muted">None makes a tight wall of blocks. With the edge space off, blocks touch the sides of the screen.</p></div>
          <Switch isSelected={page.grid_pad !== false} onChange={(v) => void save({ grid_pad: v })} size="sm"><Switch.Content><Switch.Control><Switch.Thumb /></Switch.Control><span className="text-sm whitespace-nowrap">Edge space</span></Switch.Content></Switch>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6" role="radiogroup" aria-label="Gap between blocks">
          {gaps.map((g) => (
            <Tile key={g} on={page.grid_gap === g} label={g === 0 ? 'None' : `${g}px`} onClick={() => void save({ grid_gap: g })}>
              <span className="grid size-full grid-cols-3 grid-rows-2 bg-surface-secondary p-1.5" style={{ gap: g / 2 }}>{[0, 1, 2, 3, 4, 5].map((i) => <span key={i} className="bg-foreground/70" style={{ borderRadius: Math.min(page.grid_radius, 8) / 2 }} />)}</span>
            </Tile>
          ))}
        </div>
      </Card>

      <Card className="gap-5 p-5">
        <div><h3 className="text-base">Corners</h3><p className="text-sm text-muted">From square to pill.</p></div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5" role="radiogroup" aria-label="Corners">
          {corners.map((c) => (
            <Tile key={c.v} on={page.grid_radius === c.v} label={c.label} onClick={() => void save({ grid_radius: c.v })}>
              <span className="grid size-full place-items-center bg-surface-secondary p-2"><span className="h-full w-2/3 bg-foreground/70" style={{ borderRadius: c.v / 2 }} /></span>
            </Tile>
          ))}
        </div>
      </Card>
    </EditorLayout>
  );
}
