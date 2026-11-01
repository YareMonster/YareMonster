import { useEffect, useMemo, useRef, useState, type Dispatch } from 'react';
import { Button, Card, Description, Input, Label, ListBox, Popover, Select, Switch, TextArea, TextField, Tooltip, toast } from '@heroui/react';
import { AlignBottomIcon, AlignCenterVerticalIcon, AlignTopIcon, GifIcon, MicrophoneIcon, NewspaperIcon, QrCodeIcon, SpotifyLogoIcon, YoutubeLogoIcon, CaretDownIcon, CaretUpIcon, ChatTextIcon, CheckIcon, ClipboardTextIcon, FilmStripIcon, TagIcon, TextAlignCenterIcon, TextAlignLeftIcon, TextAlignRightIcon, EnvelopeSimpleIcon, IdentificationCardIcon, ImageIcon, InfoIcon, LinkSimpleIcon, LockSimpleIcon, LockSimpleOpenIcon, PlayIcon, PlusIcon, ProhibitIcon, TrashIcon, UploadSimpleIcon, XIcon } from '@phosphor-icons/react';
import { MonsterNote, Notice, PhonePreview } from '../../yare';
import type { Block, BlockPatch, Client, Page } from '../../lib/supabase';
import { imageUrl, mediaUrl } from '../../lib/supabase';
import { addBlock, deleteBlock, fetchFeed, removeImage, setLockCode, updateBlock, uploadImage } from '../../lib/links-api';
import { normalizeUrl } from '../../lib/blocks';
import { COLS, DEFAULT_SIZE, MAX_ROWS, embedFor, feedFits, findSpot, fits, formFits, frameFits, giphyFor, palette, qrFits, settle, type FeedKind, type Placed } from '../../lib/grid';
import { icons, iconById } from '../../lib/icons';
import { CUSTOM, cleanFamily, customName, ensureFonts, fontById, fonts, isCustom } from '../../lib/fonts';
import { useDebouncedPatch } from '../../lib/save-status';
import { GridEditor } from '../../grid/GridEditor';
import { EditorLayout } from './EditorLayout';
import { Tile } from './Tile';

type Run = <T>(work: () => Promise<T>, failMessage?: string) => Promise<T | undefined>;
interface Props { db: Client; page: Page; blocks: Block[]; setBlocks: Dispatch<(b: Block[]) => Block[]>; onPage: (p: Page) => void; run: Run }

/** The phone is the canvas: add a block, drag it, size it. The chosen block's fields sit on the left; the trash and the Delete key remove it. */
export function BuildTab({ db, page, blocks, setBlocks, run }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = blocks.find((b) => b.id === selectedId) ?? null;
  const live = blocks.filter((b) => !b.archived);

  async function add() {
    const spot = findSpot(live, DEFAULT_SIZE.w, DEFAULT_SIZE.h);
    const created = await run(() => addBlock(db, page.id, spot, blocks.length));
    if (!created) return;
    setBlocks((list) => [...list, created]);
    setSelectedId(created.id);
  }
  async function remove(block: Block) {
    const ok = await run(() => deleteBlock(db, block).then(() => true));
    if (ok) { setBlocks((list) => list.filter((b) => b.id !== block.id)); if (selectedId === block.id) setSelectedId(null); }
  }
  // Delete or Backspace removes the chosen block, unless you are typing in a field.
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      const t = e.target as HTMLElement | null;
      if (t && (t.closest('input, textarea, select, [contenteditable="true"]'))) return;
      e.preventDefault();
      void remove(selected);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  function place(id: string, p: Placed) {
    setBlocks((list) => list.map((b) => (b.id === id ? { ...b, ...p } : b)));
    void run(() => updateBlock(db, id, p));
  }
  const update = (next: Block) => setBlocks((list) => list.map((b) => (b.id === next.id ? next : b)));
  // A block grown from the panel pushes the blocks under it down, and each one that moved is saved.
  const resize = (next: Block) => setBlocks((list) => {
    const settled = settle(list.map((b) => (b.id === next.id ? next : b)));
    for (const b of settled) { const was = list.find((x) => x.id === b.id); if (was && b.id !== next.id && was.y !== b.y) void run(() => updateBlock(db, b.id, { y: b.y })); }
    return settled;
  });
  const ctx = useMemo(() => ({ imageUrl: (p: string | null | undefined) => imageUrl(db, p), mediaUrl: (p: string | null | undefined) => mediaUrl(db, p), edit: true, feed: (k: FeedKind, u: string, n: number) => fetchFeed(db, k, u, n) }), [db]);

  const canvas = (
      <PhonePreview label="Your page" scrollKey={page.id}>
        <GridEditor page={page} blocks={live} selectedId={selectedId} ctx={ctx} onSelect={setSelectedId} onPlace={place} />
      </PhonePreview>
  );

  return (
    <EditorLayout db={db} page={page} blocks={blocks} aside={canvas}>
      <div className="flex items-center justify-between gap-3">
        <div><h3 className="text-base">Blocks</h3><p className="text-sm text-muted">{live.length === 0 ? 'Add one, drag it where you want it, pull its corner to size it.' : `${live.length} on the page. Press one on the phone to edit it.`}</p></div>
        <Button variant="primary" onPress={() => void add()}><PlusIcon weight="bold" /> Add a block</Button>
      </div>
      {selected ? <BlockPanel key={selected.id} db={db} page={page} block={selected} run={run} onChange={update} onResize={resize} onDelete={() => void remove(selected)} />
        : <MonsterNote title={live.length ? 'Press a block on the phone' : 'Nothing on the page yet'}>What a block shows depends on its size: an icon in a small one, a title and a line in a bigger one, a video, a playlist or a form in a big one.</MonsterNote>}
      {blocks.some((b) => b.archived) && (
        <Card className="gap-2 p-4">
          <h4 className="text-sm font-semibold">Archived</h4>
          {blocks.filter((b) => b.archived).map((b) => <button key={b.id} type="button" className="yare-nav-item" data-active={b.id === selectedId || undefined} onClick={() => setSelectedId(b.id)}><span className="yare-nav-item__label">{b.title || b.url || 'Block'}</span><span className="text-xs text-muted">{b.w}×{b.h}</span></button>)}
        </Card>
      )}
    </EditorLayout>
  );
}

