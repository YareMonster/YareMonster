export interface RangeOption<K extends string = string> { key: K; label: string }

export interface RangeTabsProps<K extends string = string> {
  options: RangeOption<K>[];
  value: K;
  onChange: (key: K) => void;
  'aria-label'?: string;
  className?: string;
}

/** The small pill group that picks a period: 7D, 1M, 1Y. Lives in a chart's corner. */
export function RangeTabs<K extends string = string>({ options, value, onChange, 'aria-label': ariaLabel = 'Period', className }: RangeTabsProps<K>) {
  return (
    <div className={['yare-range', className].filter(Boolean).join(' ')} role="radiogroup" aria-label={ariaLabel}>
      {options.map((o) => (
        <button key={o.key} type="button" role="radio" aria-checked={o.key === value} className="yare-range__pill" onClick={() => onChange(o.key)}>{o.label}</button>
      ))}
    </div>
  );
}
