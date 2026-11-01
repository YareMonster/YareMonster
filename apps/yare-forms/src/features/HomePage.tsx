import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Card, Skeleton } from '@heroui/react';
import { ArrowRightIcon, PlusIcon } from '@phosphor-icons/react';
import { DataTable, Notice, StatusChip, YareMark } from '../yare';
import type { Form } from '../lib/supabase';
import { useForms } from './FormsContext';

/** The dashboard: a few numbers and the forms, newest first. */
export function HomePage() {
  const { db, forms, error, create } = useForms();
  const navigate = useNavigate();
  const [responses, setResponses] = useState<{ total: number; completed: number; byForm: Map<string, { total: number; completed: number }> } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Small deployments: one query, counted in the browser. One row per response, two columns.
      const { data } = await db.from('yareforms_responses').select('form_id, status');
      if (cancelled) return;
      const byForm = new Map<string, { total: number; completed: number }>();
      let total = 0, completed = 0;
      for (const r of data ?? []) {
        const c = byForm.get(r.form_id) ?? { total: 0, completed: 0 };
        c.total += 1; total += 1;
        if (r.status === 'completed') { c.completed += 1; completed += 1; }
        byForm.set(r.form_id, c);
      }
      setResponses({ total, completed, byForm });
    })();
    return () => { cancelled = true; };
  }, [db, forms]);

  const published = forms?.filter((f) => f.status === 'published').length ?? 0;

  return (
    <>
      {error && <Notice status="danger" title="Could not load your forms">{error}</Notice>}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Forms" value={forms ? String(forms.length) : null} detail={forms ? `${published} published` : undefined} />
        <Stat label="Responses" value={responses ? String(responses.completed) : null} detail={responses ? `${responses.total - responses.completed} unfinished` : undefined} />
        <Stat label="Completion" value={responses ? (responses.total ? `${Math.round((responses.completed / responses.total) * 100)}%` : '–') : null} detail="of people who started finished" />
      </div>

      {forms !== null && forms.length === 0 && (
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-12 text-center">
          <YareMark size={72} />
          <h2 className="text-2xl">Your first form</h2>
          <p className="text-sm text-muted">One question per screen, a theme you pick, a link you share. The answers land in your own database.</p>
          <Button variant="primary" onPress={() => create().then((f) => navigate(`/forms/${f.id}`))}><PlusIcon weight="bold" /> New form</Button>
        </div>
      )}

      {forms !== null && forms.length > 0 && (
        <>
          <h2 className="mb-3 text-xl">Your forms</h2>
          <DataTable<Form>
            caption="Your forms"
            rows={forms}
            rowKey={(f) => f.id}
            columns={[
              { id: 'title', header: 'Form', cell: (f) => <button type="button" className="yare-table__link" onClick={() => navigate(`/forms/${f.id}`)}>{f.title}</button> },
              { id: 'status', header: 'Status', cell: (f) => <StatusChip tone={f.status === 'published' ? 'success' : 'default'}>{f.status === 'published' ? 'Published' : 'Draft'}</StatusChip> },
              { id: 'responses', header: 'Responses', align: 'end', numeric: true, cell: (f) => (responses ? responses.byForm.get(f.id)?.completed ?? 0 : '…') },
              { id: 'rate', header: 'Completion', align: 'end', numeric: true, cell: (f) => { const c = responses?.byForm.get(f.id); return responses ? (c && c.total ? `${Math.round((c.completed / c.total) * 100)}%` : '–') : '…'; } },
              { id: 'updated', header: 'Updated', numeric: true, cell: (f) => <span className="text-muted">{new Date(f.updated_at).toLocaleDateString()}</span> },
              { id: 'open', header: '', label: 'Actions', align: 'end', cell: (f) => <Button variant="outline" size="sm" onPress={() => navigate(`/forms/${f.id}`)}>Open <ArrowRightIcon /></Button> },
            ]}
          />
        </>
      )}
    </>
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