const kinds: { key: Block['type']; label: string; Icon: typeof LinkSimpleIcon; tip: string }[] = [
  { key: 'link', label: 'Link', Icon: LinkSimpleIcon, tip: 'A tap opens the link.' },
  { key: 'product', label: 'Product', Icon: TagIcon, tip: 'Something for sale: its picture as the background, its name, and a price. A tap opens the link. From 2 wide and 2 tall.' },
  { key: 'video', label: 'Video', Icon: PlayIcon, tip: 'A YouTube, Vimeo, Spotify or SoundCloud link. From 4 wide and 3 tall it plays right on the page; smaller, a tap opens it.' },
  { key: 'signup', label: 'Email', Icon: EnvelopeSimpleIcon, tip: 'Visitors leave their email in the block. From 4 wide and 2 tall. They land in Insights.' },
  { key: 'form', label: 'Message', Icon: ChatTextIcon, tip: 'Name, email and a message, in the block. From 4 wide and 4 tall. They land in Insights.' },
  { key: 'embed', label: 'Yare Form', Icon: ClipboardTextIcon, tip: 'The link to one of your Yare Forms. From 4 wide and 4 tall the form shows in the block; smaller, a tap opens it.' },
  { key: 'spotify', label: 'Spotify', Icon: SpotifyLogoIcon, tip: 'A song, an album, a playlist, an episode or a show from Spotify. From 4 wide and 2 tall it plays right on the page; smaller, a tap opens it.' },
  { key: 'youtube_feed', label: 'YouTube', Icon: YoutubeLogoIcon, tip: 'The latest videos of a channel. Paste the channel address or its handle in Link. From 4 wide and 3 tall; smaller, a tap opens the channel.' },
  { key: 'substack_feed', label: 'Substack', Icon: NewspaperIcon, tip: 'The latest posts of a Substack. Paste its address in Link. From 4 wide and 3 tall; smaller, a tap opens it.' },
  { key: 'podcast_feed', label: 'Podcast', Icon: MicrophoneIcon, tip: 'The latest episodes of a podcast. Paste its RSS address in Link. From 4 wide and 3 tall; smaller, a tap opens it.' },
  { key: 'giphy', label: 'Giphy', Icon: GifIcon, tip: 'A GIF from Giphy as the block\'s background, with your words over it. Paste the GIF\'s address in Link. Any size.' },
  { key: 'qr', label: 'QR code', Icon: QrCodeIcon, tip: 'The link as a QR code, in the block\'s colours, for people to scan. From 2 wide and 2 tall.' },
];
const effects: { key: Block['effect']; label: string; tip: string }[] = [
  { key: 'fill', label: 'Fill', tip: 'The colour painted on.' },
  { key: 'none', label: 'No fill', tip: 'Nothing painted: the page shows through. Add the border for a line.' },
  { key: 'glass', label: 'Glass', tip: 'The colour frosted and see-through. Shines over a picture or video background.' },
];

