import { useEffect, useMemo, useState } from 'react';
import { AlertDialog, Button, Card, Skeleton, Switch, toast } from '@heroui/react';
import { DownloadSimpleIcon, TrashIcon } from '@phosphor-icons/react';
import { DataTable, Notice, YareMark } from '../../yare';
import type { Block, Client, Form, FormResponse } from '../../lib/supabase';
import { deleteResponse, listResponses } from '../../lib/forms-api';
import { formatAnswer, isQuestion } from '../../lib/blocks';

function csvEscape(v: string) { return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; }

export function ResponsesTab({ db, form, blocks }: { db: Client; form: Form; blocks: Block[] }) {
  const [rows, setRows] = useState<FormResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [includeUnfinished, setIncludeUnfinished] = useState(false);
  const [toDelete, setToDelete] = useState<FormResponse | null>(null);
  const questions = useMemo(() => blocks.filter(isQuestion), [blocks]);

  useEffect(() => {
    listResponses(db, form.id).then(setRows).catch((e) => setError(e instanceof Error ? e.message : 'Could not load responses.'));
  }, [db, form.id]);

  const completed = rows?.filter((r) => r.status === 'completed') ?? [];
  const shown = includeUnfinished ? rows ?? [] : completed;
  const rate = rows && rows.length ? Math.round((completed.length / rows.length) * 100) : null;
  const dropOff = useMemo(() => {
    const started = rows?.filter((r) => r.status === 'started') ?? [];
    const counts = new Map<string, number>();
    for (const r of started) if (r.last_block_id) counts.set(r.last_block_id, (counts.get(r.last_block_id) ?? 0) + 1);
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    return top ? { block: blocks.find((b) => b.id === top[0]), count: top[1] } : null;
  }, [rows, blocks]);

  function exportCsv() {
    const header = ['Response', 'Started', 'Completed', 'Status', ...questions.map((q) => q.title || q.type)];
    const lines = shown.map((r) => [r.id, r.started_at, r.completed_at ?? '', r.status, ...questions.map((q) => formatAnswer(r.answers[q.id]))].map(csvEscape).join(','));
    const blob = new Blob([[header.map(csvEscape).join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${form.slug}-responses.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  async function remove(r: FormResponse) {
    try {
      await deleteResponse(db, r.id);
      setRows((list) => list?.filter((x) => x.id !== r.id) ?? null);
      toast.success('Response deleted');
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : 'Could not delete it.');
    } finally {
      setToDelete(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <Notice status="danger" title="Could not load responses">{error}</Notice>}
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Started" value={rows ? String(rows.length) : null} />
        <Stat label="Completed" value={rows ? String(completed.length) : null} />
        <Stat label="Completion" value={rows ? (rate === null ? '–' : `${rate}%`) : null} detail={dropOff?.block ? `Most drop off at “${dropOff.block.title || dropOff.block.type}”` : undefined} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Switch isSelected={includeUnfinished} onChange={setIncludeUnfinished}>
          <Switch.Content><Switch.Control><Switch.Thumb /></Switch.Control>Include unfinished</Switch.Content>
        </Switch>
        <Button variant="outline" size="sm" onPress={exportCsv} isDisabled={shown.length === 0}><DownloadSimpleIcon /> Export CSV</Button>
      </div>

      {rows === null && !error && <Skeleton className="h-40 rounded-(--yare-radius-card)" />}

      {rows !== null && shown.length === 0 && (
        <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-12 text-center">
          <YareMark size={64} />
          <h3 className="text-xl">No responses yet</h3>
          <p className="text-sm text-muted">{form.status === 'published' ? 'Share the link and answers will show up here.' : 'Publish the form, share the link, and answers will show up here.'}</p>
        </div>
      )}

      {shown.length > 0 && (
        <DataTable<FormResponse>
          caption="Responses"
          rows={shown}
          rowKey={(r) => r.id}
          columns={[
            { id: 'date', header: 'Date', numeric: true, cell: (r) => <span className="text-muted">{new Date(r.completed_at ?? r.started_at).toLocaleString()}</span> },
            ...questions.map((q) => ({
              id: q.id,
              header: <span className="yare-table__cell-truncate" title={q.title}>{q.title || q.type}</span>,
              cell: (r: FormResponse) => { const v = formatAnswer(r.answers[q.id]); return v ? <span className="yare-table__cell-truncate" title={v}>{v}</span> : <span className="text-muted">–</span>; },
            })),
            { id: 'status', header: 'Status', cell: (r) => (r.status === 'completed' ? 'Completed' : 'Unfinished') },
            { id: 'actions', header: '', label: 'Actions', align: 'end', cell: (r) => <Button variant="ghost" size="sm" isIconOnly aria-label="Delete response" onPress={() => setToDelete(r)}><TrashIcon /></Button> },
          ]}
        />
      )}

      <AlertDialog isOpen={toDelete !== null} onOpenChange={(o) => { if (!o) setToDelete(null); }}>
        <AlertDialog.Backdrop>
          <AlertDialog.Container size="sm">
            <AlertDialog.Dialog aria-label="Delete response">
              <AlertDialog.Header><AlertDialog.Heading>Delete this response?</AlertDialog.Heading></AlertDialog.Header>
              <AlertDialog.Body><p className="text-sm text-muted">It is removed from your database for good.</p></AlertDialog.Body>
              <AlertDialog.Footer className="gap-2">
                <Button variant="outline" onPress={() => setToDelete(null)}>Cancel</Button>
                <Button variant="danger" onPress={() => { if (toDelete) void remove(toDelete); }}>Delete</Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>
    </div>
  );
}

function Stat({ label, value, detail }: { label: string; value: string | null; detail?: string }) {
  return (
    <Card className="gap-1 p-5">
      <div className="text-sm font-medium text-muted">{label}</div>
      {value === null ? <Skeleton className="h-8 w-16 rounded-md" /> : <div className="text-3xl font-extrabold" style={{ fontFamily: 'var(--font-display)' }}>{value}</div>}
      {detail && <div className="text-xs text-muted">{detail}</div>}
    </Card>
  );
}
