import { useRef, useState } from 'react';
import { Button, Card, Description, Input, Label, TextArea, TextField, toast } from '@heroui/react';
import { CheckCircleIcon, CircleNotchIcon, ImageIcon } from '@phosphor-icons/react';
import { useGroup } from '../features/GroupContext';
import type { GroupPatch } from '../lib/supabase';
import { imageUrl } from '../lib/supabase';
import { removeImage, updateGroup, uploadBrand } from '../lib/groups-api';
import { groupThemeById, groupThemes, type GroupTheme } from '../lib/themes';
import { useDebouncedPatch } from '../lib/save-status';
import { ManageShell } from './ManageShell';

/** Name, words, pictures and theme: what the sign-in page and the group wear. */
export function LookPage() {
  const { db, group, setGroup } = useGroup();
  const [name, setName] = useState(group.name);
  const [tagline, setTagline] = useState(group.tagline);
  const [welcome, setWelcome] = useState(group.welcome);
  const [state, setState] = useState<'saved' | 'saving'>('saved');
  const [busy, setBusy] = useState<string | null>(null);
  const logoPicker = useRef<HTMLInputElement>(null);
  const bgPicker = useRef<HTMLInputElement>(null);

  async function save(patch: GroupPatch) {
    setState('saving');
    try { setGroup(await updateGroup(db, group.id, patch)); }
    catch (err) { toast.danger(err instanceof Error ? err.message : 'Could not save.'); }
    finally { setState('saved'); }
  }
  const push = useDebouncedPatch<GroupPatch>((p) => void save(p), 700);

  async function pick(kind: 'logo' | 'background', file: File | undefined) {
    if (!file) return;
    if (file.size > 2097152) { toast.danger('Keep the picture under 2 MB.'); return; }
    setBusy(kind);
    try {
      const path = await uploadBrand(db, kind, file);
      const old = kind === 'logo' ? group.logo_path : group.background_path;
      await save(kind === 'logo' ? { logo_path: path } : { background_path: path });
      if (old) await removeImage(db, old);
    } catch (err) { toast.danger(err instanceof Error ? err.message : 'Could not upload the picture.'); }
    finally { setBusy(null); }
  }
  async function clear(kind: 'logo' | 'background') {
    const old = kind === 'logo' ? group.logo_path : group.background_path;
    setBusy(kind);
    try { await save(kind === 'logo' ? { logo_path: null } : { background_path: null }); if (old) await removeImage(db, old); }
    finally { setBusy(null); }
  }

  const logo = imageUrl(db, group.logo_path);
  const background = imageUrl(db, group.background_path);
  return (
    <ManageShell crumb="Look" actions={<span className="flex items-center gap-1.5 text-sm text-muted">{state === 'saving' ? <><CircleNotchIcon className="animate-spin" /> Saving…</> : <><CheckCircleIcon /> All changes saved</>}</span>}>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="gap-4 p-5">
          <h2 className="text-lg">Name and words</h2>
          <TextField value={name} onChange={(v) => { setName(v); if (v.trim()) push({ name: v.trim() }); }} fullWidth maxLength={60} isRequired><Label>Group name</Label><Input /></TextField>
          <TextField value={tagline} onChange={(v) => { setTagline(v); push({ tagline: v.trim() }); }} fullWidth maxLength={160}><Label>Tagline</Label><Input placeholder="One line under the name" /></TextField>
          <TextField value={welcome} onChange={(v) => { setWelcome(v); push({ welcome: v.trim() }); }} fullWidth maxLength={2000}>
            <Label>Welcome</Label>
            <TextArea rows={4} placeholder="A few lines people read on the sign-in page before they join." />
            <Description>Shown on the sign-in page, under the name.</Description>
          </TextField>
        </Card>
        <Card className="gap-4 p-5">
          <h2 className="text-lg">Pictures</h2>
          <div className="flex items-center gap-4">
            <div className="grid size-16 flex-none place-items-center overflow-hidden rounded-xl border border-border bg-surface-secondary">{logo ? <img src={logo} alt="" className="size-full object-contain" /> : <ImageIcon className="size-6 text-muted" />}</div>
            <div className="flex flex-col gap-1.5">
              <div className="font-medium">Logo</div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" isPending={busy === 'logo'} onPress={() => logoPicker.current?.click()}>{logo ? 'Change' : 'Add a logo'}</Button>
                {logo && <Button variant="ghost" size="sm" onPress={() => void clear('logo')}>Remove</Button>}
              </div>
              <p className="text-xs text-muted">Square works best. PNG, JPG, WebP or SVG up to 2 MB.</p>
            </div>
            <input ref={logoPicker} type="file" hidden accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(e) => { void pick('logo', e.target.files?.[0]); e.target.value = ''; }} />
          </div>
          <div className="flex flex-col gap-2">
            <div className="font-medium">Sign-in background</div>
            <div className="relative h-32 overflow-hidden rounded-xl border border-border bg-surface-secondary">{background ? <img src={background} alt="" className="size-full object-cover" /> : <div className="grid size-full place-items-center text-sm text-muted">No picture: the theme's colour shows instead.</div>}</div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" isPending={busy === 'background'} onPress={() => bgPicker.current?.click()}>{background ? 'Change' : 'Add a picture'}</Button>
              {background && <Button variant="ghost" size="sm" onPress={() => void clear('background')}>Remove</Button>}
            </div>
            <p className="text-xs text-muted">A wide photo fills the sign-in page behind the card. JPG, PNG or WebP up to 2 MB.</p>
            <input ref={bgPicker} type="file" hidden accept="image/png,image/jpeg,image/webp" onChange={(e) => { void pick('background', e.target.files?.[0]); e.target.value = ''; }} />
          </div>
        </Card>
        <Card className="gap-5 p-5 lg:col-span-2 lg:flex-row">
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <div>
              <h2 className="text-lg">Theme</h2>
              <p className="text-sm text-muted">The sign-in page and the whole group wear it. Six classics and six soft gradients, half of them dark.</p>
            </div>
            <ThemeGrid label="Classic" themes={groupThemes.filter((t) => t.group === 'classic')} value={group.theme} onChange={(id) => void save({ theme: id })} />
            <ThemeGrid label="Soft gradients" themes={groupThemes.filter((t) => t.group === 'gradient')} value={group.theme} onChange={(id) => void save({ theme: id })} />
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <ThemePreview theme={groupThemeById(group.theme)} name={group.name} tagline={group.tagline} logo={logo} />
          </div>
        </Card>
      </div>
    </ManageShell>
  );
}

