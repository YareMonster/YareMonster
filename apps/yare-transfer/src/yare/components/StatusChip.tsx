import { Chip } from '@heroui/react';

export type StatusTone = 'success' | 'accent' | 'warning' | 'default' | 'danger';

/** A soft chip with a coloured dot: Published, Draft, Pending, Archived. */
export function StatusChip({ tone = 'default', children }: { tone?: StatusTone; children: React.ReactNode }) {
  return (
    <Chip color={tone} variant="soft" size="lg">
      <span className="yare-status-dot" aria-hidden="true" />
      <Chip.Label>{children}</Chip.Label>
    </Chip>
  );
}
