import { useNavigate } from 'react-router';
import { Button } from '@heroui/react';
import { ArrowRightIcon, PlusIcon } from '@phosphor-icons/react';
import { DataTable, Notice, StatCard, StatusChip, YareMark, formatBytes } from '../yare';
import type { Transfer } from '../lib/supabase';
import { useTransfers } from './TransfersContext';
import { linkLabel, linkState, linkTone, timeLeft } from './status';

/** The dashboard: a few numbers and the transfers, newest first. */
export function HomePage() {
  const { transfers, error, create } = useTransfers();
  const navigate = useNavigate();
  const live = transfers?.filter((t) => linkState(t) === 'live').length ?? 0;
  const downloads = transfers?.reduce((n, t) => n + t.downloads, 0) ?? 0;

  return (
    <>
      {error && <Notice status="danger" title="Could not load your transfers">{error}</Notice>}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Transfers" value={transfers ? String(transfers.length) : null} detail={transfers ? `${live} live` : undefined} />
        <StatCard label="Downloads" value={transfers ? String(downloads) : null} detail="files handed out, all time" />
        <StatCard label="Opens" value={transfers ? String(transfers.reduce((n, t) => n + t.opens, 0)) : null} detail="times a link was opened" />
      </div>
      {transfers !== null && transfers.length === 0 && (
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-12 text-center">
          <YareMark size={72} />
          <h2 className="text-2xl">Your first transfer</h2>
          <p className="text-sm text-muted">Upload the files, write a line, pick a look, share the link. It lives up to seven days, then the files are gone. Everything stays in your own storage.</p>
          <Button variant="primary" onPress={() => create().then((t) => navigate(`/transfers/${t.id}`))}><PlusIcon weight="bold" /> New transfer</Button>
        </div>
      )}
      {transfers !== null && transfers.length > 0 && (
        <>
          <h2 className="mb-3 text-xl">Your transfers</h2>
          <DataTable<Transfer>
            caption="Your transfers"
            rows={transfers}
            rowKey={(t) => t.id}
            columns={[
              { id: 'title', header: 'Transfer', cell: (t) => <button type="button" className="yare-table__link" onClick={() => navigate(`/transfers/${t.id}`)}>{t.title}</button> },
              { id: 'status', header: 'Status', cell: (t) => <StatusChip tone={linkTone[linkState(t)]}>{linkLabel[linkState(t)]}</StatusChip> },
              { id: 'left', header: 'Time left', cell: (t) => <span className="text-muted">{linkState(t) === 'live' ? timeLeft(t) : '–'}</span> },
              { id: 'downloads', header: 'Downloads', align: 'end', numeric: true, cell: (t) => t.downloads },
              { id: 'updated', header: 'Updated', numeric: true, cell: (t) => <span className="text-muted">{new Date(t.updated_at).toLocaleDateString()}</span> },
              { id: 'open', header: '', label: 'Actions', align: 'end', cell: (t) => <Button variant="outline" size="sm" onPress={() => navigate(`/transfers/${t.id}`)}>Open <ArrowRightIcon /></Button> },
            ]}
          />
        </>
      )}
    </>
  );
}

export { formatBytes };
