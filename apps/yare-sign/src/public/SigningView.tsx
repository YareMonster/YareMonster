import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Input, Label, Modal, Switch, TextField, toast } from '@heroui/react';
import { CheckCircleIcon, DownloadSimpleIcon } from '@phosphor-icons/react';
import { Notice, PersonChip, PoweredByYare, SignaturePad, StatusChip, YareMark } from '../yare';
import type { Document, EnvelopeStatus, ParticipantRole, ParticipantStatus } from '../lib/supabase';
import { composeSignedPdf, downloadBytes } from '../lib/compose';
import { PdfPages, type ViewerField, type ViewerPerson } from '../features/pdf/PdfPages';
import { fieldLabels, participantLabel, participantTone } from '../features/status';
import './signing.css';

export interface SigningData {
  envelope: { id: string; title: string; status: EnvelopeStatus; ordered: boolean; message: string; sent_at: string | null; completed_at: string | null; sender: string };
  /** The participant looking at the page, or null for the owner's preview. */
  me: { id: string; role: ParticipantRole; first_name: string; last_name: string; email: string; status: ParticipantStatus; position: number; typed_name: string; signed_at: string | null; can_sign: boolean } | null;
  documents: Array<Pick<Document, 'id' | 'name' | 'page_count' | 'page_sizes' | 'position'>>;
  participants: Array<{ id: string; role: ParticipantRole; name: string; status: ParticipantStatus; position: number; signed_at: string | null; colour: number }>;
  fields: ViewerField[];
  /** The PDF bytes per document id. */
  bytes: Map<string, ArrayBuffer>;
}

interface Props {
  data: SigningData;
  preview?: boolean;
  onSign: (values: Record<string, string>, typedName: string) => Promise<{ completed: boolean } | undefined>;
}

const today = () => new Date().toISOString().slice(0, 10);

