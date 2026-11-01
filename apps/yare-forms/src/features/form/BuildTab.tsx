import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { Button, Card, Description, Dropdown, Input, Label, Switch, TextArea, TextField, toast } from '@heroui/react';
import { ArrowDownIcon, ArrowUpIcon, CaretDownIcon, CheckIcon, DeviceMobileIcon, DeviceTabletIcon, ImageIcon, MonitorIcon, PlusIcon, SidebarSimpleIcon, TrashIcon } from '@phosphor-icons/react';
import { Notice } from '../../yare';
import type { Block, BlockOptions, BlockType, Client, Form } from '../../lib/supabase';
import { imageUrl } from '../../lib/supabase';
import { addBlock, deleteBlock, removeImage, reorderBlocks, updateBlock, uploadImage } from '../../lib/forms-api';
import { blockKinds, isQuestion, kindOf } from '../../lib/blocks';
import { themeById, themeStyle } from '../../lib/themes';
import { useDebouncedPatch } from '../../lib/save-status';
import { ScreenView } from '../../public/ScreenView';
import '../../public/public-form.css';

interface Props {
  db: Client;
  form: Form;
  blocks: Block[];
  setBlocks: Dispatch<SetStateAction<Block[]>>;
  run: <T>(work: () => Promise<T>, failMessage?: string) => Promise<T | undefined>;
}

