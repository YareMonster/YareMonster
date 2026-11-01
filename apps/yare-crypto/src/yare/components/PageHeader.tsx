import type { ReactNode } from 'react';
import { Breadcrumbs } from '@heroui/react';

export interface Crumb {
  label: string;
  href?: string;
}

/** Breadcrumbs on the left, actions on the right. Goes in the shell's top bar. */
export function PageHeader({ crumbs, actions }: { crumbs: Crumb[]; actions?: ReactNode }) {
  return (
    <div className="yare-page-header">
      <div className="yare-page-header__crumbs">
        <Breadcrumbs aria-label="Where you are">
          {crumbs.map((c, i) => (
            <Breadcrumbs.Item key={`${c.label}-${i}`} href={c.href}>
              {c.label}
            </Breadcrumbs.Item>
          ))}
        </Breadcrumbs>
      </div>
      {actions && <div className="yare-page-header__actions">{actions}</div>}
    </div>
  );
}
