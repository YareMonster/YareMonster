import { useEffect, useRef, useState, type Dispatch } from 'react';
import { AlertDialog, Button, Card, toast } from '@heroui/react';
import { MonsterNote } from '../../yare';
import type { Block, Client, Page, PublicBlock, PublicPage } from '../../lib/supabase';
import { applyTemplate } from '../../lib/links-api';
import { templates, type Template } from '../../lib/templates';
import { GridScreen } from '../../grid/GridScreen';

type Run = <T>(work: () => Promise<T>, failMessage?: string) => Promise<T | undefined>;
interface Props { db: Client; page: Page; blocks: Block[]; setBlocks: Dispatch<(b: Block[]) => Block[]>; onPage: (p: Page) => void; run: Run; onApplied: () => void }

const PREVIEW_W = 360;

/** A template drawn as the page it would make, small: drawn at phone width, then scaled to the card. */
function TemplatePreview({ t }: { t: Template }) {
  if (t.preview) return <img src={t.preview} alt="" className="w-full rounded-(--yare-radius-control) border border-black/5" style={{ aspectRatio: '9 / 13', objectFit: 'cover', objectPosition: 'top' }} />;
  return <TemplateDrawing t={t} />;
}

/** Without a picture of the design, the card draws the blocks at phone width, scaled down. */
function TemplateDrawing({ t }: { t: Template }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.8);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setScale(el.clientWidth / PREVIEW_W);
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const page = { ...t.page, font: t.page.font ?? 'nunito', grid_pad: t.page.grid_pad ?? true, wallpaper_kind: 'none', wallpaper_path: null, blocks: t.blocks.map((b, i) => ({ ...b, id: `${t.id}-${i}`, thumbnail_path: null, bg_path: null, featured: false, highlight: 'none', lock_kind: 'none', min_age: null, options: {} })) as unknown as PublicBlock[] } as unknown as PublicPage;
  return (
    <div ref={box} className="relative w-full overflow-hidden rounded-(--yare-radius-control) border border-black/5" style={{ aspectRatio: '9 / 13' }} aria-hidden="true">
      <div className="absolute top-0 left-0 origin-top-left" style={{ width: PREVIEW_W, transform: `scale(${scale})`, '--yg-min-h': `${Math.round(PREVIEW_W * 19.5 / 9)}px` } as React.CSSProperties} data-screen-h={Math.round(PREVIEW_W * 19.5 / 9)}>
        <GridScreen page={page} ctx={{ imageUrl: () => null, mediaUrl: () => null, edit: true }} />
      </div>
    </div>
  );
}

/** Nine starting points. Picking one sets the look and lays out the blocks; the words are placeholders to replace. */
export function TemplatesTab({ db, page, blocks, setBlocks, onPage, run, onApplied }: Props) {
  const [pending, setPending] = useState<Template | null>(null);
  const [busy, setBusy] = useState(false);

  async function use(t: Template) {
    setBusy(true);
    const got = await run(() => applyTemplate(db, page, blocks, t), 'Could not apply the template.');
    setBusy(false); setPending(null);
    if (!got) return;
    onPage(got.page); setBlocks(() => got.blocks);
    toast.success(`${t.name} is on the page`);
    onApplied();
  }

  return (
    <div className="flex flex-col gap-5">
      <MonsterNote title="A head start">Pick a template and the page takes its look and its blocks, laid out like the design on the card. Every word is a placeholder and the pictures are yours to add: press a block on the phone to make it yours. Your current blocks are replaced.</MonsterNote>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((t) => (
          <Card key={t.id} className="gap-3 p-4">
            <TemplatePreview t={t} />
            <div className="flex items-start justify-between gap-3">
              <div><h3 className="text-base">{t.name}</h3><p className="text-sm text-muted">{t.blurb}</p></div>
              <Button variant={blocks.length ? 'outline' : 'primary'} size="sm" onPress={() => (blocks.length ? setPending(t) : void use(t))}>Use</Button>
            </div>
          </Card>
        ))}
      </div>
      <AlertDialog isOpen={!!pending} onOpenChange={(o) => { if (!o) setPending(null); }}>
        <AlertDialog.Backdrop><AlertDialog.Container size="sm"><AlertDialog.Dialog aria-label="Use template">
          <AlertDialog.Header><AlertDialog.Heading>Start over with {pending?.name}?</AlertDialog.Heading></AlertDialog.Header>
          <AlertDialog.Body><p className="text-sm text-muted">The {blocks.length} {blocks.length === 1 ? 'block' : 'blocks'} on the page go, pictures included, and the template's blocks take their place. The address, settings and figures stay.</p></AlertDialog.Body>
          <AlertDialog.Footer><Button variant="outline" onPress={() => setPending(null)}>Keep my blocks</Button><Button variant="danger" isPending={busy} onPress={() => pending && void use(pending)}>Use {pending?.name}</Button></AlertDialog.Footer>
        </AlertDialog.Dialog></AlertDialog.Container></AlertDialog.Backdrop>
      </AlertDialog>
    </div>
  );
}
