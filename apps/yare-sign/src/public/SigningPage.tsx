import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { Spinner } from '@heroui/react';
import { PoweredByYare, YareMark } from '../yare';
import type { Client } from '../lib/supabase';
import { email, openSigning, signerDocumentUrl, submitSignature } from '../lib/sign-api';
import { SigningView, type SigningData } from './SigningView';
import './signing.css';

/** /s/<token>: a participant's page. Loads everything through the token, never through the tables. */
export function SigningPage({ db }: { db: Client }) {
  const { token = '' } = useParams();
  const [data, setData] = useState<SigningData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = await openSigning(db, token);
        const bytes = new Map<string, ArrayBuffer>();
        await Promise.all(p.documents.map(async (d) => {
          const url = await signerDocumentUrl(db, token, d.id);
          const res = await fetch(url);
          if (!res.ok) throw new Error('Could not open the document.');
          bytes.set(d.id, await res.arrayBuffer());
        }));
        if (cancelled) return;
        setData({
          envelope: p.envelope,
          me: p.me,
          documents: p.documents,
          participants: p.participants.map((q, i) => ({ id: q.id, role: q.role, name: `${q.first_name} ${q.last_name}`.trim() || 'Unnamed', status: q.status, position: q.position, signed_at: q.signed_at, colour: i })),
          fields: p.fields,
          bytes,
        });
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'This link does not work.');
      }
    })();
    return () => { cancelled = true; };
  }, [db, token]);

  useEffect(() => { document.title = data ? `Sign: ${data.envelope.title}` : 'Sign'; }, [data]);

  if (error) {
    return (
      <div className="ysg">
        <main className="grid flex-1 place-items-center p-6 text-center">
          <div className="flex max-w-md flex-col items-center gap-3">
            <YareMark size={64} />
            <h1 className="text-2xl">This link doesn’t open</h1>
            <p className="text-sm text-muted">{error}</p>
          </div>
        </main>
        <PoweredByYare />
      </div>
    );
  }
  if (!data) return <div className="grid min-h-dvh place-items-center" aria-busy="true"><Spinner aria-label="Loading" /></div>;

  return (
    <SigningView
      data={data}
      onSign={async (values, typedName) => {
        const r = await submitSignature(db, token, values, typedName);
        // Tell the next person, and the owner. Best effort: the signature is already recorded.
        email(db, { action: 'advance', token }).catch(() => undefined);
        return r;
      }}
    />
  );
}
