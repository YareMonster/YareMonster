import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Card, Skeleton } from '@heroui/react';
import { ArrowRightIcon, PlusIcon } from '@phosphor-icons/react';
import { DataTable, Notice, StatusChip, YareMark } from '../yare';
import type { Envelope } from '../lib/supabase';
import { useEnvelopes } from './EnvelopesContext';
import { envelopeTone, envelopeLabel } from './status';

/** The dashboard: a few numbers and the documents, newest first. */
export function HomePage() {
  const { db, envelopes, error, create } = useEnvelopes();
  const navigate = useNavigate();
  const [signers, setSigners] = useState<Map<string, { total: number; signed: number }> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await db.from('yaresign_participants').select('envelope_id, role, status');
      if (cancelled) return;
      const by = new Map<string, { total: number; signed: number }>();
      for (const p of data ?? []) {
        if (p.role !== 'signer') continue;
        const c = by.get(p.envelope_id) ?? { total: 0, signed: 0 };
        c.total += 1;
        if (p.status === 'signed') c.signed += 1;
        by.set(p.envelope_id, c);
      }
      setSigners(by);
    })();
    return () => { cancelled = true; };
  }, [db, envelopes]);

  const waiting = envelopes?.filter((e) => e.status === 'sent').length ?? 0;
  const completed = envelopes?.filter((e) => e.status === 'completed').length ?? 0;

  return (
    <>
      {error && <Notice status="danger" title="Could not load your documents">{error}</Notice>}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Documents" value={envelopes ? String(envelopes.length) : null} detail={envelopes ? `${envelopes.filter((e) => e.status === 'draft').length} drafts` : undefined} />
        <Stat label="Waiting for signatures" value={envelopes ? String(waiting) : null} detail="sent, not yet complete" />
        <Stat label="Completed" value={envelopes ? String(completed) : null} detail="everyone signed" />
      </div>

      {envelopes === null && !error && <Skeleton className="h-48 rounded-(--yare-radius-card)" aria-busy="true" />}
      {envelopes !== null && envelopes.length === 0 && (
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-12 text-center">
          <YareMark size={72} />
          <h2 className="text-2xl">Your first document</h2>
          <p className="text-sm text-muted">Upload a PDF, place the signature fields, add the people, send. The signed copy lands in your own database.</p>
          <Button variant="primary" onPress={() => create().then((e) => navigate(`/documents/${e.id}`))}><PlusIcon weight="bold" /> New document</Button>
        </div>
      )}

      {envelopes !== null && envelopes.length > 0 && (
        <>
          <h2 className="mb-3 text-xl">Your documents</h2>
          <DataTable<Envelope>
            caption="Your documents"
            rows={envelopes}
            rowKey={(e) => e.id}
            columns={[
              { id: 'title', header: 'Document', cell: (e) => <button type="button" className="yare-table__link" onClick={() => navigate(`/documents/${e.id}`)}>{e.title}</button> },
              { id: 'status', header: 'Status', cell: (e) => <StatusChip tone={envelopeTone(e.status)}>{envelopeLabel(e.status)}</StatusChip> },
              { id: 'signed', header: 'Signed', align: 'end', numeric: true, cell: (e) => { const c = signers?.get(e.id); return signers ? (c ? `${c.signed} of ${c.total}` : '–') : '…'; } },
              { id: 'updated', header: 'Updated', numeric: true, cell: (e) => <span className="text-muted">{new Date(e.updated_at).toLocaleDateString()}</span> },
              { id: 'open', header: '', label: 'Actions', align: 'end', cell: (e) => <Button variant="outline" size="sm" onPress={() => navigate(`/documents/${e.id}`)}>Open <ArrowRightIcon /></Button> },
            ]}
          />
        </>
      )}
    </>
  );
}

export function Stat({ label, value, detail }: { label: string; value: string | null; detail?: string }) {
  return (
    <Card className="gap-1 p-5">
      <div className="text-sm font-medium text-muted">{label}</div>
      {value === null ? <Skeleton className="h-8 w-16 rounded-md" /> : <div className="text-3xl font-extrabold" style={{ fontFamily: 'var(--font-display)' }}>{value}</div>}
      {detail && <div className="text-xs text-muted">{detail}</div>}
    </Card>
  );
}