/** A little block in the chosen colour, drawn with the effect, over a slice of a colourful page. */
function EffectSwatch({ effect, colour }: { effect: Block['effect']; colour: string }) {
  const face = effect === 'fill' ? { background: colour } : effect === 'none' ? { boxShadow: `inset 0 0 0 1px rgba(39,45,57,0.2)` } : { background: `color-mix(in oklab, ${colour} 38%, transparent)`, backdropFilter: 'blur(4px) saturate(1.5)', boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${colour} 55%, #fff)` };
  return <span className="grid size-full place-items-center" style={{ background: 'linear-gradient(135deg, #dcefff, #e9ddff 50%, #ffd9d3)' }}><span className="size-7 rounded-md" style={face} /></span>;
}

const iconSizes: { key: Block['icon_size']; label: string; px: number }[] = [{ key: 's', label: 'Small', px: 18 }, { key: 'm', label: 'Normal', px: 24 }, { key: 'l', label: 'Large', px: 32 }];
const corners = [{ v: 0, label: 'Square' }, { v: 6, label: 'Slight' }, { v: 12, label: 'Rounded' }, { v: 20, label: 'Round' }, { v: 32, label: 'Pill' }];
const sizes: { key: Block['text_size']; label: string; px: number }[] = [{ key: 's', label: 'Small', px: 15 }, { key: 'm', label: 'Normal', px: 19 }, { key: 'l', label: 'Large', px: 24 }, { key: 'xl', label: 'Huge', px: 30 }];
const aligns: { key: Block['text_align']; label: string; Icon: typeof TextAlignLeftIcon }[] = [{ key: 'left', label: 'Left', Icon: TextAlignLeftIcon }, { key: 'center', label: 'Centre', Icon: TextAlignCenterIcon }, { key: 'right', label: 'Right', Icon: TextAlignRightIcon }];
const valigns: { key: Block['text_valign']; label: string; Icon: typeof AlignTopIcon }[] = [{ key: 'top', label: 'Top', Icon: AlignTopIcon }, { key: 'middle', label: 'Middle', Icon: AlignCenterVerticalIcon }, { key: 'bottom', label: 'Bottom', Icon: AlignBottomIcon }];
const locks: { key: Block['lock_kind']; label: string; Icon: typeof LockSimpleIcon }[] = [{ key: 'none', label: 'Open', Icon: LockSimpleOpenIcon }, { key: 'code', label: 'Code', Icon: LockSimpleIcon }, { key: 'age', label: 'Age', Icon: IdentificationCardIcon }];
const tones: { key: string; label: string; style: React.CSSProperties }[] = [
  { key: 'auto', label: 'Auto', style: { background: 'linear-gradient(90deg, #272d39 50%, #ffffff 50%)', color: '#ffffff' } },
  { key: 'dark', label: 'Black', style: { background: '#ffffff', color: '#272d39' } },
  { key: 'light', label: 'White', style: { background: '#272d39', color: '#ffffff' } },
];
const isHex = (v: string) => /^#[0-9a-f]{6}$/i.test(v);

const toLocal = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(0, 16) : '');
const fromLocal = (v: string) => (v ? new Date(v).toISOString() : null);

/** A section label with a small tip beside it, for the parts of a block that need a word of explanation. */
function Head({ children, tip }: { children: React.ReactNode; tip: string }) {
  return (
    <div className="flex items-center gap-1">
      <Label>{children}</Label>
      <Tooltip>
        <Button variant="ghost" size="sm" isIconOnly aria-label={`About ${String(children)}`} className="!size-6 !min-h-0 text-muted"><InfoIcon className="size-4" /></Button>
        <Tooltip.Content className="max-w-64">{tip}</Tooltip.Content>
      </Tooltip>
    </div>
  );
}

/** One box of the block panel: a title with a tip, maybe a switch beside it, and its controls. */
function Area({ title, tip, aside, children }: { title: string; tip: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="gap-4 p-5">
      <div className="flex items-center justify-between gap-3"><Head tip={tip}>{title}</Head>{aside}</div>
      {children}
    </Card>
  );
}

