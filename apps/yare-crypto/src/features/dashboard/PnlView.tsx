import { useEffect, useState } from 'react';
import { Card, Skeleton } from '@heroui/react';
import { DataTable, MonsterNote, Notice, StatCard, TokenIcon } from '../../yare';
import type { Client, Wallet } from '../../lib/supabase';
import { listAllTransactions, type Holding } from '../../lib/crypto-api';
import { computePnl, type AssetPnl, type Pnl } from '../../lib/pnl';
import { amount, signedUsd, usd } from '../../lib/format';

const Money = ({ v, signed }: { v: number | null; signed?: boolean }) => (v === null ? <span className="text-muted">–</span> : <span className={signed ? (v > 0 ? 'text-success' : v < 0 ? 'text-danger' : '') : ''}>{signed ? signedUsd(v) : usd(v)}</span>);

/** Profit and loss by asset, average cost, from every movement with a known price. */
export function PnlView({ db, wallets, holdings, version, combined }: { db: Client; wallets: Wallet[]; holdings: Holding[] | null; version: number; combined?: boolean }) {
  const [pnl, setPnl] = useState<Pnl | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ids = wallets.map((w) => w.id).join(',');

  useEffect(() => {
    if (!holdings) return;
    let cancelled = false;
    setPnl(null);
    listAllTransactions(db, ids ? ids.split(',') : [])
      .then((txs) => { if (!cancelled) setPnl(computePnl(txs, holdings, !!combined)); })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load the movements.'); });
    return () => { cancelled = true; };
  }, [db, ids, holdings, version, combined]);

  if (error) return <Notice status="danger" title="Could not work out the profit and loss">{error}</Notice>;
  const total = pnl ? pnl.realised + pnl.unrealised : null;
  const ratio = pnl && pnl.costBasis >= 100 && total !== null ? total / pnl.costBasis : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Unrealised" value={pnl ? signedUsd(pnl.unrealised) : null} detail="what is held, now, minus what it cost" />
        <StatCard label="Realised" value={pnl ? signedUsd(pnl.realised) : null} detail="what was sold or sent, minus its cost" />
        <StatCard label="Total" value={total !== null ? signedUsd(total) : null} delta={ratio !== null && Math.abs(ratio) <= 10 ? { ratio } : undefined} detail="realised plus unrealised" />
        <StatCard label="Fees" value={pnl ? usd(pnl.fees) : null} detail="network fees, not in the figures above" />
      </div>
      {pnl === null && <Skeleton className="h-48 rounded-(--yare-radius-card)" />}
      {pnl && pnl.assets.length === 0 && <Card className="p-8 text-center text-sm text-muted">Nothing to compute yet.</Card>}
      {pnl && pnl.assets.length > 0 && (
        <DataTable<AssetPnl>
          caption="Profit and loss by asset"
          rows={pnl.assets}
          rowKey={(a) => a.key}
          columns={[
            { id: 'asset', header: 'Asset', cell: (a) => <span className="inline-flex items-center gap-2"><TokenIcon src={a.logo} symbol={a.symbol} size={28} /><span className="font-semibold">{a.symbol}</span></span> },
            { id: 'units', header: 'Held', align: 'end', numeric: true, cell: (a) => amount(a.units) },
            { id: 'avg', header: 'Avg cost', align: 'end', numeric: true, cell: (a) => <Money v={a.avgCost} /> },
            { id: 'price', header: 'Price now', align: 'end', numeric: true, cell: (a) => <Money v={a.priceNow} /> },
            { id: 'cost', header: 'Cost basis', align: 'end', numeric: true, cell: (a) => usd(a.costBasis) },
            { id: 'value', header: 'Value now', align: 'end', numeric: true, cell: (a) => <Money v={a.valueNow} /> },
            { id: 'unreal', header: 'Unrealised', align: 'end', numeric: true, cell: (a) => <Money v={a.unrealised} signed /> },
            { id: 'real', header: 'Realised', align: 'end', numeric: true, cell: (a) => <Money v={a.realised} signed /> },
            { id: 'fees', header: 'Fees', align: 'end', numeric: true, cell: (a) => (a.fees ? usd(a.fees) : <span className="text-muted">–</span>) },
          ]}
        />
      )}
      <MonsterNote title="How this is worked out">
        Average cost: every unit that comes in is bought at that day's price, every unit that goes out is sold at that day's price against the average cost of what was held, and what is still held is valued at today's price.{pnl && pnl.unpriced > 0 ? ` ${pnl.unpriced} movement${pnl.unpriced === 1 ? '' : 's'} had no known price (a token nobody prices) and entered at zero cost, so the figures lean low.` : ''}{combined ? ' Moves between your own wallets are skipped: nothing was bought or sold.' : ' Moves from your other wallets count as bought at that day\'s price.'} An estimate, not tax advice.
      </MonsterNote>
    </div>
  );
}
