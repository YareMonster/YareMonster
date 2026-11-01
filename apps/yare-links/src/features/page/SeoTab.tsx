import { useMemo, useRef, useState } from 'react';
import { Button, Card, Description, Input, Label, Switch, TextArea, TextField, toast } from '@heroui/react';
import { BuildingsIcon, CopyIcon, ImageIcon, UserIcon } from '@phosphor-icons/react';
import { MonsterNote, YareMark } from '../../yare';
import type { Block, Client, Page, PagePatch } from '../../lib/supabase';
import { imageUrl } from '../../lib/supabase';
import { removeImage, updatePage, uploadImage } from '../../lib/links-api';
import { useDebouncedPatch } from '../../lib/save-status';
import { agentSummary, structuredData } from '../../lib/seo';
import { toPublic } from './Preview';
import { Tile } from './Tile';

type Run = <T>(work: () => Promise<T>, failMessage?: string) => Promise<T | undefined>;
interface Props { db: Client; page: Page; blocks: Block[]; onPage: (p: Page) => void; run: Run }

/**
 * How the page reads to search engines, messaging apps and agents: the title and description, the
 * picture when shared, the page's own icon, and the structured data and plain summary agents get.
 * The previews on the right follow every keystroke.
 */
export function SeoTab({ db, page, blocks, onPage, run }: Props) {
  const [seoTitle, setSeoTitle] = useState(page.seo_title);
  const [seoDesc, setSeoDesc] = useState(page.seo_description);
  const sharePicker = useRef<HTMLInputElement>(null);
  const iconPicker = useRef<HTMLInputElement>(null);
  const save = async (patch: PagePatch) => { const next = await run(() => updatePage(db, page.id, patch)); if (next) onPage(next); };
  const push = useDebouncedPatch<PagePatch>((p) => void save(p), 600);
  const address = `${window.location.origin}/${page.slug}`;
  const host = window.location.host;
  const share = imageUrl(db, page.share_image_path) ?? imageUrl(db, page.avatar_path);
  const icon = imageUrl(db, page.icon_path);
  const title = seoTitle || page.title;
  const description = seoDesc || page.bio || '';

  async function pick(kind: 'share' | 'icon', file: File | undefined) {
    if (!file) return;
    if (file.size > 2097152) { toast.danger('Keep the picture under 2 MB.'); return; }
    const path = await run(() => uploadImage(db, page.id, kind, file), 'Could not upload the picture.');
    if (!path) return;
    const key = kind === 'share' ? 'share_image_path' : 'icon_path';
    const old = page[key]; await save({ [key]: path }); if (old) await removeImage(db, old);
  }
  async function clear(key: 'share_image_path' | 'icon_path') { const old = page[key]; await save({ [key]: null }); if (old) await removeImage(db, old); }

  const pub = useMemo(() => ({ ...toPublic({ ...page, seo_title: seoTitle, seo_description: seoDesc }, blocks) }), [page, blocks, seoTitle, seoDesc]);
  const data = useMemo(() => JSON.stringify(structuredData(pub, address, share), null, 2), [pub, address, share]);
  const summary = useMemo(() => agentSummary(pub, address), [pub, address]);
  const copy = (text: string, what: string) => { void navigator.clipboard.writeText(text); toast.success(`${what} copied`); };

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-4">
        <Card className="gap-4 p-5">
          <div><h3 className="text-base">In search results</h3><p className="text-sm text-muted">What Google and the others show for your page.</p></div>
          <TextField value={seoTitle} onChange={(v) => { setSeoTitle(v); push({ seo_title: v }); }} fullWidth maxLength={70}><Label>Title</Label><Input placeholder={page.title} /><Description>{seoTitle.length}/70. The page name when empty.</Description></TextField>
          <TextField value={seoDesc} onChange={(v) => { setSeoDesc(v); push({ seo_description: v }); }} fullWidth maxLength={160}><Label>Description</Label><TextArea rows={3} placeholder={page.bio || 'One or two lines about you.'} /><Description>{seoDesc.length}/160. Your bio when empty.</Description></TextField>
          <Switch isSelected={page.seo_index} onChange={(v) => void save({ seo_index: v })}>
            <Switch.Content><Switch.Control><Switch.Thumb /></Switch.Control><span className="flex flex-col"><span>Let search engines list this page</span><span className="text-xs text-muted">Off, the page still opens for anyone with the link; it just asks not to be listed.</span></span></Switch.Content>
          </Switch>
        </Card>

        <Card className="gap-4 p-5">
          <div><h3 className="text-base">When shared</h3><p className="text-sm text-muted">The picture messaging apps and social networks show beside the title.</p></div>
          <div className="flex items-center gap-4">
            <div className="grid h-20 w-36 flex-none place-items-center overflow-hidden rounded-(--yare-radius-control) border border-border bg-surface-secondary">{share ? <img src={share} alt="" className="size-full object-cover" /> : <ImageIcon className="size-6 text-muted" />}</div>
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onPress={() => sharePicker.current?.click()}>{page.share_image_path ? 'Change' : 'Add a picture'}</Button>{page.share_image_path && <Button variant="ghost" size="sm" onPress={() => void clear('share_image_path')}>Remove</Button>}</div>
              <p className="text-xs text-muted">1200 × 630 works everywhere. Your profile picture when empty.</p>
            </div>
          </div>
          <input ref={sharePicker} type="file" hidden accept="image/png,image/jpeg,image/webp" onChange={(e) => { void pick('share', e.target.files?.[0]); e.target.value = ''; }} />
        </Card>

        <Card className="gap-4 p-5">
          <div><h3 className="text-base">Icon</h3><p className="text-sm text-muted">In the browser tab and on a phone's home screen when someone saves the page.</p></div>
          <div className="flex items-center gap-4">
            <div className="grid size-16 flex-none place-items-center overflow-hidden rounded-(--yare-radius-control) border border-border bg-surface-secondary">{icon ? <img src={icon} alt="" className="size-full object-cover" /> : <YareMark size={32} />}</div>
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onPress={() => iconPicker.current?.click()}>{page.icon_path ? 'Change' : 'Add an icon'}</Button>{page.icon_path && <Button variant="ghost" size="sm" onPress={() => void clear('icon_path')}>Remove</Button>}</div>
              <p className="text-xs text-muted">A square PNG, 512 × 512. The Yare Monster mark when empty.</p>
            </div>
          </div>
          <input ref={iconPicker} type="file" hidden accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(e) => { void pick('icon', e.target.files?.[0]); e.target.value = ''; }} />
        </Card>

        <Card className="gap-4 p-5">
          <div><h3 className="text-base">For agents</h3><p className="text-sm text-muted">Assistants and search engines read structured data and a plain summary of the page, both written for them from what is on it.</p></div>
          <div className="flex flex-col items-start gap-2">
            <Label>This page is about</Label>
            <div className="grid w-full grid-cols-2 gap-2 sm:w-72" role="radiogroup" aria-label="This page is about">
              <Tile on={page.schema_kind !== 'organization'} label="A person" onClick={() => void save({ schema_kind: 'person' })}><UserIcon className="size-6" /></Tile>
              <Tile on={page.schema_kind === 'organization'} label="An organisation" onClick={() => void save({ schema_kind: 'organization' })}><BuildingsIcon className="size-6" /></Tile>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Summary address</Label>
            <div className="flex items-center gap-2 rounded-(--yare-radius-control) border border-border bg-surface-secondary px-3 py-2 font-mono text-sm"><span className="min-w-0 flex-1 truncate">{address}/summary.txt</span><Button variant="ghost" size="sm" isIconOnly aria-label="Copy" onPress={() => copy(`${address}/summary.txt`, 'Address')}><CopyIcon /></Button></div>
            <Description>{/^(localhost|127\.0\.0\.1)/.test(host) ? 'Served by the Worker on your deployed site, not on localhost. ' : ''}Give this to an assistant and it knows who you are and where your links go.</Description>
          </div>
        </Card>
        <Card className="gap-3 p-5">
          <div className="flex items-center justify-between"><h3 className="text-sm text-muted">What agents read</h3><div className="flex gap-1"><Button variant="ghost" size="sm" onPress={() => copy(summary, 'Summary')}>Copy summary</Button><Button variant="ghost" size="sm" onPress={() => copy(data, 'Structured data')}>Copy data</Button></div></div>
          <pre className="max-h-64 overflow-auto rounded-(--yare-radius-control) border border-border bg-surface-secondary p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap">{summary}</pre>
        </Card>
        <MonsterNote title="Written into the page itself">Everything here goes into the page before it leaves your Cloudflare, so apps that never run scripts still see it: link previews in WhatsApp and Slack, Google's first pass, assistants reading the page.</MonsterNote>
      </div>

      <div className="yare-phone-dock flex min-w-0 flex-col gap-4">
        <Card className="gap-3 p-5">
          <h3 className="text-sm text-muted">Google</h3>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-xs text-muted"><span className="grid size-6 place-items-center overflow-hidden rounded-full border border-border bg-surface-secondary">{icon ? <img src={icon} alt="" className="size-full object-cover" /> : <YareMark size={14} />}</span><span className="flex flex-col leading-tight"><span className="text-foreground">{host}</span><span>{address}</span></span></div>
            <span className="text-lg leading-snug" style={{ color: '#1a0dab' }}>{title}</span>
            <span className="text-sm text-muted">{description || 'Add a description so people know what they will find.'}</span>
          </div>
        </Card>
        <Card className="gap-3 p-5">
          <h3 className="text-sm text-muted">Shared in a message</h3>
          <div className="overflow-hidden rounded-(--yare-radius-control) border border-border">
            <div className="aspect-[1.91/1] w-full bg-surface-secondary">{share ? <img src={share} alt="" className="size-full object-cover" /> : <div className="grid size-full place-items-center"><ImageIcon className="size-8 text-muted" /></div>}</div>
            <div className="flex flex-col gap-0.5 bg-surface p-3"><span className="truncate text-sm font-semibold">{title}</span><span className="line-clamp-2 text-xs text-muted">{description}</span><span className="text-xs text-muted uppercase">{host}</span></div>
          </div>
        </Card>
      </div>
    </div>
  );
}
