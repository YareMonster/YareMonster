import { Button, Card } from '@heroui/react';
import { ArrowSquareOutIcon, PencilSimpleIcon } from '@phosphor-icons/react';
import { StatusChip, appLogoSrc, type CatalogEntry } from '../yare';
import type { LauncherApp } from '../lib/supabase';

/** One app of the collection: its lockup, the website's one-liner, the status the operator set, and the address once it has one. */
export function AppCard({ entry, row, onEdit }: { entry: CatalogEntry; row?: LauncherApp; onEdit: () => void }) {
  const setUp = row?.status === 'set_up';
  return (
    <Card className="gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <img src={appLogoSrc(entry.slug)} alt="" className="h-12 w-auto" draggable={false} />
        <StatusChip tone={setUp ? 'success' : 'default'}>{setUp ? 'Set up' : 'Not set up'}</StatusChip>
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <h3 className="text-lg">{entry.name}</h3>
        <p className="text-sm text-muted">{entry.line}</p>
        {row?.note && <p className="text-sm text-muted">{row.note}</p>}
      </div>
      <div className="mt-auto grid grid-cols-2 gap-2">
        <Button variant="outline" fullWidth className={row?.url ? '' : 'col-span-2'} onPress={onEdit}><PencilSimpleIcon /> {row ? 'Edit' : 'Set status'}</Button>
        {row?.url && (
          <Button variant="secondary" fullWidth onPress={() => window.open(row.url!, '_blank', 'noopener,noreferrer')}>
            Open <ArrowSquareOutIcon />
          </Button>
        )}
      </div>
    </Card>
  );
}