function ThemeGrid({ label, themes, value, onChange }: { label: string; themes: GroupTheme[]; value: string; onChange: (id: string) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-2 grid grid-cols-3 gap-2" role="radiogroup" aria-label={label}>
        {themes.map((t) => (
          <button key={t.id} type="button" role="radio" className="yare-pick !min-h-0 !p-2" aria-checked={value === t.id} aria-pressed={value === t.id} aria-label={t.name} onClick={() => onChange(t.id)}>
            <span className="flex w-full flex-col gap-1.5">
              <span className="block h-14 w-full overflow-hidden rounded-(--yare-radius-control) border border-black/5" style={{ background: t.vars.bg }}>
                <span className="mt-2 ml-2 block h-9 w-2/3 rounded-md p-1.5" style={{ background: t.vars.solid }}><span className="block h-1.5 w-1/2 rounded-full" style={{ background: t.vars.text, opacity: 0.6 }} /><span className="mt-1.5 block h-2 w-1/3 rounded-full" style={{ background: t.vars.accent }} /></span>
              </span>
              <span className="text-xs font-semibold">{t.name}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** A small picture of the sign-in card in the chosen theme. */
function ThemePreview({ theme, name, tagline, logo }: { theme: GroupTheme; name: string; tagline: string; logo: string | null }) {
  const v = theme.vars;
  return (
    <div className="flex min-h-80 flex-1 items-center justify-center rounded-xl p-6" style={{ background: v.bg, color: v.text }}>
      <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-2xl p-7 text-center" style={{ background: v.solid, border: `1px solid ${v.border}` }}>
        {logo ? <img src={logo} alt="" className="h-8 object-contain" /> : <span className="size-8 rounded-full" style={{ background: v.accent }} />}
        <strong style={{ fontFamily: 'var(--font-display)' }}>{name}</strong>
        {tagline && <span className="text-xs" style={{ color: v.muted }}>{tagline}</span>}
        <span className="mt-1 block h-10 w-full rounded-lg" style={{ background: v.raised, border: `1px solid ${v.border}` }} />
        <span className="block h-10 w-full rounded-lg text-sm font-semibold leading-10" style={{ background: v.accent, color: v.accentText }}>Sign in</span>
      </div>
    </div>
  );
}
