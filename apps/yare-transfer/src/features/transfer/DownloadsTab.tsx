import { useEffect, useState } from 'react';
import { Card, Skeleton } from '@heroui/react';
import { DataTable, FileKindIcon, Notice, StatCard, formatBytes } from '../../yare';
import type { Client, Download, Transfer, TransferFile } from '../../lib/supabase';
import { listDownloads } from '../../lib/transfer-api';

export function DownloadsTab({ db, transfer, files }: { db: Client; transfer: Transfer; files: TransferFile[] }) {
  const [rows, setRows] = useState<Download[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { listDownloads(db, transfer.id).then(setRows).catch((e) => setError(e instanceof Error ? e.message : 'Could not load the downloads.')); }, [db, transfer.id, transfer.downloads]);
  const name = (id: string | null) => files.find((f) => f.id === id)?.name ?? 'a removed file';
  return (
    <div className="flex flex-col gap-4">
      {error && <Notice status="danger" title="Could not load the downloads">{error}</Notice>}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Opens" value={String(transfer.opens)} detail="times the link was opened" />
        <StatCard label="Downloads" value={String(transfer.downloads)} detail="files handed out" />
        <StatCard label="Published" value={transfer.published_at ? new Date(transfer.published_at).toLocaleDateString() : '–'} detail={transfer.expires_at ? `until ${new Date(transfer.expires_at).toLocaleString()}` : 'not yet'} />
      </div>
      <Card className="gap-1 p-5">
        <h3 className="mb-2 text-base">By file</h3>
        {files.length === 0 && <p className="text-sm text-muted">No files.</p>}
        {files.map((f) => (
          <div key={f.id} className="yare-file">
            <span className="yare-file__icon"><FileKindIcon name={f.name} type={f.content_type} /></span>
            <span className="yare-file__text"><span className="yare-file__name">{f.name}</span><span className="yare-file__meta">{formatBytes(f.size_bytes)}</span></span>
            <span className="text-sm font-semibold tabular-nums">{f.downloads} download{f.downloads === 1 ? '' : 's'}</span>
          </div>
        ))}
      </Card>
      {rows === null && !error && <Skeleton className="h-40 rounded-(--yare-radius-card)" />}
      {rows && rows.length > 0 && (
        <DataTable<Download>
          caption="Downloads"
          rows={rows}
          rowKey={(r) => r.id}
          columns={[
            { id: 'when', header: 'When', numeric: true, cell: (r) => <span className="text-muted">{new Date(r.created_at).toLocaleString()}</span> },
            { id: 'file', header: 'File', cell: (r) => name(r.file_id) },
          ]}
        />
      )}
      {rows && rows.length === 0 && <p className="text-center text-sm text-muted">No downloads yet. Nothing about who downloads is recorded, only when.</p>}
    </div>
  );
}
