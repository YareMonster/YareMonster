import { useEffect, useState } from 'react';
import { Button, Card, Skeleton } from '@heroui/react';
import { ArrowDownLeftIcon, ArrowSquareOutIcon, ArrowUpRightIcon, ArrowsLeftRightIcon } from '@phosphor-icons/react';
import { DataTable, Notice, Pagination } from '../../yare';
import type { Client, Wallet } from '../../lib/supabase';
import { pageTransactions, type Transaction } from '../../lib/crypto-api';
import { networkOf, shortAddress } from '../../lib/networks';
import { amount, usd } from '../../lib/format';

const PAGE = 50;

/** Every movement of the wallets, newest first, fifty a page. */
export function ActivityTable({ db, wallets, version, combined }: { db: Client; wallets: Wallet[]; version: number; combined?: boolean }) {
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<Transaction[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const ids = wallets.map((w) => w.id).join(',');

  useEffect(() => { setPage(0); }, [ids, version]);
  useEffect(() => {
    let cancelled = false;
    setRows(null);
    pageTransactions(db, ids ? ids.split(',') : [], page, PAGE)
      .then((r) => { if (!cancelled) { setRows(r.rows); setTotal(r.total); setError(null); } })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load the activity.'); });
    return () => { cancelled = true; };
  }, [db, ids, page, version]);

  const walletName = (id: string) => wallets.find((w) => w.id === id)?.name ?? '';

  if (error) return <Notice status="danger" title="Could not load the activity">{error}</Notice>;
  if (rows === null) return <Skeleton className="h-64 rounded-(--yare-radius-card)" />;
  if (total === 0) return <Card className="p-8 text-center text-sm text-muted">No activity yet.</Card>;

  return (
    <div className="flex flex-col gap-3">
      <DataTable<Transaction>
        caption="Transactions"
        rows={rows}
        rowKey={(t) => t.id}
        columns={[
          { id: 'what', header: 'Movement', cell: (t) => <span className="inline-flex items-center gap-2">{t.internal ? <ArrowsLeftRightIcon className="text-muted" /> : t.direction === 'in' ? <ArrowDownLeftIcon className="text-success" /> : <ArrowUpRightIcon className="text-danger" />}<span>{t.internal ? 'Transfer' : t.kind === 'nft' ? (t.direction === 'in' ? 'Received NFT' : 'Sent NFT') : t.direction === 'in' ? 'Received' : t.direction === 'self' ? 'Self' : 'Sent'}{t.failed ? ' (failed)' : ''}</span></span> },
          { id: 'asset', header: 'Asset', cell: (t) => <span className="yare-table__cell-truncate" title={t.asset_name}>{t.kind === 'nft' ? `${t.asset_name} #${t.token_id}` : t.asset_symbol}</span> },
          { id: 'amount', header: 'Amount', align: 'end', numeric: true, cell: (t) => (t.kind === 'nft' ? String(t.amount) : `${t.direction === 'in' ? '+' : t.direction === 'out' ? '−' : ''}${amount(t.amount)}`) },
          { id: 'usd', header: 'Value then', align: 'end', numeric: true, cell: (t) => (t.usd_value === null ? <span className="text-muted">–</span> : usd(t.usd_value)) },
          { id: 'fee', header: 'Fee', align: 'end', numeric: true, cell: (t) => (t.fee_usd ? usd(t.fee_usd) : <span className="text-muted">–</span>) },
          ...(combined ? [{ id: 'wallet', header: 'Wallet', cell: (t: Transaction) => walletName(t.wallet_id) }] : []),
          { id: 'who', header: 'With', cell: (t) => <code className="text-xs">{t.counterparty ? shortAddress(t.counterparty) : '–'}</code> },
          { id: 'when', header: 'When', numeric: true, cell: (t) => <span className="text-muted">{new Date(t.ts).toLocaleString()}</span> },
          { id: 'open', header: '', label: 'Explorer', align: 'end', cell: (t) => { const w = wallets.find((x) => x.id === t.wallet_id); return w ? <Button variant="ghost" size="sm" isIconOnly aria-label="Open in explorer" onPress={() => window.open(`${networkOf(w.network).explorer}/tx/${t.hash}`, '_blank', 'noopener,noreferrer')}><ArrowSquareOutIcon /></Button> : null; } },
        ]}
      />
      <Pagination page={page} pageSize={PAGE} total={total} onChange={setPage} noun="transactions" />
    </div>
  );
}