/** The page a participant sees: the documents with the fields, and a panel that walks them through signing. */
export function SigningView({ data, preview, onSign }: Props) {
  const { envelope, me, documents, participants, fields } = data;
  const people = useMemo(() => new Map<string, ViewerPerson>(participants.map((p) => [p.id, { id: p.id, name: p.name, colour: p.colour, role: p.role }])), [participants]);
  const mine = useMemo(() => (me ? fields.filter((f) => f.participant_id === me.id) : []), [fields, me]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<ViewerField | null>(null);
  const [draft, setDraft] = useState<string>('');
  const [typedName, setTypedName] = useState(me ? `${me.first_name} ${me.last_name}`.trim() : '');
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ completed: boolean } | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    if (!me) return;
    const next: Record<string, string> = {};
    for (const f of mine) {
      if (f.value) next[f.id] = f.value;
      else if (f.type === 'name') next[f.id] = `${me.first_name} ${me.last_name}`.trim();
      else if (f.type === 'date') next[f.id] = today();
    }
    setValues(next);
  }, [me, mine]);

  const signed = me?.status === 'signed' || done !== null;
  const completed = envelope.status === 'completed' || done?.completed === true;
  const canSign = !!me && me.can_sign && !signed && !preview;
  const required = mine.filter((f) => f.required);
  const filled = required.filter((f) => (values[f.id] ?? '').length > 0).length;
  const ready = canSign && filled === required.length && typedName.trim().length > 0 && consent;
  const nextSigner = envelope.ordered ? participants.find((p) => p.role === 'signer' && p.status !== 'signed') : undefined;

  function press(f: ViewerField) {
    if (!canSign) return;
    setDraft(values[f.id] ?? '');
    setEditing(f);
  }
  function apply() {
    if (!editing) return;
    setValues((v) => ({ ...v, [editing.id]: draft }));
    setEditing(null);
  }

  async function finish() {
    if (!ready) return;
    setSubmitting(true);
    try {
      const r = await onSign(values, typedName.trim());
      setDone(r ?? { completed: false });
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : 'Could not record your signature.');
    } finally {
      setSubmitting(false);
    }
  }

  async function download(doc: SigningData['documents'][number]) {
    const bytes = data.bytes.get(doc.id);
    if (!bytes) return;
    setDownloading(doc.id);
    try {
      const merged = fields.filter((f) => f.document_id === doc.id).map((f) => ({ ...f, value: values[f.id] ?? f.value }));
      downloadBytes(`${doc.name}-signed.pdf`, await composeSignedPdf({ bytes, pageSizes: doc.page_sizes, fields: merged }));
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : 'Could not build the PDF.');
    } finally {
      setDownloading(null);
    }
  }

  const closed = envelope.status === 'voided';

  return (
    <div className="ysg">
      <header className="ysg__top">
        <div className="ysg__top-inner">
          <div className="min-w-0">
            <h1 className="ysg__title">{envelope.title}</h1>
            <p className="ysg__from">{envelope.sender === 'You' ? 'Your document' : `From ${envelope.sender}`}{documents.length > 1 ? ` · ${documents.length} documents` : ''}</p>
          </div>
          {preview ? <span className="ysg__badge">Preview. Nothing is recorded.</span> : completed ? <StatusChip tone="success">Completed</StatusChip> : closed ? <StatusChip tone="danger">Cancelled</StatusChip> : null}
        </div>
      </header>

      <div className="ysg__body">
        <main className="ysg__docs">
          {envelope.message && <Card className="p-4 text-sm whitespace-pre-line">{envelope.message}</Card>}
          {documents.map((doc) => (
            <section key={doc.id} className="ysg__doc" aria-label={doc.name}>
              <h2 className="ysg__doc-name">{doc.name}</h2>
              <PdfPages
                bytes={data.bytes.get(doc.id) ?? null}
                pageSizes={doc.page_sizes}
                fields={fields.filter((f) => f.document_id === doc.id)}
                people={people}
                mode={canSign ? 'sign' : 'view'}
                meId={me?.id}
                values={values}
                onFieldPress={press}
              />
            </section>
          ))}
        </main>

        <aside className="ysg__panel">
          <Card className="gap-4 p-5">
            {preview && <Notice status="accent" icon={false} title="How it will look">Each person sees their own fields in yellow and everyone else's as outlines.</Notice>}
            {closed && <Notice status="danger" icon={false} title="This document was cancelled">The sender withdrew it. Nothing more can be signed.</Notice>}
            {!closed && completed && <Notice status="success" title="Everyone has signed">{me ? 'Download your signed copy below.' : 'The signed copies are ready.'}</Notice>}
            {!closed && !completed && signed && me && <Notice status="success" title="Thank you, you signed">{nextSigner ? `${nextSigner.name} is next.` : 'You get an email with the signed copy once everyone is done.'}</Notice>}
            {!closed && !completed && !signed && me && me.role === 'viewer' && <Notice status="default" icon={false} title="You receive the copy">Nothing to sign on your side. The signed document is sent to you when everyone is done.</Notice>}
            {!closed && !completed && !signed && me && me.role === 'signer' && !me.can_sign && !preview && <Notice status="warning" icon={false} title="Not your turn yet">{nextSigner ? `${nextSigner.name} signs first. You get an email when it is your turn.` : 'Please wait for the people before you.'}</Notice>}

            {canSign && (
              <>
                <div>
                  <div className="ysg__progress-label">{filled} of {required.length} fields done</div>
                  <div className="ysg__progress" role="progressbar" aria-valuenow={filled} aria-valuemin={0} aria-valuemax={required.length}><div style={{ width: `${required.length ? (filled / required.length) * 100 : 0}%` }} /></div>
                </div>
                <ol className="ysg__fields">
                  {mine.map((f, i) => (
                    <li key={f.id}>
                      <button type="button" className="ysg__field-row" data-done={(values[f.id] ?? '').length > 0 || undefined} onClick={() => press(f)}>
                        <span className="yare-step-n">{i + 1}</span>
                        <span className="flex-1 truncate text-start">{f.label || fieldLabels[f.type]}{f.required ? '' : ' (optional)'}</span>
                        {(values[f.id] ?? '').length > 0 && <CheckCircleIcon weight="fill" className="text-success" />}
                      </button>
                    </li>
                  ))}
                </ol>
                <TextField fullWidth value={typedName} onChange={setTypedName} maxLength={200} isRequired>
                  <Label>Your full name</Label>
                  <Input />
                </TextField>
                <Switch isSelected={consent} onChange={setConsent}>
                  <Switch.Content><Switch.Control><Switch.Thumb /></Switch.Control><span className="text-sm">I agree that this electronic signature is mine and binds me like a handwritten one.</span></Switch.Content>
                </Switch>
                <Button variant="primary" fullWidth size="lg" isDisabled={!ready} isPending={submitting} onPress={() => void finish()}>Finish signing</Button>
              </>
            )}

            {(completed || (me && signed)) && !closed && (
              <div className="flex flex-col gap-2">
                {documents.map((doc) => (
                  <Button key={doc.id} variant={completed ? 'primary' : 'outline'} fullWidth onPress={() => void download(doc)} isPending={downloading === doc.id}><DownloadSimpleIcon /> {completed ? `Download ${doc.name}` : `Download ${doc.name} so far`}</Button>
                ))}
              </div>
            )}

            <div>
              <h3 className="ysg__h3">Who signs</h3>
              <ul className="flex flex-col gap-2">
                {participants.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2">
                    <PersonChip name={p.name + (me && p.id === me.id ? ' (you)' : '')} colour={p.colour} size="sm" detail={p.role === 'viewer' ? 'receives the copy' : undefined} />
                    {p.role === 'signer' && <StatusChip tone={participantTone(p.status)}>{participantLabel(p.status)}</StatusChip>}
                  </li>
                ))}
              </ul>
            </div>
          </Card>
          <div className="ysg__mark"><YareMark size={28} /></div>
        </aside>
      </div>

      <PoweredByYare />

      <Modal isOpen={editing !== null} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <Modal.Backdrop>
          <Modal.Container size="md">
            <Modal.Dialog aria-label={editing ? fieldLabels[editing.type] : 'Field'}>
              <Modal.CloseTrigger />
              <Modal.Header><Modal.Heading>{editing?.type === 'signature' ? 'Your signature' : editing ? editing.label || fieldLabels[editing.type] : ''}</Modal.Heading></Modal.Header>
              <Modal.Body>
                {editing?.type === 'signature' && <SignaturePad name={typedName} onChange={(d) => setDraft(d ?? '')} />}
                {editing && editing.type !== 'signature' && (
                  <TextField fullWidth value={draft} onChange={setDraft} maxLength={200} type={editing.type === 'date' ? 'date' : 'text'}>
                    <Label>{editing.label || fieldLabels[editing.type]}</Label>
                    <Input autoFocus />
                  </TextField>
                )}
              </Modal.Body>
              <Modal.Footer className="gap-2">
                <Button variant="outline" onPress={() => setEditing(null)}>Cancel</Button>
                <Button variant="primary" onPress={apply} isDisabled={editing?.type === 'signature' ? draft.length === 0 : false}>Apply</Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}
