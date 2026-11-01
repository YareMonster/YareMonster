import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button, Tabs, toast } from '@heroui/react';
import { CheckCircleIcon, CircleNotchIcon, EyeIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { Notice, PageHeader, type AppIdentity } from '../../yare';
import type { Block, Form } from '../../lib/supabase';
import { getForm, setPublished } from '../../lib/forms-api';
import { SaveStatusProvider, useSaveStatus } from '../../lib/save-status';
import { useForms } from '../FormsContext';
import { Shell } from '../Shell';
import { BuildTab } from './BuildTab';
import { SettingsTab } from './SettingsTab';
import { ShareTab } from './ShareTab';
import { ResponsesTab } from './ResponsesTab';

interface ShellProps {
  app: AppIdentity;
  user: { name: string; detail?: string };
  onSignOut: () => void;
}

export function FormPage({ shell }: { shell: ShellProps }) {
  return (
    <SaveStatusProvider>
      <FormPageInner shell={shell} />
    </SaveStatusProvider>
  );
}

function SaveIndicator() {
  const { state } = useSaveStatus();
  return (
    <span className="hidden items-center gap-1.5 text-sm text-muted sm:inline-flex" aria-live="polite">
      {state === 'saving' && <><CircleNotchIcon className="animate-spin" /> Saving…</>}
      {state === 'saved' && <><CheckCircleIcon /> All changes saved</>}
      {state === 'error' && <><WarningCircleIcon className="text-danger" /> Not saved</>}
    </span>
  );
}

function FormPageInner({ shell }: { shell: ShellProps }) {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { db, patch, remove } = useForms();
  const { run } = useSaveStatus();
  const [form, setForm] = useState<Form | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'build' | 'settings' | 'share' | 'responses'>('build');
  const [publishing, setPublishing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getForm(db, id);
      setForm(data.form);
      setBlocks(data.blocks);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load this form.');
    }
  }, [db, id]);
  useEffect(() => { void load(); }, [load]);

  function applyForm(next: Form) { setForm(next); patch(next); }

  async function togglePublish() {
    if (!form) return;
    setPublishing(true);
    try {
      const next = await setPublished(db, form.id, form.status !== 'published');
      applyForm(next);
      toast.success(next.status === 'published' ? 'Published. Your form is live.' : 'Unpublished. The link now shows “not open”.');
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : 'Could not change the status.');
    } finally {
      setPublishing(false);
    }
  }

  const previewUrl = form ? `/f/${form.slug}?preview` : '#';
  const published = form?.status === 'published';

  return (
    <Shell
      {...shell}
      topbar={
        <PageHeader
          crumbs={[{ label: 'Forms', href: '/' }, { label: form?.title ?? '…' }]}
          actions={
            <>
              <SaveIndicator />
              <Button variant="outline" onPress={() => window.open(previewUrl, '_blank', 'noopener,noreferrer')} isDisabled={!form}><EyeIcon /> Preview</Button>
              <Button variant={published ? 'outline' : 'secondary'} onPress={togglePublish} isPending={publishing} isDisabled={!form}>
                {published ? 'Unpublish' : 'Publish'}
              </Button>
            </>
          }
        />
      }
    >
      {error && <Notice status="danger" title="Could not load this form">{error}</Notice>}
      {form && (
        <Tabs variant="secondary" selectedKey={tab} onSelectionChange={(k) => setTab(k as typeof tab)} className="-mt-2">
          <Tabs.ListContainer>
            <Tabs.List aria-label="Form sections">
              <Tabs.Tab id="build">Build<Tabs.Indicator /></Tabs.Tab>
              <Tabs.Tab id="settings">Settings<Tabs.Indicator /></Tabs.Tab>
              <Tabs.Tab id="share">Share<Tabs.Indicator /></Tabs.Tab>
              <Tabs.Tab id="responses">Responses<Tabs.Indicator /></Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>
          <Tabs.Panel id="build" className="p-0 pt-6">
            <BuildTab db={db} form={form} blocks={blocks} setBlocks={setBlocks} run={run} />
          </Tabs.Panel>
          <Tabs.Panel id="settings" className="p-0 pt-6">
            <SettingsTab db={db} form={form} onForm={applyForm} run={run} onDeleted={() => { remove(form.id); navigate('/'); }} />
          </Tabs.Panel>
          <Tabs.Panel id="share" className="p-0 pt-6">
            <ShareTab form={form} onPublish={togglePublish} publishing={publishing} />
          </Tabs.Panel>
          <Tabs.Panel id="responses" className="p-0 pt-6">
            <ResponsesTab db={db} form={form} blocks={blocks} />
          </Tabs.Panel>
        </Tabs>
      )}
    </Shell>
  );
}
