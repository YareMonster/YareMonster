import { useState } from 'react';
import { Button, Card, Skeleton } from '@heroui/react';
import { ArrowDownLeftIcon, ArrowRightIcon, ArrowUpRightIcon, ArrowsLeftRightIcon, ImagesIcon } from '@phosphor-icons/react';
import { AssetRow, MonsterNote, NftTile, Notice, RangeTabs, StatCard, StatusChip, TokenIcon, YareMark } from '../../yare';
import { AreaChart, DonutChart } from '../../yare-charts';
import type { Client, Wallet } from '../../lib/supabase';
import { ActivityTable } from './ActivityTable';
import { PnlView } from './PnlView';
import { networkOf, shortAddress } from '../../lib/networks';
import { amount, shortDate, shortDateYear, signedUsd, usd } from '../../lib/format';
import { mergeHoldings, ranges, summarise, useSeries, type Range, type WalletData } from './useWalletData';

interface Props {
  db: Client;
  /** Bumps when a sync ends. */
  version: number;
  data: WalletData | null;
  error: string | null;
  wallets: Wallet[];
  /** Combined view: name the wallet on each activity row. */
  combined?: boolean;
  view: 'overview' | 'holdings' | 'activity' | 'nfts' | 'pnl';
  /** From the overview's short lists to the full tab. */
  onSeeAll?: (view: 'activity' | 'nfts') => void;
}