/** Half and half: the screens on the left, each one opening its settings right under its row; how it looks on the right, staying in view. */
export function BuildTab({ db, form, blocks, setBlocks, run }: Props) {
  // Nothing open until a row is pressed; a row can be folded again, so none may be open.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Three views: mobile (a wide list, a phone-narrow preview), tablet (40 and 60) and monitor (the list folded to a rail, a wide 16:10 preview).
  const [view, setView] = useState<'mobile' | 'tablet' | 'monitor'>('tablet');
  const rail = view === 'monitor';
  const setRail = (on: boolean) => setView(on ? 'monitor' : 'tablet');
  useEffect(() => { if (selectedId && !blocks.some((b) => b.id === selectedId)) setSelectedId(null); }, [blocks, selectedId]);
  const selected = blocks.find((b) => b.id === selectedId) ?? null;
  const hasWelcome = blocks.some((b) => b.type === 'welcome');
  const screenPreview = selected && <ScreenView block={selected} value={undefined} onChange={() => undefined} onNext={() => undefined} imageUrl={imageUrl(db, selected.options.imagePath)} imageSide={selected.options.imageSide} isLast={blocks[blocks.indexOf(selected) + 1]?.type === 'end'} preview />;
  const hasEnd = blocks.some((b) => b.type === 'end');

  async function add(type: BlockType) {
    // Welcome goes first, the thank-you screen last, questions before the thank-you screen.
    const endIdx = blocks.findIndex((b) => b.type === 'end');
    const position = type === 'welcome' ? 0 : type === 'end' ? blocks.length : endIdx >= 0 ? endIdx : blocks.length;
    const created = await run(() => addBlock(db, form.id, type, position));
    if (!created) return;
    const next = [...blocks];
    next.splice(position, 0, created);
    const ordered = next.map((b, i) => ({ ...b, position: i }));
    setBlocks(ordered);
    setSelectedId(created.id);
    void run(() => reorderBlocks(db, ordered.map((b) => b.id)));
  }

  async function remove(block: Block) {
    const ok = await run(() => deleteBlock(db, block.id).then(() => true));
    if (!ok) return;
    setBlocks((list) => list.filter((b) => b.id !== block.id));
  }

  function move(block: Block, dir: -1 | 1) {
    const i = blocks.indexOf(block);
    const j = i + dir;
    if (j < 0 || j >= blocks.length) return;
    const next = [...blocks];
    [next[i], next[j]] = [next[j]!, next[i]!];
    const ordered = next.map((b, k) => ({ ...b, position: k }));
    setBlocks(ordered);
    void run(() => reorderBlocks(db, ordered.map((b) => b.id)));
  }

  return (
    <div className={`grid items-start gap-6 ${view === 'monitor' ? 'lg:grid-cols-[4rem_minmax(0,1fr)]' : view === 'mobile' ? 'lg:grid-cols-[minmax(0,1fr)_22rem]' : 'lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]'}`}>
      {rail ? (
        <Card className="items-center gap-1 p-1.5">
          <Button variant="ghost" size="sm" isIconOnly aria-label="Show the screens" onPress={() => setRail(false)}><SidebarSimpleIcon /></Button>
          <ol className="flex flex-col items-center gap-1">
            {blocks.map((b, i) => {
              const n = blocks.slice(0, i + 1).filter(isQuestion).length;
              return <li key={b.id}><button type="button" className="yare-step-n" data-active={b.id === selectedId || undefined} aria-label={b.title || kindOf(b.type).label} title={b.title || kindOf(b.type).label} onClick={() => setSelectedId(b.id)}>{isQuestion(b) ? n : b.type === 'welcome' ? 'C' : 'E'}</button></li>;
            })}
          </ol>
        </Card>
      ) : (
      <Card className="min-w-0 gap-2 p-3">
        <div className="flex items-center justify-between px-2 pt-1">
          <div className="flex items-center gap-1"><Button variant="ghost" size="sm" isIconOnly aria-label="Fold the screens away" onPress={() => setRail(true)}><SidebarSimpleIcon /></Button><h3 className="text-base">Screens</h3></div>
          <Dropdown>
            <Button variant="primary" size="sm"><PlusIcon weight="bold" /> Add</Button>
            <Dropdown.Popover placement="bottom end" className="w-72">
              <Dropdown.Menu aria-label="Add a screen" onAction={(key) => void add(key as BlockType)} disabledKeys={[...(hasWelcome ? ['welcome'] : []), ...(hasEnd ? ['end'] : [])]}>
                {blockKinds.map((k) => (
                  <Dropdown.Item key={k.type} id={k.type} textValue={k.label}>
                    <div className="flex flex-col"><span>{k.label}</span><span className="text-xs text-muted">{k.hint}</span></div>
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </div>
        <ol className="flex flex-col gap-1">
          {blocks.map((b, i) => {
            const n = blocks.slice(0, i + 1).filter(isQuestion).length;
            return (
              <li key={b.id} className="yare-fold" data-open={b.id === selectedId || undefined}>
                <div className="yare-fold__row">
                  <button type="button" className="yare-fold__head" aria-expanded={b.id === selectedId} onClick={() => setSelectedId(b.id === selectedId ? null : b.id)}>
                    <span className="yare-step-n">{isQuestion(b) ? n : b.type === 'welcome' ? 'C' : 'E'}</span>
                    <span className="yare-fold__label">{b.title || kindOf(b.type).label}</span>
                  </button>
                  <Button variant="ghost" size="sm" isIconOnly aria-label="Move up" isDisabled={i === 0} onPress={() => move(b, -1)}><ArrowUpIcon /></Button>
                  <Button variant="ghost" size="sm" isIconOnly aria-label="Move down" isDisabled={i === blocks.length - 1} onPress={() => move(b, 1)}><ArrowDownIcon /></Button>
                  <Button variant="ghost" size="sm" isIconOnly aria-label={b.id === selectedId ? 'Close' : 'Open'} onPress={() => setSelectedId(b.id === selectedId ? null : b.id)}><CaretDownIcon className={`transition-transform ${b.id === selectedId ? 'rotate-180' : ''}`} /></Button>
                </div>
                {b.id === selectedId && (
                  <div className="yare-fold__body">
                    <BlockEditor key={b.id} db={db} form={form} block={b} run={run} onChange={(next) => setBlocks((list) => list.map((x) => (x.id === next.id ? next : x)))} onDelete={() => void remove(b)} />
                  </div>
                )}
              </li>
            );
          })}
        </ol>
        {blocks.length === 0 && <p className="px-2 pb-2 text-sm text-muted">Add a screen to begin.</p>}
      </Card>
      )}

      {/* How it looks, staying in view while the screens scroll. Narrow beside the open list, it stands taller; with the list folded to its rail it is a 16:10 screen. */}
      <div className="yare-phone-dock hidden lg:block">
        <Card className="relative mx-auto w-full overflow-hidden p-0" style={rail ? { maxWidth: 'calc((100dvh - var(--yare-topbar-h) - 9rem) * 1.6)' } : undefined}>
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
            <Button variant={view === 'mobile' ? 'outline' : 'ghost'} size="sm" isIconOnly aria-label="Mobile" aria-pressed={view === 'mobile'} onPress={() => setView('mobile')}><DeviceMobileIcon /></Button>
            <Button variant={view === 'tablet' ? 'outline' : 'ghost'} size="sm" isIconOnly aria-label="Tablet" aria-pressed={view === 'tablet'} onPress={() => setView('tablet')}><DeviceTabletIcon /></Button>
            <Button variant={view === 'monitor' ? 'outline' : 'ghost'} size="sm" isIconOnly aria-label="Monitor" aria-pressed={view === 'monitor'} onPress={() => setView('monitor')}><MonitorIcon /></Button>
          </div>
          {selected ? (
            <div className="yf yf--framed" data-tall={view === 'tablet' || undefined} data-phone={view === 'mobile' || undefined} style={{ ...(themeStyle(themeById(form.theme)) as React.CSSProperties) } as React.CSSProperties}>
              <main className="yf__main">{screenPreview}</main>
            </div>
          ) : <p className="p-5 text-sm text-muted">Open a screen to see it here.</p>}
        </Card>
      </div>
    </div>
  );
}

const sides = [{ key: 'none', label: 'None' }, { key: 'left', label: 'Left' }, { key: 'right', label: 'Right' }, { key: 'full-left', label: 'Full left' }, { key: 'full-right', label: 'Full right' }] as const;

function BlockEditor({ db, form, block, run, onChange, onDelete }: { db: Client; form: Form; block: Block; run: Props['run']; onChange: (b: Block) => void; onDelete: () => void }) {
  const kind = kindOf(block.type);
  const [draft, setDraft] = useState(block);
  useEffect(() => setDraft(block), [block.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = useDebouncedPatch((patch: Partial<Pick<Block, 'title' | 'description' | 'required' | 'options'>>) => { void run(() => updateBlock(db, block.id, patch)); }, 600);

  function set(patch: Partial<Pick<Block, 'title' | 'description' | 'required' | 'options'>>) {
    const next = { ...draft, ...patch };
    setDraft(next);
    onChange(next);
    save(patch);
  }
  function setOption<K extends keyof BlockOptions>(key: K, value: BlockOptions[K]) {
    set({ options: { ...draft.options, [key]: value } });
  }
  const choicesText = useMemo(() => (draft.options.choices ?? []).join('\n'), [draft.options.choices]);
  const hasChoices = ['multiple_choice', 'checkboxes', 'dropdown'].includes(block.type);
  const hasText = ['short_text', 'long_text'].includes(block.type);
  const hasPlaceholder = ['short_text', 'long_text', 'email', 'number'].includes(block.type);

  async function pickImage(file: File | undefined) {
    if (!file) return;
    const path = await run(() => uploadImage(db, form.id, `block-${block.id}`, file), 'Could not upload the image.');
    if (path) { set({ options: { ...draft.options, imagePath: path } }); toast.success('Image added'); }
  }
  async function clearImage() {
    const old = draft.options.imagePath;
    set({ options: { ...draft.options, imagePath: undefined } });
    if (old) await removeImage(db, old);
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-muted">{kind.label}</div>
        <p className="text-sm text-muted">{kind.hint}</p>
      </div>
      <TextField fullWidth value={draft.title} onChange={(v) => set({ title: v })} maxLength={300}>
        <Label>{kind.isQuestion ? 'Question' : 'Title'}</Label>
        <Input placeholder={kind.defaults.title} />
      </TextField>
      <TextField fullWidth value={draft.description} onChange={(v) => set({ description: v })} maxLength={1000}>
        <Label>Supporting text</Label>
        <TextArea rows={2} placeholder="Optional. A line that helps people answer." />
      </TextField>

      {hasChoices && (
        <TextField fullWidth value={choicesText} onChange={(v) => setOption('choices', v.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 50))}>
          <Label>Options</Label>
          <TextArea rows={4} placeholder={'One per line'} />
          <Description>One option per line, up to 50.</Description>
        </TextField>
      )}
      {hasPlaceholder && (
        <TextField fullWidth value={draft.options.placeholder ?? ''} onChange={(v) => setOption('placeholder', v || undefined)} maxLength={80}>
          <Label>Placeholder</Label>
          <Input placeholder="Shown inside the empty field" />
        </TextField>
      )}
      {hasText && (
        <TextField fullWidth value={String(draft.options.maxLength ?? '')} onChange={(v) => setOption('maxLength', v ? Math.max(1, Math.min(5000, Number(v) || 0)) : undefined)} type="number">
          <Label>Maximum characters</Label>
          <Input inputMode="numeric" placeholder={block.type === 'short_text' ? '120' : '2000'} />
        </TextField>
      )}
      {block.type === 'welcome' && (
        <TextField fullWidth value={draft.options.buttonLabel ?? ''} onChange={(v) => setOption('buttonLabel', v || undefined)} maxLength={40}>
          <Label>Button</Label>
          <Input placeholder="Start" />
        </TextField>
      )}
      <div className="flex flex-col gap-2">
        <Label>Image</Label>
        {draft.options.imagePath && <img src={imageUrl(db, draft.options.imagePath) ?? undefined} alt="" className="max-h-40 w-auto max-w-full self-start rounded-(--yare-radius-control) border border-border object-contain" />}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onPress={() => document.getElementById(`img-${block.id}`)?.click()}><ImageIcon /> {draft.options.imagePath ? 'Replace' : 'Add image'}</Button>
          {draft.options.imagePath && <Button variant="ghost" size="sm" onPress={() => void clearImage()}>Remove</Button>}
          <input id={`img-${block.id}`} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(e) => void pickImage(e.target.files?.[0])} />
        </div>
        <Description>PNG, JPG, WebP or GIF up to 2 MB. Stored in your own Supabase storage.</Description>
      </div>
      <div className="flex flex-col gap-2">
        <Label>Image side</Label>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Image side">
          {sides.map((o) => (
            <button key={o.key} type="button" role="radio" aria-checked={(draft.options.imageSide ?? 'none') === o.key} aria-pressed={(draft.options.imageSide ?? 'none') === o.key} className="yare-pick !min-h-0 w-full !p-2" aria-label={o.label} onClick={() => setOption('imageSide', o.key === 'none' ? undefined : o.key)}>
              <span className="flex w-full flex-col gap-1.5">
                <span className={`grid h-12 w-full place-items-center overflow-hidden rounded-(--yare-radius-control) border border-black/5 bg-surface-secondary ${o.key.startsWith('full') ? 'p-0' : 'p-2'}`}>
                  <span className={`flex h-full w-full ${o.key.startsWith('full') ? 'gap-0' : 'gap-1'}`}>
                    {(o.key === 'left' || o.key === 'full-left') && <span className={`h-full w-1/2 bg-foreground/60 ${o.key === 'left' ? 'rounded-sm' : ''}`} />}
                    <span className={`flex h-full flex-1 flex-col justify-center gap-1 ${o.key.startsWith('full') ? 'px-2' : ''}`}><span className="h-1.5 w-3/4 rounded-sm bg-foreground/40" /><span className="h-1.5 w-1/2 rounded-sm bg-foreground/25" /></span>
                    {(o.key === 'right' || o.key === 'full-right') && <span className={`h-full w-1/2 bg-foreground/60 ${o.key === 'right' ? 'rounded-sm' : ''}`} />}
                  </span>
                </span>
                <span className="text-xs font-semibold">{o.label}</span>
              </span>
              {(draft.options.imageSide ?? 'none') === o.key && <CheckIcon weight="bold" className="yare-pick__check" />}
            </button>
          ))}
        </div>
        <Description>{draft.options.imageSide ? (draft.options.imagePath ? (draft.options.imageSide.startsWith('full') ? 'The picture takes its whole half of the page, edge to edge. On a phone it comes first.' : 'The screen splits half and half, the picture on that side. On a phone the picture comes first.') : 'Add an image above and the screen splits half and half.') : block.type === 'welcome' ? 'The cover picture sits above the title.' : 'No picture on this screen.'}</Description>
      </div>
      {kind.isQuestion && (
        <Switch isSelected={draft.required} onChange={(v) => set({ required: v })}>
          <Switch.Content><Switch.Control><Switch.Thumb /></Switch.Control>Required</Switch.Content>
        </Switch>
      )}
      {block.type === 'end' && <Notice status="default" icon={false} title="The last screen">People see this after their final answer. It cannot be skipped and has no button.</Notice>}
      <div className="flex justify-end border-t border-separator pt-3">
        <Button variant="ghost" size="sm" className="text-danger" onPress={onDelete}><TrashIcon /> Delete screen</Button>
      </div>
    </div>
  );
}
