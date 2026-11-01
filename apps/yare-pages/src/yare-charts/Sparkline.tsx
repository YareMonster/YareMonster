import { Area, AreaChart, ResponsiveContainer } from 'recharts';

export interface SparklineProps {
  values: number[];
  /** Green for up, red for down, by default from first to last value. */
  colour?: string;
  height?: number;
  className?: string;
}

/** A tiny trend line for a table row or a stat card. No axes, no tooltip. */
export function Sparkline({ values, colour, height = 32, className }: SparklineProps) {
  const up = (values[values.length - 1] ?? 0) >= (values[0] ?? 0);
  const stroke = colour ?? (up ? 'var(--success)' : 'var(--danger)');
  const data = values.map((y, x) => ({ x, y }));
  return (
    <div className={['yare-sparkline', className].filter(Boolean).join(' ')} style={{ height }} aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
          <Area type="monotone" dataKey="y" stroke={stroke} strokeWidth={1.75} fill="transparent" dot={false} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
