import type { Client, Document, Envelope, Field, FieldType, PageSize, Participant, Settings, SignEvent, SigningPacket } from './supabase';
import { BUCKET } from './supabase';

function fail(error: { message: string } | null): asserts error is null {
  if (error) throw new Error(error.message);
}

export interface EnvelopeBundle { envelope: Envelope; documents: Document[]; participants: Participant[]; fields: Field[] }

// ---------------------------------------------------------------- envelopes (owner)
export async function listEnvelopes(db: Client): Promise<Envelope[]> {
  const { data, error } = await db.from('yaresign_envelopes').select('*').order('updated_at', { ascending: false });
  fail(error);
  return data;
}

export async function getEnvelope(db: Client, id: string): Promise<EnvelopeBundle> {
  const [e, d, p, f] = await Promise.all([
    db.from('yaresign_envelopes').select('*').eq('id', id).single(),
    db.from('yaresign_documents').select('*').eq('envelope_id', id).order('position'),
    db.from('yaresign_participants').select('*').eq('envelope_id', id).order('position'),
    db.from('yaresign_fields').select('*').eq('envelope_id', id).order('created_at'),
  ]);
  fail(e.error); fail(d.error); fail(p.error); fail(f.error);
  return { envelope: e.data, documents: d.data, participants: p.data, fields: f.data };
}

export async function createEnvelope(db: Client, title = 'Untitled document'): Promise<Envelope> {
  const { data, error } = await db.from('yaresign_envelopes').insert({ title }).select().single();
  fail(error);
  await db.from('yaresign_events').insert({ envelope_id: data.id, type: 'created' });
  return data;
}

export async function updateEnvelope(db: Client, id: string, patch: Partial<Pick<Envelope, 'title' | 'ordered' | 'message' | 'settings'>>): Promise<Envelope> {
  const { data, error } = await db.from('yaresign_envelopes').update(patch).eq('id', id).select().single();
  fail(error);
  return data;
}

/** Opens the envelope: checks it is complete, sets it to sent, makes every signer pending. */
export async function publishEnvelope(db: Client, id: string): Promise<Envelope> {
  const { error } = await db.rpc('yaresign_publish', { p_envelope_id: id });
  fail(error);
  const { data, error: e2 } = await db.from('yaresign_envelopes').select('*').eq('id', id).single();
  fail(e2);
  return data;
}

/** Cancels a sent envelope. Links stop working; nothing is deleted. */
export async function voidEnvelope(db: Client, id: string): Promise<Envelope> {
  const { data, error } = await db.from('yaresign_envelopes').update({ status: 'voided' }).eq('id', id).select().single();
  fail(error);
  await db.from('yaresign_events').insert({ envelope_id: id, type: 'voided' });
  return data;
}

export async function deleteEnvelope(db: Client, id: string, documents: Document[]): Promise<void> {
  if (documents.length) await db.storage.from(BUCKET).remove(documents.map((d) => d.storage_path));
  const { error } = await db.from('yaresign_envelopes').delete().eq('id', id);
  fail(error);
}

// ---------------------------------------------------------------- documents (owner)
export async function addDocument(db: Client, envelopeId: string, file: File, info: { pageCount: number; pageSizes: PageSize[] }, position: number): Promise<Document> {
  const id = crypto.randomUUID();
  const path = `${envelopeId}/${id}.pdf`;
  const { error } = await db.storage.from(BUCKET).upload(path, file, { contentType: 'application/pdf', upsert: false });
  fail(error);
  const { data, error: e2 } = await db.from('yaresign_documents')
    .insert({ id, envelope_id: envelopeId, name: file.name.replace(/\.pdf$/i, '') || 'Document', storage_path: path, page_count: info.pageCount, page_sizes: info.pageSizes, size_bytes: file.size, position })
    .select().single();
  if (e2) { await db.storage.from(BUCKET).remove([path]); throw new Error(e2.message); }
  return data;
}

export async function removeDocument(db: Client, doc: Document): Promise<void> {
  const { error } = await db.from('yaresign_documents').delete().eq('id', doc.id);
  fail(error);
  await db.storage.from(BUCKET).remove([doc.storage_path]);
}

/** The PDF bytes, for the owner. Signers go through the yaresign-file function instead. */
export async function downloadDocument(db: Client, doc: Pick<Document, 'storage_path'>): Promise<ArrayBuffer> {
  const { data, error } = await db.storage.from(BUCKET).download(doc.storage_path);
  fail(error);
  return data.arrayBuffer();
}

// ---------------------------------------------------------------- participants (owner)
export async function addParticipant(db: Client, envelopeId: string, position: number, role: Participant['role'] = 'signer'): Promise<Participant> {
  const { data, error } = await db.from('yaresign_participants').insert({ envelope_id: envelopeId, position, role }).select().single();
  fail(error);
  return data;
}

