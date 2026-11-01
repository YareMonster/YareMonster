import { Button, Card, toast } from '@heroui/react';
import { ArrowSquareOutIcon, CopyIcon, DownloadSimpleIcon } from '@phosphor-icons/react';
import { Checklist, MonsterNote, YareMark } from '../../yare';
import type { Site } from '../../lib/supabase';
import { updateSite } from '../../lib/pages-api';
import { buildSteps, downloadGuide, guidePrompt } from '../../lib/guide';
import { useSites } from '../SitesContext';

/** The guide and the build checklist. Short on the overview of a site being built, full on its own tab. */
export function GuideTab({ site, short }: { site: Site; short?: boolean }) {
  const { db, patch } = useSites();
  const docs = 'https://github.com/YareMonster/YareMonster/blob/main/apps/yare-pages/skills/website/SKILL.md';
  const done = buildSteps.filter((s) => site.checklist[s.id]).length;

  async function toggle(id: string, value: boolean) {
    const next = { ...site.checklist, [id]: value };
    patch({ ...site, checklist: next });
    try { patch(await updateSite(db, site.id, { checklist: next })); } catch (err) { toast.danger(err instanceof Error ? err.message : 'Could not save.'); }
  }
  async function copyPrompt() {
    try { await navigator.clipboard.writeText(guidePrompt); toast.success('Copied'); } catch { toast.danger('Could not copy.'); }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <Card className="gap-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg">{site.status === 'building' ? 'Building this website' : 'Changing this website'}</h3>
            <p className="text-sm text-muted">{site.status === 'building' ? `${done} of ${buildSteps.length} steps done. Tick them as you go.` : 'The same guide helps with changes: a new page, a new look, a move.'}</p>
          </div>
        </div>
        <Checklist items={buildSteps.map((s) => ({ id: s.id, title: s.title, detail: s.detail, done: !!site.checklist[s.id] }))} onToggle={(id, v) => void toggle(id, v)} />
        {!short && site.status === 'building' && done === buildSteps.length && <MonsterNote title="All steps done">Paste the final address under Settings and mark the website live. Its visitors appear on the overview.</MonsterNote>}
      </Card>
      <div className="flex flex-col gap-4">
        <Card className="items-center gap-3 p-5 text-center">
          <YareMark size={56} />
          <h3 className="text-base">The guide</h3>
          <p className="text-sm text-muted">Everything your assistant needs: plan, design, build, check, publish, domain. Give it the whole file.</p>
          <Button variant="primary" fullWidth onPress={downloadGuide}><DownloadSimpleIcon weight="bold" /> Download the guide</Button>
          <Button variant="outline" fullWidth onPress={() => window.open(docs, '_blank', 'noopener,noreferrer')}>Read it online <ArrowSquareOutIcon /></Button>
        </Card>
        <Card className="gap-3 p-5">
          <h3 className="text-base">What to say</h3>
          <blockquote className="rounded-(--yare-radius-control) border border-border bg-surface-secondary p-3 text-sm">“{guidePrompt}”</blockquote>
          <Button variant="outline" size="sm" className="self-start" onPress={() => void copyPrompt()}><CopyIcon /> Copy</Button>
        </Card>
      </div>
    </div>
  );
}
