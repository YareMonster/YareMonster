import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { Button, Card, Description, Input, Label, ListBox, Select, Switch, TextField, toast } from '@heroui/react';
import { CalendarBlankIcon, FilePdfIcon, PenNibIcon, TextTIcon, TrashIcon, UserIcon } from '@phosphor-icons/react';
import { Notice, PersonChip, UploadDropzone } from '../../yare';
import type { Client, Document, Envelope, Field, FieldType, Participant } from '../../lib/supabase';
import { addDocument, addField, deleteField, downloadDocument, removeDocument, updateField } from '../../lib/sign-api';
import { inspectPdf } from '../../lib/pdf';
import { PdfPages, type Box, type ViewerPerson } from '../pdf/PdfPages';
import { fieldDefaults, fieldLabels, fullName } from '../status';

interface Props {
  db: Client;
  envelope: Envelope;
  documents: Document[];
  setDocuments: Dispatch<SetStateAction<Document[]>>;
  participants: Participant[];
  fields: Field[];
  setFields: Dispatch<SetStateAction<Field[]>>;
  run: <T>(work: () => Promise<T>, failMessage?: string) => Promise<T | undefined>;
  /** True once the envelope was sent: documents and fields are frozen. */
  locked: boolean;
}

const MAX_PDF = 20 * 1024 * 1024;

