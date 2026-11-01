import type { ReactNode } from 'react';
import { Card } from '@heroui/react';

export interface DataTableColumn<Row> {
  id: string;
  header: ReactNode;
  cell: (row: Row) => ReactNode;
  align?: 'start' | 'end';
  /** Tabular numbers and no wrapping, for counts and dates. */
  numeric?: boolean;
  /** Hint for screen readers when the header is an icon or empty. */
  label?: string;
  className?: string;
}

export interface DataTableProps<Row> {
  columns: DataTableColumn<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  /** Shown inside the card when there are no rows. */
  empty?: ReactNode;
  caption?: string;
  className?: string;
}

/**
 * The one table every Yare Monster app uses: a card with a quiet header row, hairline row separators,
 * horizontal scroll when the columns do not fit. Content decides the columns; this decides the look.
 */
export function DataTable<Row>({ columns, rows, rowKey, empty, caption, className }: DataTableProps<Row>) {
  return (
    <Card className={['yare-table', className].filter(Boolean).join(' ')}>
      <div className="yare-table__scroll">
        <table className="yare-table__table">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.id} scope="col" className={[c.align === 'end' ? 'yare-table__end' : '', c.className ?? ''].join(' ')}>
                  {c.header || (c.label ? <span className="sr-only">{c.label}</span> : null)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={rowKey(row)}>
                {columns.map((c) => (
                  <td key={c.id} className={[c.align === 'end' ? 'yare-table__end' : '', c.numeric ? 'yare-table__num' : '', c.className ?? ''].join(' ')}>
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && empty && (
              <tr><td colSpan={columns.length} className="yare-table__empty">{empty}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
