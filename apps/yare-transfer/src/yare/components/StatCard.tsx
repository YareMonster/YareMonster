import type { ReactNode } from 'react';
import { Card, Skeleton } from '@heroui/react';
import { TrendDownIcon, TrendUpIcon } from '@phosphor-icons/react';

export interface DeltaProps {
  /** The change as a fraction: 0.184 for +18.4%. */
  ratio?: number | null;
  /** The change as an amount, already formatted: "+$1,927.32". */
  amount?: string | null;
  className?: string;
}

/** Green up, red down, grey when flat or unknown. */
export function Delta({ ratio, amount, className }: DeltaProps) {
  if ((ratio === null || ratio === undefined) && !amount) return null;
  const dir = ratio === null || ratio === undefined || ratio === 0 ? 'flat' : ratio > 0 ? 'up' : 'down';
  return (
    <span className={['yare-delta', className].filter(Boolean).join(' ')} data-dir={dir}>
      {dir === 'up' && <TrendUpIcon weight="bold" />}{dir === 'down' && <TrendDownIcon weight="bold" />}
      {ratio !== null && ratio !== undefined && <span>{ratio > 0 ? '+' : ''}{(ratio * 100).toFixed(1)}%</span>}
      {amount && <span>{amount}</span>}
    </span>
  );
}

export interface StatCardProps {
  label: string;
  /** Null while loading. */
  value: string | null;
  detail?: ReactNode;
  delta?: DeltaProps;
  /** Something on the right: a sparkline, a range picker. */
  aside?: ReactNode;
  /** Bigger number, for the headline figure. */
  size?: 'md' | 'lg';
  className?: string;
}

/** A number with a name: forms published, signatures collected, net worth. Every dashboard uses it. */
export function StatCard({ label, value, detail, delta, aside, size = 'md', className }: StatCardProps) {
  return (
    <Card className={['yare-stat', className].filter(Boolean).join(' ')} data-size={size}>
      <div className="yare-stat__head">
        <div className="yare-stat__label">{label}</div>
        {aside}
      </div>
      {value === null ? <Skeleton className={size === 'lg' ? 'h-10 w-40 rounded-md' : 'h-8 w-16 rounded-md'} /> : <div className="yare-stat__value">{value}</div>}
      {(delta || detail) && (
        <div className="yare-stat__foot">
          {delta && <Delta {...delta} />}
          {detail && <span className="yare-stat__detail">{detail}</span>}
        </div>
      )}
    </Card>
  );
}
