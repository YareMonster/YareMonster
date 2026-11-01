import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { AlertDialog, Button, Skeleton, Tabs, toast } from '@heroui/react';
import { CheckCircleIcon, CircleNotchIcon, EyeIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { Notice, PageHeader, StatusChip, type AppIdentity } from '../../yare';
import type { Document, Envelope, Field, Participant } from '../../lib/supabase';
import { email, getEnvelope, publishEnvelope } from '../../lib/sign-api';
import { SaveStatusProvider, useSaveStatus } from '../../lib/save-status';
import { useEnvelopes } from '../EnvelopesContext';
import { Shell } from '../Shell';
import { envelopeLabel, envelopeTone } from '../status';
import { BuildTab } from './BuildTab';
import { ParticipantsTab } from './ParticipantsTab';
import { SettingsTab } from './SettingsTab';
import { ShareTab } from './ShareTab';
import { SignaturesTab } from './SignaturesTab';

interface ShellProps { app: AppIdentity; user: { name: string; detail?: string }; onSignOut: () => void }

export function EnvelopePage({ shell }: { shell: ShellProps }) {
  return (
    <SaveStatusProvider>
      <EnvelopePageInner shell={shell} />
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

type Tab = 'build' | 'participants' | 'settings' | 'share' | 'signatures';

function EnvelopePageInner({ shell }: { shell: ShellProps }) {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { db, patch, remove, emailState } = useEnvelopes();
  const { run } = useSaveStatus();
  const [envelope, setEnvelope] = useState<Envelope | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('build');
  const [confirm, setConfirm] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const load = useCallback(async () => {
    try {
      const b = await getEnvelope(db, id);
      setEnvelope(b.envelope); setDocuments(b.documents); setParticipants(b.participants); setFields(b.fields); setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load this document.');
    }
  }, [db, id]);
  useEffect(() => { void load(); }, [load]);

  function applyEnvelope(next: Envelope) { setEnvelope(next); patch(next); }

  async function publish() {
    if (!envelope) return;
    setPublishing(true);
    try {
      const next = await publishEnvelope(db, envelope.id);
      applyEnvelope(next);
      setParticipants((list) => list.map((p) => ({ ...p, status: 'pending' })));
      if (emailState.status === 'ready') {
        try {
          const r = await email(db, { action: 'send', envelope_id: envelope.id });
          toast.success(r.sent ? `Sent. ${r.sent} ${r.sent === 1 ? 'person has' : 'people have'} their link by email.` : 'Sent. Copy the links from Share.');
        } catch (err) {
          toast.warning(`Published, but the email failed: ${err instanceof Error ? err.message : 'unknown error'}. Copy the links from Share.`);
        }
        const { data } = await db.from('yaresign_participants').select('*').eq('envelope_id', envelope.id).order('position');
        if (data) setParticipants(data);
      } else {
        toast.success('Published. Copy each link from Share and send it.');
      }
      setTab('share');
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : 'Could not send it.');
    } finally {
      setPublishing(false);
      setConfirm(false);
    }
  }

  const locked = !!envelope && envelope.status !== 'draft';
  const signers = participants.filter((p) => p.role === 'signer').length;

  return (
    <Shell
      {...shell}
      topbar={
        <PageHeader
          crumbs={[{ label: 'Sign', href: '/' }, { label: envelope?.title ?? '…' }]}
          actions={
            <>
              <SaveIndicator />
              {envelope && locked && <StatusChip tone={envelopeTone(envelope.status)}>{envelopeLabel(envelope.status)}</StatusChip>}
              <Button variant="outline" onPress={() => window.open(`/documents/${id}/preview`, '_blank', 'noopener,noreferrer')} isDisabled={!envelope || documents.length === 0}><EyeIcon /> Preview</Button>
              {envelope && !locked && <Button variant="secondary" onPress={() => setConfirm(true)} isPending={publishing}>Send for signature</Button>}
            </>
          }
        />
      }
    >
      {error && <Notice status="danger" title="Could not load this document">{error}</Notice>}
      {!envelope && !error && (
        <div className="flex flex-col gap-6" aria-busy="true">
          <Skeleton className="h-9 w-96 max-w-full rounded-md" />
          <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]"><Skeleton className="h-72 rounded-(--yare-radius-card)" /><Skeleton className="h-[32rem] rounded-(--yare-radius-card)" /></div>
        </div>
      )}
      {envelope && (
        <Tabs variant="secondary" selectedKey={tab} onSelectionChange={(k) => setTab(k as Tab)} className="-mt-2">
          <Tabs.ListContainer>
            <Tabs.List aria-label="Document sections">
              <Tabs.Tab id="build">Build<Tabs.Indicator /></Tabs.Tab>
              <Tabs.Tab id="participants">Participants<Tabs.Indicator /></Tabs.Tab>
              <Tabs.Tab id="settings">Settings<Tabs.Indicator /></Tabs.Tab>
              <Tabs.Tab id="share">Share<Tabs.Indicator /></Tabs.Tab>
              <Tabs.Tab id="signatures">Signatures<Tabs.Indicator /></Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>
          <Tabs.Panel id="build" className="p-0 pt-6">
            <BuildTab db={db} envelope={envelope} documents={documents} setDocuments={setDocuments} participants={participants} fields={fields} setFields={setFields} run={run} locked={locked} />
          </Tabs.Panel>
          <Tabs.Panel id="participants" className="p-0 pt-6">
            <ParticipantsTab db={db} envelope={envelope} onEnvelope={applyEnvelope} participants={participants} setParticipants={setParticipants} run={run} locked={locked} />
          </Tabs.Panel>
          <Tabs.Panel id="settings" className="p-0 pt-6">
            <SettingsTab db={db} envelope={envelope} documents={documents} onEnvelope={applyEnvelope} run={run} onDeleted={() => { remove(envelope.id); navigate('/'); }} />
          </Tabs.Panel>
          <Tabs.Panel id="share" className="p-0 pt-6">
            <ShareTab db={db} envelope={envelope} participants={participants} setParticipants={setParticipants} onPublish={() => setConfirm(true)} publishing={publishing} />
          </Tabs.Panel>
          <Tabs.Panel id="signatures" className="p-0 pt-6">
            <SignaturesTab db={db} envelope={envelope} documents={documents} participants={participants} fields={fields} />
          </Tabs.Panel>
        </Tabs>
      )}

      <AlertDialog isOpen={confirm} onOpenChange={setConfirm}>
        <AlertDialog.Backdrop>
          <AlertDialog.Container size="sm">
            <AlertDialog.Dialog aria-label="Send for signature">
              <AlertDialog.Header><AlertDialog.Heading>Send for signature?</AlertDialog.Heading></AlertDialog.Header>
              <AlertDialog.Body className="flex flex-col gap-2 text-sm text-muted">
                <p>{signers} {signers === 1 ? 'person signs' : 'people sign'}{envelope?.ordered ? ', one after the other' : ', all at once'}. Documents and fields are frozen once sent.</p>
                <p>{emailState.status === 'ready' ? 'The first signers get an email with their link right away.' : 'Email is not set up, so you copy each link from Share and send it yourself.'}</p>
              </AlertDialog.Body>
              <AlertDialog.Footer className="gap-2">
                <Button variant="outline" onPress={() => setConfirm(false)}>Not yet</Button>
                <Button variant="secondary" onPress={() => void publish()} isPending={publishing}>Send</Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>
    </Shell>
  );
}
