import { Card } from '@heroui/react';
import { ChartBarIcon } from '@phosphor-icons/react';
import { ConnectionsPanel, MonsterNote } from '../yare';

/** The shared Connections page plus what Yare Links adds: how visits are counted. */
export function ConnectionsPage({ supabase }: { supabase: { url: string; publishableKey: string } }) {
  return (
    <ConnectionsPanel appLabel="Yare Links" supabase={{ ...supabase, isDefault: true }} repoUrl={null}>
      <Card className="gap-5 p-5 lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex items-center gap-3">
            <ChartBarIcon size={28} />
            <div>
              <h3 className="text-lg">Visits</h3>
              <p className="text-sm text-muted">Counted by your own database. No cookies, no third party.</p>
            </div>
          </div>
          <p className="text-sm text-muted">Every view and every press on a block becomes one row: the site the visitor came from, the country Cloudflare reports when the page is served through it, and whether it was a phone, a tablet or a computer. Nothing that points at a person is stored, so there is nothing to ask consent for.</p>
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-3 border-t border-border pt-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-5">
          <MonsterNote title="Mind your Supabase storage">
            Pictures go to your storage, videos and wallpapers too, up to 50 MB each. The free Supabase plan allows 1 GB in total across every Yare Monster app in your project. A short clip is fine; a film is not.
          </MonsterNote>
        </div>
      </Card>
    </ConnectionsPanel>
  );
}
