import { Card } from '@heroui/react';
import { Notice, YareMark } from '../yare';

/** Shown instead of the app when a VITE_ variable is absent or still a placeholder. */
export function ConfigMissing({ missing }: { missing: string[] }) {
  return (
    <div className="yare-signin">
      <Card className="yare-signin__card">
        <YareMark size={48} />
        <h1 className="text-2xl">Almost there</h1>
        <p className="text-sm text-muted">
          This deployment is missing configuration. Set the variables below in your environment and rebuild. The README explains where each value comes from.
        </p>
        <Notice status="warning" title="Missing configuration">
          <ul className="list-disc ps-4">
            {missing.map((m) => <li key={m}><code>{m}</code></li>)}
          </ul>
        </Notice>
      </Card>
    </div>
  );
}
