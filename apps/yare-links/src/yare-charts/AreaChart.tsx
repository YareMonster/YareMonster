import { Area, AreaChart as ReArea, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export interface AreaPoint { x: number | string; y: number }

export interface AreaChartProps {
  data: AreaPoint[];
  /** Formats a value for the axis and the tooltip, e.g. a currency. */
  formatValue?: (v: number) => string;
  /** Formats a point's x for the axis and the tooltip, e.g. a short date. */
  formatLabel?: (x: number | string) => string;
  /** Pixels, or '100%' to fill a parent that has a height. */
  height?: number | string;
  /** A CSS colour; the Yare accent by default. */
  colour?: string;
  /** Hide axes and grid: a big quiet curve. */
  minimal?: boolean;
  className?: string;
  'aria-label'?: string;
}

const same = (v: number) => String(v);

/** The one line chart every dashboard uses: a soft gradient under a single curve, Yare tokens, a quiet tooltip. */
export function AreaChart({ data, formatValue = same, formatLabel = (x) => String(x), height = 240, colour = 'var(--accent)', minimal, className, 'aria-label': ariaLabel }: AreaChartProps) {
  const id = `yare-area-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <div className={['yare-chart', className].filter(Boolean).join(' ')} style={{ height }} role="img" aria-label={ariaLabel ?? 'Chart'}>
      <ResponsiveContainer width="100%" height="100%">
        <ReArea data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colour} stopOpacity={0.28} />
              <stop offset="100%" stopColor={colour} stopOpacity={0} />
            </linearGradient>
          </defs>
          {!minimal && <CartesianGrid vertical={false} stroke="var(--separator)" strokeDasharray="0" />}
          {!minimal && <XAxis dataKey="x" tickFormatter={(x) => formatLabel(x)} tickLine={false} axisLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} minTickGap={32} />}
          {!minimal && <YAxis tickFormatter={(v) => formatValue(Number(v))} tickLine={false} axisLine={false} width={64} tick={{ fill: 'var(--muted)', fontSize: 11 }} domain={['auto', 'auto']} />}
          <Tooltip
            cursor={{ stroke: 'var(--border)', strokeWidth: 1 }}
            content={({ active, payload }) => {
              const p = payload?.[0]?.payload as AreaPoint | undefined;
              if (!active || !p) return null;
              return (
                <div className="yare-chart__tip">
                  <div className="yare-chart__tip-value">{formatValue(p.y)}</div>
                  <div className="yare-chart__tip-label">{formatLabel(p.x)}</div>
                </div>
              );
            }}
          />
          <Area type="monotone" dataKey="y" stroke={colour} strokeWidth={2.25} fill={`url(#${id})`} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface)' }} isAnimationActive={false} />
        </ReArea>
      </ResponsiveContainer>
    </div>
  );
}
