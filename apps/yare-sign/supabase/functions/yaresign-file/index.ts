// Yare Sign · Edge Function yaresign-file
//
// Hands a participant a short-lived link to one of the envelope's PDFs. The documents live in the
// private bucket "yare-sign", so the browser cannot read them with the publishable key alone. This
// function checks the participant's token, then signs a URL good for ten minutes.
//
// Deploy: npx supabase functions deploy yaresign-file --project-ref <ref>
// Nothing to configure: it uses the project's own service key, which Supabase provides to functions.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { cors, json } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405);
  let body: { token?: string; document_id?: string };
  try { body = await req.json(); } catch { return json({ error: 'Send JSON.' }, 400); }
  const { token, document_id } = body;
  if (!token || !document_id || !/^[0-9a-f-]{36}$/i.test(token)) return json({ error: 'This link is not valid.' }, 400);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: p } = await admin.from('yaresign_participants').select('id, envelope_id').eq('token', token).maybeSingle();
  if (!p) return json({ error: 'This link is not valid.' }, 404);
  const { data: e } = await admin.from('yaresign_envelopes').select('status').eq('id', p.envelope_id).single();
  if (!e || e.status === 'draft') return json({ error: 'This document has not been sent yet.' }, 403);
  const { data: d } = await admin.from('yaresign_documents').select('storage_path').eq('id', document_id).eq('envelope_id', p.envelope_id).maybeSingle();
  if (!d) return json({ error: 'Unknown document.' }, 404);
  const { data: signed, error } = await admin.storage.from('yare-sign').createSignedUrl(d.storage_path, 600);
  if (error || !signed) return json({ error: 'Could not open the document.' }, 500);
  return json({ url: signed.signedUrl });
});
