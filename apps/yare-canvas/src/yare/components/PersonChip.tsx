/** Six colours that tell people apart: signers on a document, attendees in a meeting, owners of a task. */
export const personColours = ['#2D7FF9', '#F2545B', '#2BB673', '#8B5CF6', '#E0A800', '#0EA5A5'] as const;

export const personColour = (index: number) => personColours[((index % personColours.length) + personColours.length) % personColours.length]!;

export function initialsOf(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '?';
}

export interface PersonChipProps {
  name: string;
  /** Second line: email, company, role. */
  detail?: string;
  /** Index into personColours, or a CSS colour. */
  colour?: number | string;
  size?: 'sm' | 'md';
  className?: string;
}

/** A coloured initials disc with the name beside it. The colour follows the person across the app. */
export function PersonChip({ name, detail, colour = 0, size = 'md', className }: PersonChipProps) {
  const bg = typeof colour === 'number' ? personColour(colour) : colour;
  return (
    <span className={['yare-person', className].filter(Boolean).join(' ')} data-size={size}>
      <span className="yare-person__disc" style={{ background: bg }} aria-hidden="true">{initialsOf(name)}</span>
      <span className="yare-person__text">
        <span className="yare-person__name">{name}</span>
        {detail && <span className="yare-person__detail">{detail}</span>}
      </span>
    </span>
  );
}
