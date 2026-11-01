import { useEffect, useState } from 'react';
import { Button, Card, Skeleton, toast } from '@heroui/react';
import { DownloadSimpleIcon } from '@phosphor-icons/react';
import { DataTable, Notice, PersonChip, StatusChip, Timeline, type StatusTone, type TimelineItem } from '../../yare';
import type { Client, Document, Envelope, Field, Participant, SignEvent } from '../../lib/supabase';
import { downloadDocument, listEvents } from '../../lib/sign-api';
import { composeSignedPdf, downloadBytes } from '../../lib/compose';
import { Stat } from '../HomePage';
import { fullName, participantLabel, participantTone } from '../status';

interface Props { db: Client; envelope: Envelope; documents: Document[]; participants: Participant[]; fields: Field[] }

const eventText: Record<SignEvent['type'], string> = {
  created: 'Created', sent: 'Sent for signature', emailed: 'Email sent', viewed: 'Opened the link', signed: 'Signed', completed: 'Everyone signed', voided: 'Cancelled', email_failed: 'Email could not be sent',
};

/** Who signed, when, and the signed PDF. */
export function SignaturesTab({ db, envelope, documents, participants, fields }: Props) {
  const [events, setEvents] = useState<SignEvent[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const signers = participants.filter((p) => p.role === 'signer');
  const signed = signers.filter((p) => p.status === 'signed');

  useEffect(() => { listEvents(db, envelope.id).then(setEvents).catch(() => setEvents([])); }, [db, envelope.id, participants]);

  async function download(doc: Document) {
    setBusy(doc.id);
    try {
      const bytes = await downloadDocument(db, doc);
      const out = await composeSignedPdf({ bytes, pageSizes: doc.page_sizes, fields: fields.filter((f) => f.document_id === doc.id) });
      downloadBytes(`${doc.name}${envelope.status === 'completed' ? '-signed' : '-so-far'}.pdf`, out);
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : 'Could not build the PDF.');
    } finally {
      setBusy(null);
    }
  }

  const byId = new Map(participants.map((p) => [p.id, p]));
  const items: TimelineItem[] = (events ?? []).map((e) => ({
    id: e.id,
    title: eventText[e.type],
    detail: e.participant_id ? fullName(byId.get(e.participant_id) ?? { first_name: 'Someone', last_name: '' }) : undefined,
    at: e.created_at,
    tone: (e.type === 'signed' || e.type === 'completed' ? 'success' : e.type === 'voided' || e.type === 'email_failed' ? 'danger' : e.type === 'sent' || e.type === 'emailed' ? 'accent' : 'default') as StatusTone,
  })).reverse();

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Signed" value={`${signed.length} of ${signers.length}`} />
        <Stat label="Sent" value={envelope.sent_at ? new Date(envelope.sent_at).toLocaleDateString() : '–'} detail={envelope.sent_at ? new Date(envelope.sent_at).toLocaleTimeString() : 'not yet'} />
        <Stat label="Completed" value={envelope.completed_at ? new Date(envelope.completed_at).toLocaleDateString() : '–'} detail={envelope.completed_at ? new Date(envelope.completed_at).toLocaleTimeString() : envelope.status === 'sent' ? 'waiting' : undefined} />
      </div>

      {envelope.status === 'draft' && <Notice status="default" icon={false} title="Nothing to show yet">Send the document and the signatures appear here as they come in.</Notice>}

      {signers.length > 0 && (
        <DataTable<Participant>
          caption="Signatures"
          rows={signers}
          rowKey={(p) => p.id}
          columns={[
            { id: 'who', header: 'Signer', cell: (p) => <PersonChip name={fullName(p)} detail={p.email} colour={participants.indexOf(p)} /> },
            { id: 'status', header: 'Status', cell: (p) => <StatusChip tone={participantTone(p.status)}>{participantLabel(p.status)}</StatusChip> },
            { id: 'viewed', header: 'Opened', numeric: true, cell: (p) => <span className="text-muted">{p.viewed_at ? new Date(p.viewed_at).toLocaleString() : '–'}</span> },
            { id: 'signed', header: 'Signed', numeric: true, cell: (p) => <span className="text-muted">{p.signed_at ? new Date(p.signed_at).toLocaleString() : '–'}</span> },
            { id: 'as', header: 'Signed as', cell: (p) => p.typed_name || <span className="text-muted">–</span> },
          ]}
        />
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="gap-3 p-5">
          <h3 className="text-lg">{envelope.status === 'completed' ? 'Signed documents' : 'Documents'}</h3>
          {documents.length === 0 && <p className="text-sm text-muted">No documents.</p>}
          <ul className="flex flex-col gap-2">
            {documents.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3">
                <span className="truncate text-sm font-medium">{d.name}.pdf</span>
                <Button variant={envelope.status === 'completed' ? 'primary' : 'outline'} size="sm" onPress={() => void download(d)} isPending={busy === d.id}><DownloadSimpleIcon /> {envelope.status === 'completed' ? 'Download signed' : 'Download so far'}</Button>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted">The signatures are drawn onto a copy of the PDF in your browser. Your original stays as uploaded.</p>
        </Card>
        <Card className="gap-3 p-5">
          <h3 className="text-lg">What happened</h3>
          {events === null ? <Skeleton className="h-24 rounded-md" /> : items.length ? <Timeline items={items} /> : <p className="text-sm text-muted">Nothing yet.</p>}
        </Card>
      </div>
    </div>
  );
}