/** Documents and fields on the left, the pages in the middle. Click a field type, then click the page where it goes. */
export function BuildTab({ db, envelope, documents, setDocuments, participants, fields, setFields, run, locked }: Props) {
  const [docId, setDocId] = useState<string | null>(documents[0]?.id ?? null);
  const [bytes, setBytes] = useState<ArrayBuffer | null>(null);
  const [placing, setPlacing] = useState<FieldType | null>(null);
  const [forId, setForId] = useState<string | null>(participants.find((p) => p.role === 'signer')?.id ?? null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { if (!documents.some((d) => d.id === docId)) setDocId(documents[0]?.id ?? null); }, [documents, docId]);
  useEffect(() => { if (!participants.some((p) => p.id === forId)) setForId(participants.find((p) => p.role === 'signer')?.id ?? null); }, [participants, forId]);
  const doc = documents.find((d) => d.id === docId) ?? null;

  useEffect(() => {
    let cancelled = false;
    setBytes(null);
    if (doc) downloadDocument(db, doc).then((b) => { if (!cancelled) setBytes(b); }).catch((e) => toast.danger(e instanceof Error ? e.message : 'Could not open the document.'));
    return () => { cancelled = true; };
  }, [db, doc]);

  const people = useMemo(() => new Map<string, ViewerPerson>(participants.map((p, i) => [p.id, { id: p.id, name: fullName(p), colour: i, role: p.role }])), [participants]);
  const signers = participants.filter((p) => p.role === 'signer');
  const selected = fields.find((f) => f.id === selectedId) ?? null;

  async function upload(files: File[]) {
    setUploading(true);
    try {
      for (const file of files) {
        const info = await inspectPdf(await file.arrayBuffer());
        const created = await run(() => addDocument(db, envelope.id, file, info, documents.length), 'Could not upload the PDF.');
        if (created) { setDocuments((list) => [...list, created]); setDocId(created.id); }
      }
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : 'Could not read that PDF.');
    } finally {
      setUploading(false);
    }
  }

  async function remove(d: Document) {
    const ok = await run(() => removeDocument(db, d).then(() => true));
    if (!ok) return;
    setDocuments((list) => list.filter((x) => x.id !== d.id));
    setFields((list) => list.filter((f) => f.document_id !== d.id));
  }

  async function place(page: number, x: number, y: number) {
    if (!placing || !doc || !forId) return;
    const size = fieldDefaults[placing];
    const box = { x: Math.max(0, Math.min(1 - size.w, x - size.w / 2)), y: Math.max(0, Math.min(1 - size.h, y - size.h / 2)), ...size };
    const created = await run(() => addField(db, { envelopeId: envelope.id, documentId: doc.id, participantId: forId, page, type: placing, ...box }));
    if (created) { setFields((list) => [...list, created]); setSelectedId(created.id); }
    setPlacing(null);
  }

  function moveBox(id: string, box: Box) {
    setFields((list) => list.map((f) => (f.id === id ? { ...f, ...box } : f)));
    void run(() => updateField(db, id, box));
  }

  function patchSelected(patch: Partial<Pick<Field, 'participant_id' | 'required' | 'label'>>) {
    if (!selected) return;
    setFields((list) => list.map((f) => (f.id === selected.id ? { ...f, ...patch } : f)));
    void run(() => updateField(db, selected.id, patch));
  }

  async function removeSelected() {
    if (!selected) return;
    const ok = await run(() => deleteField(db, selected.id).then(() => true));
    if (ok) { setFields((list) => list.filter((f) => f.id !== selected.id)); setSelectedId(null); }
  }

  const palette: Array<{ type: FieldType; icon: React.ReactNode }> = [
    { type: 'signature', icon: <PenNibIcon /> }, { type: 'name', icon: <UserIcon /> }, { type: 'date', icon: <CalendarBlankIcon /> }, { type: 'text', icon: <TextTIcon /> },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <div className="flex flex-col gap-4">
        <Card className="gap-3 p-4">
          <h3 className="text-base">Documents</h3>
          {documents.length > 0 && (
            <ol className="flex flex-col gap-0.5">
              {documents.map((d) => (
                <li key={d.id} className="flex items-center gap-1">
                  <button type="button" className="yare-nav-item min-w-0 flex-1" data-active={d.id === docId || undefined} onClick={() => setDocId(d.id)}>
                    <FilePdfIcon />
                    <span className="yare-nav-item__label">{d.name}</span>
                    <span className="text-xs text-muted">{d.page_count} p.</span>
                  </button>
                  {!locked && <Button variant="ghost" size="sm" isIconOnly aria-label={`Remove ${d.name}`} onPress={() => void remove(d)}><TrashIcon /></Button>}
                </li>
              ))}
            </ol>
          )}
          {!locked && (
            <UploadDropzone accept="application/pdf,.pdf" multiple maxBytes={MAX_PDF} onFiles={(f) => void upload(f)} title={documents.length ? 'Add another PDF' : 'Drop a PDF here'} hint="PDF only, up to 20 MB. Word or Pages? Export to PDF first." buttonLabel={uploading ? 'Uploading…' : 'Choose PDF'} isDisabled={uploading} icon={<FilePdfIcon />} />
          )}
        </Card>

        <Card className="gap-3 p-4">
          <h3 className="text-base">Fields</h3>
          {locked ? (
            <p className="text-sm text-muted">Fields are frozen once the document is sent.</p>
          ) : signers.length === 0 ? (
            <Notice status="warning" icon={false} title="Add a signer first">Fields belong to a person. Add one under Participants.</Notice>
          ) : (
            <>
              <Select aria-label="Field for" selectedKey={forId ?? undefined} onSelectionChange={(k) => setForId(String(k))} fullWidth>
                <Label>For</Label>
                <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {participants.map((p, i) => (
                      <ListBox.Item key={p.id} id={p.id} textValue={fullName(p)}><PersonChip name={fullName(p)} colour={i} size="sm" detail={p.role === 'viewer' ? 'viewer' : undefined} /></ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
              <div className="grid grid-cols-2 gap-2">
                {palette.map((k) => (
                  <Button key={k.type} variant={placing === k.type ? 'primary' : 'outline'} size="sm" isDisabled={!doc} onPress={() => setPlacing((p) => (p === k.type ? null : k.type))}>{k.icon} {fieldLabels[k.type]}</Button>
                ))}
              </div>
              <Description>{placing ? `Click on the page where the ${fieldLabels[placing].toLowerCase()} goes.` : 'Pick a type, then click on the page. Drag to move, pull the corner to resize.'}</Description>
            </>
          )}
        </Card>

        {selected && !locked && (
          <Card className="gap-3 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base">{fieldLabels[selected.type]}</h3>
              <Button variant="ghost" size="sm" isIconOnly aria-label="Delete field" onPress={() => void removeSelected()}><TrashIcon /></Button>
            </div>
            <Select aria-label="Assigned to" selectedKey={selected.participant_id} onSelectionChange={(k) => patchSelected({ participant_id: String(k) })} fullWidth>
              <Label>Assigned to</Label>
              <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {participants.map((p, i) => <ListBox.Item key={p.id} id={p.id} textValue={fullName(p)}><PersonChip name={fullName(p)} colour={i} size="sm" /></ListBox.Item>)}
                </ListBox>
              </Select.Popover>
            </Select>
            {selected.type === 'text' && (
              <TextField fullWidth value={selected.label} onChange={(v) => patchSelected({ label: v })} maxLength={80}>
                <Label>Label</Label>
                <Input placeholder="What to write here" />
              </TextField>
            )}
            <Switch isSelected={selected.required} onChange={(v) => patchSelected({ required: v })}>
              <Switch.Content><Switch.Control><Switch.Thumb /></Switch.Control>Required</Switch.Content>
            </Switch>
            <p className="text-xs text-muted">Page {selected.page}</p>
          </Card>
        )}
      </div>

      <div className="min-w-0">
        {doc ? (
          <div className="rounded-(--yare-radius-card) bg-surface-secondary p-3 sm:p-6">
            <PdfPages
              bytes={bytes}
              pageSizes={doc.page_sizes}
              fields={fields.filter((f) => f.document_id === doc.id)}
              people={people}
              mode={locked ? 'view' : 'edit'}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onChangeBox={moveBox}
              placing={placing}
              onPlace={(page, x, y) => void place(page, x, y)}
            />
          </div>
        ) : (
          <Card className="p-8 text-center"><p className="text-sm text-muted">{locked ? 'No documents.' : 'Upload a PDF to start placing fields.'}</p></Card>
        )}
      </div>
    </div>
  );
}