function BlockPanel({ db, page, block, run, onChange, onResize, onDelete }: { db: Client; page: Page; block: Block; run: Run; onChange: (b: Block) => void; onResize: (b: Block) => void; onDelete: () => void }) {
  const [draft, setDraft] = useState(block);
  const [code, setCode] = useState('');
  const [, setHex] = useState(block.bg_color);
  const colourPicker = useRef<HTMLInputElement>(null);
  const pushColor = useDebouncedPatch<BlockPatch>((p) => void save(p), 400);
  const pushWords = useDebouncedPatch<BlockPatch>((p) => void save(p), 400);
  const [iconOpen, setIconOpen] = useState(false);
  const bgPicker = useRef<HTMLInputElement>(null);
  const wordsPicker = useRef<HTMLInputElement>(null);
  const [videoOpen, setVideoOpen] = useState(!!block.options.bgVideo);
  const [customOpen, setCustomOpen] = useState(false);
  const [customDraft, setCustomDraft] = useState(customName(block.font));
  const ownIconPicker = useRef<HTMLInputElement>(null);
  const save = async (patch: BlockPatch) => { const next = await run(() => updateBlock(db, block.id, patch)); if (next) onChange(next); };
  const push = useDebouncedPatch<BlockPatch>((p) => void save(p), 600);
  const set = (patch: Partial<Block>) => setDraft((d) => ({ ...d, ...patch }));
  const embed = embedFor(draft.url, block.w, block.h);
  const asForm = formFits(draft.type, block.w, block.h);
  const asFrame = frameFits(draft.type, draft.url, block.w, block.h);
  const asFeed = feedFits(draft.type, draft.url, block.w, block.h);
  const asQr = qrFits(draft.type, draft.url, block.w, block.h);
  // A block that plays a video or shows a form from Yare Forms shows nothing else: icon, title and
  // subtext are off. One that collects emails or messages keeps its title and subtext, with no icon.
  const can = embed || asFrame ? { icon: false, title: false, subtext: false } : asForm ? { icon: false, title: true, subtext: block.h >= 3 } : asFeed ? { icon: false, title: true, subtext: false } : asQr ? { icon: false, title: block.h >= 3, subtext: false } : fits(block.w, block.h);
  const asGif = draft.type === 'giphy' ? giphyFor(draft.url) : null;
  // What this size can hold, as a short list: what is on, what needs a bigger block.
  const needs: Array<{ label: string; on: boolean; note?: string }> = [
    { label: 'Icon', on: can.icon, note: embed || asFrame || asForm ? 'taken by what the block shows' : 'needs more room' },
    { label: 'Title', on: can.title, note: embed || asFrame ? 'taken by what the block shows' : 'from 2 wide, or 3 wide in a 1-tall row' },
    { label: 'Subtext', on: can.subtext, note: embed || asFrame ? 'taken by what the block shows' : asForm ? 'from 3 tall' : 'from 4 wide and 2 tall, or 3 by 3' },
  ];
  if (draft.type === 'video') needs.push({ label: 'Video plays in the block', on: !!embed, note: draft.url ? 'from 4 wide and 3 tall; smaller, a tap opens it' : 'paste a YouTube, Vimeo, Spotify or SoundCloud link' });
  if (draft.type === 'spotify') needs.push({ label: 'Spotify plays in the block', on: !!embed, note: draft.url ? 'from 4 wide and 2 tall; smaller, a tap opens it' : 'paste a Spotify link' });
  if (draft.type === 'giphy') needs.push({ label: 'GIF as the background', on: !!asGif, note: 'paste the GIF\'s address from Giphy' });
  if (draft.type === 'podcast_feed') needs.push({ label: 'Latest episodes in the block', on: asFeed, note: draft.url ? 'from 4 wide and 3 tall; smaller, a tap opens it' : 'paste the podcast RSS address in Link' });
  if (draft.type === 'signup') needs.push({ label: 'Email field', on: asForm, note: block.h === 1 ? 'in one row, from 6 wide' : 'from 4 wide and 2 tall, or 6 wide in one row' });
  if (draft.type === 'form') needs.push({ label: 'Message form', on: asForm, note: 'from 4 wide and 4 tall' });
  if (draft.type === 'embed') needs.push({ label: 'Yare Form shows in the block', on: asFrame, note: draft.url ? 'from 4 wide and 4 tall; smaller, a tap opens it' : 'paste the link to one of your Yare Forms' });
  if (draft.type === 'youtube_feed') needs.push({ label: 'Latest videos in the block', on: asFeed, note: draft.url ? 'from 4 wide and 3 tall; smaller, a tap opens the channel' : 'paste the channel address or handle in Link' });
  if (draft.type === 'substack_feed') needs.push({ label: 'Latest posts in the block', on: asFeed, note: draft.url ? 'from 4 wide and 3 tall; smaller, a tap opens it' : 'paste the Substack address in Link' });
  if (draft.type === 'qr') needs.push({ label: 'QR code in the block', on: asQr, note: draft.url ? 'from 2 wide and 2 tall' : 'paste the link to encode' });

  async function pickPicture(kind: 'bg' | 'thumb', file: File | undefined) {
    if (!file) return;
    if (file.size > 2097152) { toast.danger('Keep the picture under 2 MB.'); return; }
    const path = await run(() => uploadImage(db, page.id, `${kind}-${block.id}`, file), 'Could not upload the picture.');
    if (!path) return;
    const key = kind === 'bg' ? 'bg_path' : 'thumbnail_path';
    const old = block[key];
    await save({ [key]: path }); set({ [key]: path });
    if (old && old !== path) await removeImage(db, old);
  }
  async function clearPicture(key: 'bg_path' | 'thumbnail_path') { const old = block[key]; await save({ [key]: null }); set({ [key]: null }); if (old) await removeImage(db, old); }
  async function setLock(k: string) {
    if (k === 'code') { set({ lock_kind: 'code' }); return; }
    const next = await run(() => (k === 'age' ? updateBlock(db, block.id, { lock_kind: 'age', min_age: block.min_age ?? 18, lock_hash: null, lock_salt: null }) : setLockCode(db, block.id, null)));
    if (next) { onChange(next); set(next); }
  }
  async function saveCode() {
    if (code.trim().length < 4) { toast.danger('Use at least 4 characters.'); return; }
    const next = await run(() => setLockCode(db, block.id, code.trim())); if (next) { onChange(next); set(next); setCode(''); toast.success('Code set'); }
  }
  function size(w: number, h: number) {
    w = Math.max(1, Math.min(COLS, w)); h = Math.max(1, Math.min(MAX_ROWS, h));
    const x = Math.min(block.x, COLS - w);
    set({ w, h, x }); void save({ w, h, x }); onResize({ ...block, w, h, x });
  }
  useEffect(() => { ensureFonts(fonts.map((f) => f.id)); }, []);
  const Icon = iconById(draft.icon)?.icon;
  const bgSrc = imageUrl(db, block.bg_path);

  return (
    <div className="flex flex-col gap-4">
      <Card className="gap-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base">Block</h3>
        <div className="flex items-center gap-2 text-sm">
          <Button variant="outline" size="sm" isIconOnly aria-label="Delete this block" className="!size-9 !min-h-0 text-danger" onPress={onDelete}><TrashIcon /></Button>
          <Stepper label="Wide" value={block.w} min={1} max={COLS} onChange={(v) => size(v, block.h)} />
          <span className="text-muted">×</span>
          <Stepper label="Tall" value={block.h} min={1} max={MAX_ROWS} onChange={(v) => size(block.w, v)} />
        </div>
      </div>
      <MonsterNote title={`You are working on a block that's ${block.w} wide, ${block.h} tall!`}>
        <p>What a block shows follows its size. Pull its corner on the phone, or use the steppers above. The size of the block changes what it can hold.</p>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {needs.map((n) => (
            <li key={n.label} className="flex items-center gap-1.5" title={!n.on && n.note ? n.note : undefined}>
              {n.on ? <CheckIcon weight="bold" className="size-4 shrink-0 text-success" /> : <XIcon weight="bold" className="size-4 shrink-0 text-muted" />}
              <span className={n.on ? undefined : 'text-muted'}>{n.label}</span>
            </li>
          ))}
        </ul>
        {needs.some((n) => !n.on && n.note) && <p className="mt-1 text-xs text-muted">{needs.filter((n) => !n.on && n.note).map((n) => `${n.label}: ${n.note}`).join(' · ')}</p>}
      </MonsterNote>
      </Card>

      <Area title="Block Settings" tip="What the block is: its type, where it goes, its words and its icon. Edge to edge runs a block at the top, left or right of the grid over the page's edge space to the screen." aside={<Switch isSelected={!!draft.bleed} onChange={(v) => { set({ bleed: v }); void save({ bleed: v }); }} size="sm" isDisabled={block.x > 0 && block.x + block.w < COLS && block.y > 0}><Switch.Content><Switch.Control><Switch.Thumb /></Switch.Control><span className="text-sm whitespace-nowrap">Edge to edge</span></Switch.Content></Switch>}>
        <div className="flex flex-col items-start gap-2">
          <Label>Type</Label>
        <div className="grid w-full grid-cols-3 gap-2" role="radiogroup" aria-label="Block type">
          {kinds.map((k) => { const ok = k.key === 'link' || k.key === 'giphy' || (k.key === 'product' || k.key === 'qr' ? block.w >= 2 && block.h >= 2 : k.key === 'video' || k.key === 'youtube_feed' || k.key === 'substack_feed' || k.key === 'podcast_feed' ? block.w >= 4 && block.h >= 3 : k.key === 'spotify' ? block.w >= 4 && block.h >= 2 : k.key === 'signup' ? (block.w >= 4 && block.h >= 2) || block.w >= 6 : block.w >= 4 && block.h >= 4); return <Tile key={k.key} on={draft.type === k.key} disabled={!ok} label={k.label} onClick={() => { set({ type: k.key }); void save({ type: k.key }); }}><k.Icon className="size-6" weight={k.key === 'link' ? 'regular' : 'fill'} /></Tile>; })}
        </div>
        <p className="text-xs text-muted">{kinds.find((k) => k.key === draft.type)?.tip ?? kinds[0]?.tip} Greyed types need a bigger block.</p>
        </div>
      <TextField value={draft.url} onChange={(v) => set({ url: v })} onBlur={() => { const u = normalizeUrl(draft.url); set({ url: u }); void save({ url: u }); }} fullWidth type="url">
        <Label>Link</Label>
        <Input placeholder="https://" inputMode="url" />
        <Description>{draft.type === 'embed' ? 'The address of one of your Yare Forms.' : draft.type === 'video' ? 'A YouTube, Vimeo, Spotify or SoundCloud address.' : draft.type === 'spotify' ? 'A Spotify address: a song, an album, a playlist, an episode or a show.' : draft.type === 'giphy' ? 'The GIF\'s address on Giphy.' : draft.type === 'youtube_feed' ? 'The channel address, or its handle like @name.' : draft.type === 'substack_feed' ? 'The Substack address, its own domain or name.substack.com.' : draft.type === 'podcast_feed' ? 'The podcast\'s RSS address, the one podcast apps use.' : draft.type === 'qr' ? 'The link the code opens.' : 'Where a tap goes. Optional.'}</Description>
      </TextField>
      <TextField value={draft.title} onChange={(v) => { set({ title: v }); push({ title: v }); }} fullWidth maxLength={120} isDisabled={!can.title}>
        <Label>Title</Label><Input placeholder="My shop" />
        {!can.title && <Description>{embed || asFrame ? 'The block is taken by what it shows.' : 'No room for a title at this size. Make the block wider.'}</Description>}
      </TextField>
      {draft.type === 'product' && (
        <TextField value={draft.price ?? ''} onChange={(v) => { set({ price: v }); push({ price: v }); }} fullWidth maxLength={24}>
          <Label>Price</Label><Input placeholder="€24" />
          <Description>Written your way: €24, $19.90, from 30. It sits in a small pill on the block.</Description>
        </TextField>
      )}
      <TextField value={draft.description} onChange={(v) => { set({ description: v }); push({ description: v }); }} fullWidth maxLength={500} isDisabled={!can.subtext}>
        <Label>Subtext</Label><TextArea rows={2} placeholder="Optional" />
        {!can.subtext && <Description>{embed || asFrame ? 'The block is taken by what it shows.' : 'No room for a subtext at this size.'}</Description>}
      </TextField>
        <div className="flex flex-col items-start gap-2">
          <Label>Icon</Label>
        <div className="grid w-full grid-cols-3 gap-2" role="radiogroup" aria-label="Block icon">
          <Tile on={!draft.icon && !block.thumbnail_path} disabled={!can.icon} label="None" onClick={() => { if (draft.icon) { set({ icon: '' }); void save({ icon: '' }); } if (block.thumbnail_path) void clearPicture('thumbnail_path'); }}><ProhibitIcon className="size-6 text-muted" /></Tile>
          <Popover isOpen={iconOpen} onOpenChange={setIconOpen}>
            <Popover.Trigger className="min-w-0">
              <Tile on={!!draft.icon && !block.thumbnail_path} disabled={!can.icon} label={iconById(draft.icon)?.label ?? 'Pick an icon'} onClick={() => undefined}>{Icon ? <Icon weight="fill" className="size-6" /> : <ImageIcon className="size-6 text-muted" />}</Tile>
            </Popover.Trigger>
            <Popover.Content placement="bottom start" className="w-80">
              <Popover.Dialog aria-label="Icons" className="flex max-h-80 flex-col gap-3 overflow-y-auto p-3">
                {(['brands', 'things'] as const).map((g) => (
                  <div key={g}><div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">{g === 'brands' ? 'Brands' : 'Everything else'}</div>
                    <div className="grid grid-cols-6 gap-1">{icons.filter((i) => i.group === g).map((i) => { const I = i.icon; return <button key={i.id} type="button" className="grid aspect-square place-items-center rounded-(--yare-radius-control) hover:bg-surface-secondary" aria-label={i.label} aria-pressed={draft.icon === i.id} style={{ background: draft.icon === i.id ? 'var(--yare-selected)' : undefined }} onClick={() => { set({ icon: i.id }); void save({ icon: i.id }); if (block.thumbnail_path) void clearPicture('thumbnail_path'); setIconOpen(false); }}><I weight="fill" className="size-5" /></button>; })}</div>
                  </div>
                ))}
              </Popover.Dialog>
            </Popover.Content>
          </Popover>
          <Tile on={!!block.thumbnail_path} disabled={!can.icon} label="Your own" onClick={() => ownIconPicker.current?.click()} remove={() => void clearPicture('thumbnail_path')} removeLabel="Remove your picture">
            {block.thumbnail_path ? <img src={imageUrl(db, block.thumbnail_path) ?? ''} alt="" className="size-8 object-contain" /> : <span className="grid size-full place-items-center border border-dashed border-border bg-surface-secondary"><UploadSimpleIcon className="size-5 text-muted" /></span>}
          </Tile>
          <input ref={ownIconPicker} type="file" hidden accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(e) => { void pickPicture('thumb', e.target.files?.[0]); e.target.value = ''; }} />
          {iconSizes.map((z) => <Tile key={z.key} on={(draft.icon_size ?? 'm') === z.key} disabled={!can.icon} label={z.label} onClick={() => { set({ icon_size: z.key }); void save({ icon_size: z.key }); }}><span className="grid size-full place-items-center">{Icon ? <Icon weight="fill" style={{ width: z.px, height: z.px }} /> : <ImageIcon className="text-muted" style={{ width: z.px, height: z.px }} />}</span></Tile>)}
        </div>
        <div className="flex w-full flex-col items-start gap-2">
          <Label>Corners</Label>
          <div className="grid w-full grid-cols-3 gap-2 sm:grid-cols-5" role="radiogroup" aria-label="Block corners">
            {corners.map((c) => <Tile key={c.v} on={(draft.radius ?? page.grid_radius) === c.v} label={c.label} onClick={() => { set({ radius: c.v }); void save({ radius: c.v }); }}><span className="grid size-full place-items-center bg-surface-secondary p-2"><span className="h-full w-2/3 bg-foreground/70" style={{ borderRadius: c.v / 2 }} /></span></Tile>)}
          </div>
        </div>
        {!can.icon && <p className="text-xs text-muted">{embed ? 'The video takes the whole block.' : asFrame ? 'The form takes the whole block.' : asForm || asFeed || asQr ? 'What the block shows takes its place.' : 'No room for an icon at this size.'}</p>}
        </div>
      </Area>

      <Area title="Block Background" tip="A colour, a picture or a short video behind the block.">
        <div className="grid w-full grid-cols-3 gap-2 sm:grid-cols-5" role="radiogroup" aria-label="Block background">
          {palette.filter((c) => c !== '#17181b').map((c) => (
            <Tile key={c} on={!block.bg_path && draft.bg_color === c} label={c} onClick={() => { setHex(c); set({ bg_color: c }); void save({ bg_color: c }); }}><span className="size-full" style={{ background: c }} /></Tile>
          ))}
          <Tile on={!block.bg_path && !!draft.bg_color && !palette.includes(draft.bg_color)} label="Any colour" onClick={() => colourPicker.current?.click()}>
            <span className="relative grid size-full place-items-center" style={{ background: !block.bg_path && draft.bg_color && !palette.includes(draft.bg_color) ? draft.bg_color : 'conic-gradient(from 90deg, #ff6b57, #ffe91a, #3f8f3a, #0073fe, #8f7cf8, #ff6b57)' }}>
              <input ref={colourPicker} type="color" className="absolute inset-0 size-full cursor-pointer opacity-0" aria-label="Any colour" value={draft.bg_color ? draft.bg_color : '#ffffff'} onChange={(e) => { const c = e.target.value.toLowerCase(); setHex(c); set({ bg_color: c }); pushColor({ bg_color: c }); }} onClick={(e) => e.stopPropagation()} />
            </span>
          </Tile>
          <Tile on={!!bgSrc} label="Picture" onClick={() => bgPicker.current?.click()} remove={() => void clearPicture('bg_path')} removeLabel="Remove the picture">
            {bgSrc ? <img src={bgSrc} alt="" className="size-full object-cover" /> : <span className="grid size-full place-items-center border border-dashed border-border bg-surface-secondary"><ImageIcon className="size-5 text-muted" /></span>}
          </Tile>
          <Tile on={!!draft.options.bgVideo} label="Video" onClick={() => setVideoOpen(true)} remove={() => { setVideoOpen(false); set({ options: { ...draft.options, bgVideo: undefined } }); void save({ options: { ...block.options, bgVideo: undefined } }); }} removeLabel="Remove the video">
            {draft.options.bgVideo ? <video src={draft.options.bgVideo} muted className="size-full object-cover" /> : <span className="grid size-full place-items-center border border-dashed border-border bg-surface-secondary"><FilmStripIcon className="size-5 text-muted" /></span>}
          </Tile>
        </div>
        <input ref={bgPicker} type="file" hidden accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => { void pickPicture('bg', e.target.files?.[0]); e.target.value = ''; }} />
        {(videoOpen || draft.options.bgVideo) && (
          <TextField value={draft.options.bgVideo ?? ''} onChange={(v) => set({ options: { ...draft.options, bgVideo: v } })} onBlur={() => { const v = normalizeUrl(draft.options.bgVideo ?? ''); set({ options: { ...draft.options, bgVideo: v } }); void save({ options: { ...block.options, bgVideo: v || undefined } }); }} fullWidth type="url">
            <Label>Video address</Label><Input placeholder="https://…/clip.mp4" inputMode="url" />
            <Description>A link to an MP4 or WebM file. It plays muted, on a loop, behind the block.</Description>
          </TextField>
        )}
      </Area>

      <Area title="Block Fill" tip="How the colour is worn: painted on, as a line only, or as frosted glass. The border adds a thin line in the colour of the words." aside={<Switch isSelected={draft.border} onChange={(v) => { set({ border: v }); void save({ border: v }); }} size="sm"><Switch.Content><Switch.Control><Switch.Thumb /></Switch.Control><span className="text-sm">Border</span></Switch.Content></Switch>}>
        <div className="grid w-full grid-cols-3 gap-2" role="radiogroup" aria-label="Block effect">
          {effects.map((e) => <Tile key={e.key} on={(draft.effect ?? 'fill') === e.key} label={e.label} onClick={() => { set({ effect: e.key }); void save({ effect: e.key }); }}><EffectSwatch effect={e.key} colour={!block.bg_path && draft.bg_color ? draft.bg_color : '#ffe91a'} /></Tile>)}
        </div>
        <p className="text-xs text-muted">{effects.find((e) => e.key === (draft.effect ?? 'fill'))?.tip}</p>
      </Area>

      <Area title="Block Fonts" tip="The typeface, the colour, the size and the alignment of this block's words. Auto picks the colour that reads better on the background. The page's own font is set under Look.">
        <div className="grid w-full grid-cols-3 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Typeface">
          <Tile on={!draft.font} label="Page's font" onClick={() => { set({ font: '' }); void save({ font: '' }); }}><span className="grid size-full place-items-center bg-surface-secondary text-xl font-bold" style={{ fontFamily: fontById(page.font).family }}>Aa</span></Tile>
          {fonts.map((f) => <Tile key={f.id} on={draft.font === f.id} label={f.label} onClick={() => { set({ font: f.id }); void save({ font: f.id }); }}><span className="grid size-full place-items-center bg-surface-secondary text-xl font-bold" style={{ fontFamily: f.family }}>Aa</span></Tile>)}
          <Tile on={isCustom(draft.font)} label={isCustom(draft.font) ? customName(draft.font) : 'Custom'} onClick={() => setCustomOpen(true)}><span className="grid size-full place-items-center border border-dashed border-border bg-surface-secondary text-xl font-bold" style={isCustom(draft.font) ? { fontFamily: fontById(draft.font).family } : undefined}>Aa</span></Tile>
        </div>
        {(customOpen || isCustom(draft.font)) && (
          <TextField value={customDraft} onChange={setCustomDraft} onBlur={() => { const n = cleanFamily(customDraft); if (n) { ensureFonts([CUSTOM + n]); set({ font: CUSTOM + n }); void save({ font: CUSTOM + n }); } }} fullWidth>
            <Label>Font name</Label><Input placeholder="Oswald" />
            <Description>Any family from fonts.google.com, spelled as it is there.</Description>
          </TextField>
        )}
        <div className="grid w-full grid-cols-4 gap-2" role="radiogroup" aria-label="Words colour">
          {tones.map((t) => <Tile key={t.key} on={draft.text_color === t.key} label={t.label} onClick={() => { set({ text_color: t.key }); void save({ text_color: t.key }); }}><span className="grid size-full place-items-center text-base font-extrabold" style={{ ...t.style, fontFamily: 'var(--font-display)' }}>Aa</span></Tile>)}
          <Tile on={isHex(draft.text_color)} label="Custom" onClick={() => wordsPicker.current?.click()}>
            <span className="relative grid size-full place-items-center text-base font-extrabold" style={{ background: isHex(draft.text_color) ? '#ffffff' : 'conic-gradient(from 90deg, #ff6b57, #ffe91a, #3f8f3a, #0073fe, #8f7cf8, #ff6b57)', color: isHex(draft.text_color) ? draft.text_color : '#ffffff', fontFamily: 'var(--font-display)' }}>
              Aa
              <input ref={wordsPicker} type="color" className="absolute inset-0 size-full cursor-pointer opacity-0" aria-label="Any colour for the words" value={isHex(draft.text_color) ? draft.text_color : '#272d39'} onChange={(e) => { const c = e.target.value.toLowerCase(); set({ text_color: c }); pushWords({ text_color: c }); }} onClick={(e) => e.stopPropagation()} />
            </span>
          </Tile>
        </div>
        <Label>Title size</Label>
        <div className="grid w-full grid-cols-4 gap-2" role="radiogroup" aria-label="Title size">
          {sizes.map((z) => <Tile key={z.key} on={(draft.text_size ?? 'm') === z.key} label={z.label} onClick={() => { set({ text_size: z.key }); void save({ text_size: z.key }); }}><span className="grid size-full place-items-center font-extrabold" style={{ fontSize: z.px, fontFamily: 'var(--font-display)' }}>Aa</span></Tile>)}
        </div>
        <Label>Subtext size</Label>
        <div className="grid w-full grid-cols-3 gap-2" role="radiogroup" aria-label="Subtext size">
          {sizes.filter((z) => z.key !== 'xl').map((z) => <Tile key={z.key} on={(draft.sub_size ?? 'm') === z.key} label={z.label} onClick={() => { const v = z.key as Block['sub_size']; set({ sub_size: v }); void save({ sub_size: v }); }}><span className="grid size-full place-items-center font-medium" style={{ fontSize: z.px - 3 }}>Aa</span></Tile>)}
        </div>
        <Label>Alignment</Label>
        <div className="grid w-full grid-cols-3 gap-2" role="radiogroup" aria-label="Words alignment">
          {aligns.map((a) => <Tile key={a.key} on={(draft.text_align ?? 'left') === a.key} label={a.label} onClick={() => { set({ text_align: a.key }); void save({ text_align: a.key }); }}><a.Icon className="size-6" /></Tile>)}
        </div>
        <div className="grid w-full grid-cols-3 gap-2" role="radiogroup" aria-label="Words vertical alignment">
          {valigns.map((a) => <Tile key={a.key} on={(draft.text_valign ?? 'bottom') === a.key} label={a.label} onClick={() => { set({ text_valign: a.key }); void save({ text_valign: a.key }); }}><a.Icon className="size-6" /></Tile>)}
        </div>
      </Area>

      <Area title="Block Visibility" tip="When the block is on the page, and who gets past it. Leave both dates empty and it is always there. Archived keeps it here, off the page." aside={<Switch isSelected={draft.archived} onChange={(v) => { set({ archived: v }); void save({ archived: v }); }} size="sm"><Switch.Content><Switch.Control><Switch.Thumb /></Switch.Control><span className="text-sm">Archived</span></Switch.Content></Switch>}>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField value={toLocal(draft.starts_at)} onChange={(v) => { set({ starts_at: fromLocal(v) }); void save({ starts_at: fromLocal(v) }); }} fullWidth type="datetime-local"><Label>Show from</Label><Input /></TextField>
          <TextField value={toLocal(draft.ends_at)} onChange={(v) => { set({ ends_at: fromLocal(v) }); void save({ ends_at: fromLocal(v) }); }} fullWidth type="datetime-local"><Label>Hide after</Label><Input /></TextField>
        </div>
        <div className="flex flex-col items-start gap-2">
          <Label>Lock</Label>
        <div className="grid w-full grid-cols-3 gap-2" role="radiogroup" aria-label="Block lock">
          {locks.map((l) => <Tile key={l.key} on={draft.lock_kind === l.key} label={l.label} onClick={() => void setLock(l.key)}><l.Icon className="size-6" weight={l.key === 'none' ? 'regular' : 'fill'} /></Tile>)}
        </div>
        {draft.lock_kind === 'code' && <div className="flex w-full flex-col gap-2">{block.lock_hash && <Notice status="success" icon={false} title="Code set">Visitors type it before the block opens.</Notice>}<div className="flex gap-2"><TextField value={code} onChange={setCode} fullWidth aria-label="Code"><Input placeholder={block.lock_hash ? 'New code' : 'At least 4 characters'} autoComplete="off" /></TextField><Button variant="primary" onPress={() => void saveCode()} isDisabled={code.trim().length < 4}>{block.lock_hash ? 'Replace' : 'Set'}</Button></div></div>}
        {draft.lock_kind === 'age' && <Select aria-label="Minimum age" selectedKey={String(draft.min_age ?? 18)} onSelectionChange={(k) => { set({ min_age: Number(k) }); void save({ min_age: Number(k) }); }} className="w-40"><Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger><Select.Popover><ListBox>{[13, 16, 18, 21].map((a) => <ListBox.Item key={a} id={String(a)} textValue={`${a} and over`}>{a} and over</ListBox.Item>)}</ListBox></Select.Popover></Select>}
        </div>
      </Area>

      <p className="px-1 text-xs text-muted">{block.clicks.toLocaleString()} {block.clicks === 1 ? 'tap' : 'taps'}</p>
    </div>
  );
}

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  const arrow = 'grid size-7 place-items-center rounded-sm bg-(--yare-yellow) text-(--yare-ink) hover:bg-(--yare-yellow-hover) disabled:opacity-30 disabled:hover:bg-(--yare-yellow)';
  return (
    <span className="inline-flex items-center gap-1 rounded-(--yare-radius-control) border border-border p-1" aria-label={label}>
      <button type="button" className={arrow} aria-label={`${label}: less`} disabled={value <= min} onClick={() => onChange(value - 1)}><CaretDownIcon weight="bold" className="size-3" /></button>
      <span className="min-w-5 text-center text-sm font-semibold tabular-nums">{value}</span>
      <button type="button" className={arrow} aria-label={`${label}: more`} disabled={value >= max} onClick={() => onChange(value + 1)}><CaretUpIcon weight="bold" className="size-3" /></button>
    </span>
  );
}
