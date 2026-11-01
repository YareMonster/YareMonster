import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { Spinner } from '@heroui/react';
import { downloadDocument, getEnvelope, type EnvelopeBundle } from '../../lib/sign-api';
import { useEnvelopes } from '../EnvelopesContext';
import { SigningView, type SigningData } from '../../public/SigningView';
import { fullName } from '../status';

/** What a participant will see, with every field as a placeholder. Opens in a new tab from the editor. */
export function PreviewPage() {
  const { id = '' } = useParams();
  const { db } = useEnvelopes();
  const [data, setData] = useState<SigningData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const b: EnvelopeBundle = await getEnvelope(db, id);
        const bytes = new Map<string, ArrayBuffer>();
        await Promise.all(b.documents.map(async (d) => bytes.set(d.id, await downloadDocument(db, d))));
        if (cancelled) return;
        setData({
          envelope: { ...b.envelope, sender: 'You' },
          me: null,
          documents: b.documents,
          participants: b.participants.map((p, i) => ({ id: p.id, role: p.role, name: fullName(p), status: p.status, position: p.position, signed_at: p.signed_at, colour: i })),
          fields: b.fields,
          bytes,
        });
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load the preview.');
      }
    })();
    return () => { cancelled = true; };
  }, [db, id]);

  useEffect(() => { document.title = data ? `Preview: ${data.envelope.title}` : 'Preview'; }, [data]);

  if (error) return <div className="grid min-h-dvh place-items-center p-6 text-sm text-danger">{error}</div>;
  if (!data) return <div className="grid min-h-dvh place-items-center" aria-busy="true"><Spinner aria-label="Loading" /></div>;
  return <SigningView data={data} preview onSign={async () => undefined} />;
}