export async function updateParticipant(db: Client, id: string, patch: Partial<Pick<Participant, 'role' | 'first_name' | 'last_name' | 'email' | 'company' | 'job_title'>>): Promise<Participant> {
  const { data, error } = await db.from('yaresign_participants').update(patch).eq('id', id).select().single();
  fail(error);
  return data;
}

export async function deleteParticipant(db: Client, id: string): Promise<void> {
  const { error } = await db.from('yaresign_participants').delete().eq('id', id);
  fail(error);
}

export async function reorderParticipants(db: Client, orderedIds: string[]): Promise<void> {
  await Promise.all(orderedIds.map((id, i) => db.from('yaresign_participants').update({ position: i }).eq('id', id)));
}

/** The owner handed the link over by hand (or it was emailed): the participant is now "sent". */
export async function markSent(db: Client, participant: Participant): Promise<Participant> {
  if (participant.status !== 'pending') return participant;
  const { data, error } = await db.from('yaresign_participants').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', participant.id).select().single();
  fail(error);
  return data;
}

// ---------------------------------------------------------------- fields (owner)
export async function addField(db: Client, f: { envelopeId: string; documentId: string; participantId: string; page: number; type: FieldType; x: number; y: number; w: number; h: number }): Promise<Field> {
  const { data, error } = await db.from('yaresign_fields')
    .insert({ envelope_id: f.envelopeId, document_id: f.documentId, participant_id: f.participantId, page: f.page, type: f.type, x: f.x, y: f.y, w: f.w, h: f.h, required: true })
    .select().single();
  fail(error);
  return data;
}

export async function updateField(db: Client, id: string, patch: Partial<Pick<Field, 'participant_id' | 'page' | 'x' | 'y' | 'w' | 'h' | 'required' | 'label'>>): Promise<Field> {
  const { data, error } = await db.from('yaresign_fields').update(patch).eq('id', id).select().single();
  fail(error);
  return data;
}

export async function deleteField(db: Client, id: string): Promise<void> {
  const { error } = await db.from('yaresign_fields').delete().eq('id', id);
  fail(error);
}

// ---------------------------------------------------------------- events (owner)
export async function listEvents(db: Client, envelopeId: string): Promise<SignEvent[]> {
  const { data, error } = await db.from('yaresign_events').select('*').eq('envelope_id', envelopeId).order('created_at');
  fail(error);
  return data;
}

// ---------------------------------------------------------------- settings (owner)
export async function getSettings(db: Client): Promise<Settings | null> {
  const { data, error } = await db.from('yaresign_settings').select('*').maybeSingle();
  fail(error);
  return data;
}

export async function saveSettings(db: Client, patch: Partial<Pick<Settings, 'from_email' | 'sender_name' | 'app_url'>>): Promise<Settings> {
  const { data: user } = await db.auth.getUser();
  const ownerId = user.user?.id;
  if (!ownerId) throw new Error('Not signed in.');
  const { data, error } = await db.from('yaresign_settings').upsert({ owner_id: ownerId, ...patch }, { onConflict: 'owner_id' }).select().single();
  fail(error);
  return data;
}

// ---------------------------------------------------------------- email (Edge Function yaresign-send)
export type EmailAction =
  | { action: 'status' }
  | { action: 'test' }
  | { action: 'send'; envelope_id: string; participant_ids?: string[] }
  | { action: 'advance'; token: string };

export interface EmailResult { configured: boolean; sent?: number; from?: string; error?: string }

export async function email(db: Client, body: EmailAction): Promise<EmailResult> {
  const { data, error } = await db.functions.invoke<EmailResult>('yaresign-send', { body });
  if (error) throw new Error(await describeFunctionError(error));
  return data ?? { configured: false };
}

async function describeFunctionError(error: unknown): Promise<string> {
  const ctx = (error as { context?: Response }).context;
  if (ctx && typeof ctx.json === 'function') {
    try { const j = (await ctx.json()) as { error?: string }; if (j.error) return j.error; } catch { /* fall through */ }
  }
  return error instanceof Error ? error.message : 'The email function did not answer.';
}

// ---------------------------------------------------------------- signers (anyone with a token)
export async function openSigning(db: Client, token: string): Promise<SigningPacket> {
  const { data, error } = await db.rpc('yaresign_open', { p_token: token });
  fail(error);
  return data;
}

export async function submitSignature(db: Client, token: string, values: Record<string, string>, typedName: string): Promise<{ completed: boolean }> {
  const { data, error } = await db.rpc('yaresign_sign', { p_token: token, p_values: values, p_typed_name: typedName });
  fail(error);
  return data;
}

/** A short-lived address for one document, for a participant (Edge Function yaresign-file). */
export async function signerDocumentUrl(db: Client, token: string, documentId: string): Promise<string> {
  const { data, error } = await db.functions.invoke<{ url?: string; error?: string }>('yaresign-file', { body: { token, document_id: documentId } });
  if (error) throw new Error(await describeFunctionError(error));
  if (!data?.url) throw new Error(data?.error ?? 'Could not open the document.');
  return data.url;
}
