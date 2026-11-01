import { Button } from '@heroui/react';
import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react';

export interface PaginationProps {
  /** Zero-based page. */
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
  /** What one row is, for the summary: "movements", "responses". */
  noun?: string;
  className?: string;
}

/** Under a long table: "1 to 50 of 1,240 movements", previous, next. */
export function Pagination({ page, pageSize, total, onChange, noun = 'rows', className }: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);
  return (
    <div className={['yare-pagination', className].filter(Boolean).join(' ')}>
      <span className="yare-pagination__summary">{total === 0 ? `No ${noun}` : `${from.toLocaleString()} to ${to.toLocaleString()} of ${total.toLocaleString()} ${noun}`}</span>
      <div className="yare-pagination__controls">
        <Button variant="outline" size="sm" isIconOnly aria-label="Previous page" isDisabled={page <= 0} onPress={() => onChange(page - 1)}><CaretLeftIcon /></Button>
        <span className="yare-pagination__page">Page {Math.min(page + 1, pages)} of {pages}</span>
        <Button variant="outline" size="sm" isIconOnly aria-label="Next page" isDisabled={page >= pages - 1} onPress={() => onChange(page + 1)}><CaretRightIcon /></Button>
      </div>
    </div>
  );
}
