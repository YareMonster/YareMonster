import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

export interface DonutSlice { id: string; label: string; value: number; colour?: string }

export interface DonutChartProps {
  slices: DonutSlice[];
  formatValue?: (v: number) => string;
  size?: number;
  /** What sits in the hole: a total, a label. */
  centre?: React.ReactNode;
  className?: string;
  'aria-label'?: string;
}

const palette = ['#2D7FF9', '#F2545B', '#2BB673', '#8B5CF6', '#E0A800', '#0EA5A5', '#94A3B8'];

/** Shares of a whole: holdings by asset, time by category. Hover a slice for its value. */
export function DonutChart({ slices, formatValue = (v) => String(v), size = 180, centre, className, 'aria-label': ariaLabel }: DonutChartProps) {
  return (
    <div className={['yare-donut', className].filter(Boolean).join(' ')} style={{ width: size, height: size }} role="img" aria-label={ariaLabel ?? 'Shares'}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={slices} dataKey="value" nameKey="label" innerRadius="68%" outerRadius="100%" paddingAngle={2} stroke="var(--surface)" strokeWidth={2} isAnimationActive={false}>
            {slices.map((s, i) => <Cell key={s.id} fill={s.colour ?? palette[i % palette.length]} />)}
          </Pie>
          <Tooltip content={({ active, payload }) => {
            const s = payload?.[0]?.payload as DonutSlice | undefined;
            if (!active || !s) return null;
            return <div className="yare-chart__tip"><div className="yare-chart__tip-value">{formatValue(s.value)}</div><div className="yare-chart__tip-label">{s.label}</div></div>;
          }} />
        </PieChart>
      </ResponsiveContainer>
      {centre && <div className="yare-donut__centre">{centre}</div>}
    </div>
  );
}