/** The report: net worth, the chart, holdings, activity and NFTs. The home shows it for every wallet, a wallet page for one. */
export function Dashboard({ db, version, data, error, wallets, combined, view, onSeeAll }: Props) {
  const [range, setRange] = useState<Range>('1m');
  const series = useSeries(data?.snapshots, range);
  const holdings = data ? mergeHoldings(data.holdings) : null;
  const netWorth = holdings?.reduce((s, h) => s + (h.usd_value ?? 0), 0) ?? null;
  const change = series.points.length > 1 && series.first > 0 ? (series.last - series.first) / series.first : null;
  const summary = data && netWorth !== null ? summarise(data.transactions, netWorth) : null;
  const walletName = (id: string) => wallets.find((w) => w.id === id)?.name ?? '';
  const anySynced = wallets.some((w) => w.last_synced_at);

  if (error) return <Notice status="danger" title="Could not load">{error}</Notice>;

  const overview = (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Money in" value={summary ? usd(summary.moneyIn) : null} detail="received, at the price of the day" />
        <StatCard label="Money out" value={summary ? usd(summary.moneyOut) : null} detail="sent, at the price of the day" />
        <StatCard label="Fees paid" value={summary ? usd(summary.fees) : null} detail="network fees in dollars" />
        <StatCard label="Simple gain" value={summary ? signedUsd(summary.gain) : null} delta={summary && summary.moneyIn - summary.moneyOut >= 100 && Math.abs(summary.gain / (summary.moneyIn - summary.moneyOut)) <= 10 ? { ratio: summary.gain / (summary.moneyIn - summary.moneyOut) } : undefined} detail="worth now minus net money in" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card className="gap-3 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-muted">Net worth</div>
              {netWorth === null ? <Skeleton className="h-10 w-40 rounded-md" /> : <div className="text-4xl font-extrabold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>{usd(netWorth)}</div>}
              {change !== null && <div className="mt-1 flex items-center gap-2 text-sm"><span className={change >= 0 ? 'font-semibold text-success' : 'font-semibold text-danger'}>{change >= 0 ? '▲' : '▼'} {(Math.abs(change) * 100).toFixed(1)}% {signedUsd(series.last - series.first)}</span><span className="text-muted">over {ranges.find((r) => r.key === range)?.label}</span></div>}
            </div>
            <RangeTabs options={ranges.map((r) => ({ key: r.key, label: r.label }))} value={range} onChange={setRange} />
          </div>
          {/* The card stretches to its neighbour's height; the chart takes whatever is left so the card never shows a gap. */}
          <div className="flex min-h-60 flex-1 flex-col">
            {series.points.length > 1 ? (
              <AreaChart data={series.points.map((p) => ({ x: p.x, y: p.y }))} height="100%" className="flex-1" formatValue={(v) => usd(v, { short: true })} formatLabel={(x) => (range === '7d' || range === '1m' ? shortDate(Number(x)) : shortDateYear(Number(x)))} aria-label="Net worth over time" />
            ) : (
              <div className="grid flex-1 place-items-center text-sm text-muted">{anySynced ? 'Not enough days yet for a chart.' : 'The chart appears once a wallet has been read.'}</div>
            )}
          </div>
          {series.points.some((p) => p.estimate) && <MonsterNote>Some days are estimates: a holding had no known price that day, so it is left out of that day's value.</MonsterNote>}
        </Card>
        <Card className="gap-3 p-5">
          <h3 className="text-base">Holdings</h3>
          {holdings === null ? <Skeleton className="h-40 rounded-md" /> : holdings.length === 0 ? <p className="text-sm text-muted">Nothing held yet.</p> : (
            <>
              <div className="flex items-center justify-center py-1">
                <DonutChart size={150} slices={holdings.filter((h) => (h.usd_value ?? 0) > 0).slice(0, 7).map((h) => ({ id: h.asset_contract ?? h.symbol, label: h.symbol, value: h.usd_value ?? 0 }))} formatValue={(v) => usd(v)} centre={<><span className="text-xs text-muted">Total</span><span className="text-sm font-bold">{usd(netWorth, { short: true })}</span></>} aria-label="Holdings by asset" />
              </div>
              <div>{holdings.slice(0, 5).map((h) => <AssetRow key={h.id} icon={<TokenIcon src={h.logo_url} symbol={h.symbol} />} name={h.name} symbol={h.symbol} primary={amount(h.balance)} secondary={h.usd_value === null ? 'no price' : usd(h.usd_value)} />)}</div>
            </>
          )}
        </Card>
      </div>
    </>
  );

  const holdingsView = (
    <Card className="gap-1 p-5">
      <h3 className="mb-2 text-base">Holdings</h3>
      {holdings === null ? <Skeleton className="h-40 rounded-md" /> : holdings.length === 0 ? <p className="text-sm text-muted">Nothing held yet.</p> : holdings.map((h) => (
        <AssetRow key={h.id} icon={<TokenIcon src={h.logo_url} symbol={h.symbol} />} name={h.name} symbol={h.symbol} primary={h.usd_value === null ? <span className="text-muted">no price</span> : usd(h.usd_value)} secondary={`${amount(h.balance)} ${h.symbol}${h.usd_price ? ` · ${usd(h.usd_price)} each` : ''}${netWorth ? ` · ${(((h.usd_value ?? 0) / netWorth) * 100).toFixed(1)}%` : ''}`} />
      ))}
      {holdings && holdings.some((h) => h.usd_value === null) && <p className="mt-2 text-xs text-muted">Tokens without a known price are listed but not counted. Many of them are spam sent to every address.</p>}
    </Card>
  );

  const nftsView = (
    <Card className="gap-4 p-5">
      <h3 className="text-base">NFTs</h3>
      {data === null ? <Skeleton className="h-40 rounded-md" /> : data.nfts.length === 0 ? <p className="text-sm text-muted">No NFTs in {combined ? 'these wallets' : 'this wallet'}.</p> : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {data.nfts.map((n) => { const w = wallets.find((x) => x.id === n.wallet_id); return <NftTile key={n.id} image={n.image_url} name={n.name} collection={n.collection} href={w ? `${networkOf(w.network).explorer}/nft/${n.contract}/${n.token_id}` : undefined} />; })}
        </div>
      )}
      <p className="text-xs text-muted">NFTs are shown, not valued. Floor prices move too much to put a number on them.</p>
    </Card>
  );

  if (view === 'holdings') return holdingsView;
  if (view === 'activity') return <ActivityTable db={db} wallets={wallets} version={version} combined={combined} />;
  if (view === 'nfts') return nftsView;
  if (view === 'pnl') return <PnlView db={db} wallets={wallets} holdings={data?.holdings ?? null} version={version} combined={combined} />;
  return (
    <div className="flex flex-col gap-4">
      {overview}
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <Card className="gap-3 p-5">
          <div className="flex items-center justify-between"><h3 className="text-base">Recent activity</h3>{onSeeAll && data && data.transactions.length > 0 && <Button variant="ghost" size="sm" onPress={() => onSeeAll('activity')}>See all <ArrowRightIcon /></Button>}</div>
          {data === null ? <Skeleton className="h-32 rounded-md" /> : data.transactions.length === 0 ? <p className="text-sm text-muted">No activity yet.</p> : (
            <ul className="flex flex-col">
              {data.transactions.filter((t) => !t.failed).slice(0, 6).map((t) => (
                <li key={t.id} className="flex items-center gap-3 border-t border-separator py-2.5 first:border-t-0">
                  <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-surface-secondary">{t.internal ? <ArrowsLeftRightIcon /> : t.direction === 'in' ? <ArrowDownLeftIcon className="text-success" /> : <ArrowUpRightIcon className="text-danger" />}</span>
                  <span className="flex min-w-0 flex-1 flex-col leading-tight"><span className="truncate text-sm font-semibold">{t.internal ? 'Transfer' : t.direction === 'in' ? 'Received' : 'Sent'} {t.kind === 'nft' ? `${t.asset_name} #${t.token_id}` : t.asset_symbol}</span><span className="truncate text-xs text-muted">{combined ? `${walletName(t.wallet_id)} · ` : ''}{t.counterparty ? shortAddress(t.counterparty) : ''}</span></span>
                  <span className="flex flex-col items-end leading-tight tabular-nums"><span className={`text-sm font-semibold ${t.direction === 'in' ? 'text-success' : ''}`}>{t.kind === 'nft' ? '1 NFT' : `${t.direction === 'in' ? '+' : '−'}${amount(t.amount, t.asset_symbol)}`}</span><span className="text-xs text-muted">{shortDateYear(t.ts)}</span></span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="gap-3 p-5">
          <div className="flex items-center justify-between"><span className="flex items-center gap-2"><ImagesIcon /><h3 className="text-base">NFTs</h3></span>{onSeeAll && data && data.nfts.length > 0 && <Button variant="ghost" size="sm" onPress={() => onSeeAll('nfts')}>See all{data.nfts.length > 4 ? ` (${data.nfts.length})` : ''} <ArrowRightIcon /></Button>}</div>
          {data === null ? <Skeleton className="h-32 rounded-md" /> : data.nfts.length === 0 ? <div className="flex flex-col items-center gap-2 py-6 text-center"><YareMark size={40} /><p className="text-sm text-muted">No NFTs here.</p></div> : (
            <div className="grid grid-cols-4 gap-3">{data.nfts.slice(0, 8).map((n) => <NftTile key={n.id} image={n.image_url} name={n.name} collection={n.collection} />)}</div>
          )}
        </Card>
      </div>
      {summary && summary.unpriced > 0 && (
        <MonsterNote title={`${summary.unpriced} movement${summary.unpriced === 1 ? '' : 's'} left out of these figures`}>
          No price was known for that token or that day, so they are shown in Activity but not counted here. Transfers between your own wallets are left out as well, since they are not money in or out.
        </MonsterNote>
      )}
    </div>
  );
}

export function WalletStatusLine({ wallet }: { wallet: Wallet }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
      <StatusChip tone={wallet.status === 'ready' ? 'success' : wallet.status === 'error' ? 'danger' : wallet.status === 'syncing' ? 'accent' : 'default'}>{wallet.status === 'ready' ? 'Up to date' : wallet.status === 'error' ? 'Could not read' : wallet.status === 'syncing' ? 'Reading the chain' : 'Not read yet'}</StatusChip>
      {wallet.sync_error && <span className="text-danger">{wallet.sync_error}</span>}
    </div>
  );
}
