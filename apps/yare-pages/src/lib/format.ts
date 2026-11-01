const n = new Intl.NumberFormat();
const short = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 });
export const num = (v: number | null | undefined) => (v === null || v === undefined ? '–' : n.format(v));
export const numShort = (v: number) => short.format(v);
export const shortDate = (iso: string | number) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
export const relativeTime = (iso: string | null) => {
  if (!iso) return 'never';
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
};
