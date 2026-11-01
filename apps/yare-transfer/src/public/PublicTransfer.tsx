import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { Spinner, toast } from '@heroui/react';
import { zipSync } from 'fflate';
import { PoweredByYare, YareMark } from '../yare';
import type { Client, OpenTransfer } from '../lib/supabase';
import { imageUrl } from '../lib/supabase';
import { checkPassword, fileUrl, openTransfer } from '../lib/transfer-api';
import { TransferScreen, type ScreenFile } from './TransferScreen';
import '../yare/public-page.css';

/** /t/<slug>: the recipient's page. Files come through the function, never from the bucket directly. */
export function PublicTransfer({ db }: { db: Client }) {
  const { slug = '' } = useParams();
  const [params] = useSearchParams();
  const preview = params.has('preview');
  const [data, setData] = useState<OpenTransfer | null | undefined>(undefined);
  const [password, setPassword] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => { openTransfer(db, slug).then(setData).catch(() => setData(null)); }, [db, slug]);
  useEffect(() => { document.title = data?.title ?? 'Transfer'; }, [data]);

  if (data === undefined) return <div className="grid min-h-dvh place-items-center" aria-busy="true"><Spinner aria-label="Loading" /></div>;
  if (data === null) {
    return (
      <div className="yp" style={{ '--f-bg': '#f7f8fb', '--f-text': '#272d39', '--f-muted': '#6b7694' } as React.CSSProperties}>
        <main className="yp__main"><div className="yp__screen yp__closed items-center"><YareMark size={64} /><h1 className="yp__title">This link isn’t open</h1><p className="yp__desc">It may have expired, or the address may be wrong.</p></div></main>
        <PoweredByYare />
      </div>
    );
  }

  async function download(f: ScreenFile) {
    setBusy(f.id);
    try { const { url } = await fileUrl(db, slug, f.id, password ?? undefined); window.location.assign(url); }
    catch (err) { toast.danger(err instanceof Error ? err.message : 'Could not download.'); }
    finally { setBusy(null); }
  }

  async function downloadAll() {
    setBusy('all');
    try {
      const parts: Record<string, Uint8Array> = {};
      for (const f of data!.files) {
        const { url } = await fileUrl(db, slug, f.id, password ?? undefined);
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Could not fetch ${f.name}.`);
        parts[f.name] = new Uint8Array(await res.arrayBuffer());
      }
      const zip = zipSync(parts, { level: 0 });
      const blob = new Blob([zip as BlobPart], { type: 'application/zip' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${data!.title.replace(/[^\w\- ]+/g, '').trim() || 'files'}.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : 'Could not build the zip.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <TransferScreen
      data={{ title: data.title, body: data.body, theme: data.theme, buttonLabel: data.button_label, logoUrl: imageUrl(db, data.logo_path), imageUrl: imageUrl(db, data.image_path), expiresAt: data.expires_at, open: data.open, needsPassword: data.needs_password, files: data.files }}
      preview={preview}
      unlocked={!data.needs_password || password !== null}
      onUnlock={async (p) => { const ok = await checkPassword(db, slug, p); if (ok) setPassword(p); return ok; }}
      onDownload={download}
      onDownloadAll={downloadAll}
      busyId={busy}
    />
  );
}
