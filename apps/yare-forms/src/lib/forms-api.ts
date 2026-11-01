import type { AnswerValue, Block, BlockType, Client, Form, FormResponse } from './supabase';
import { kindOf, starterBlocks } from './blocks';
import { slugFromTitle } from './slug';

function fail(error: { message: string } | null): asserts error is null {
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------- forms (owner)
export async function listForms(db: Client): Promise<Form[]> {
  const { data, error } = await db.from('yareforms_forms').select('*').order('updated_at', { ascending: false });
  fail(error);
  return data;
}

export async function getForm(db: Client, id: string): Promise<{ form: Form; blocks: Block[] }> {
  const [f, b] = await Promise.all([
    db.from('yareforms_forms').select('*').eq('id', id).single(),
    db.from('yareforms_blocks').select('*').eq('form_id', id).order('position'),
  ]);
  fail(f.error); fail(b.error);
  return { form: f.data, blocks: b.data };
}

export async function createForm(db: Client, title = 'Untitled form'): Promise<Form> {
  const { data: form, error } = await db.from('yareforms_forms').insert({ title, slug: slugFromTitle(title) }).select().single();
  fail(error);
  const rows = starterBlocks().map((b, i) => ({ ...b, form_id: form.id, position: i }));
  const { error: e2 } = await db.from('yareforms_blocks').insert(rows);
  fail(e2);
  return form;
}

export async function updateForm(db: Client, id: string, patch: Partial<Pick<Form, 'title' | 'slug' | 'theme' | 'logo_path' | 'settings'>>): Promise<Form> {
  const { data, error } = await db.from('yareforms_forms').update(patch).eq('id', id).select().single();
  fail(error);
  return data;
}

export async function setPublished(db: Client, id: string, published: boolean): Promise<Form> {
  const { data, error } = await db.from('yareforms_forms')
    .update({ status: published ? 'published' : 'draft', published_at: published ? new Date().toISOString() : null })
    .eq('id', id).select().single();
  fail(error);
  return data;
}

export async function deleteForm(db: Client, id: string): Promise<void> {
  const { error } = await db.from('yareforms_forms').delete().eq('id', id);
  fail(error);
}

// ---------------------------------------------------------------- blocks (owner)
export async function addBlock(db: Client, formId: string, type: BlockType, position: number): Promise<Block> {
  const d = kindOf(type).defaults;
  const { data, error } = await db.from('yareforms_blocks')
    .insert({ form_id: formId, type, position, title: d.title, description: d.description, options: d.options, required: kindOf(type).isQuestion })
    .select().single();
  fail(error);
  return data;
}

export async function updateBlock(db: Client, id: string, patch: Partial<Pick<Block, 'title' | 'description' | 'required' | 'options' | 'type'>>): Promise<Block> {
  const { data, error } = await db.from('yareforms_blocks').update(patch).eq('id', id).select().single();
  fail(error);
  return data;
}

export async function deleteBlock(db: Client, id: string): Promise<void> {
  const { error } = await db.from('yareforms_blocks').delete().eq('id', id);
  fail(error);
}

/** Writes the given order back as positions. */
export async function reorderBlocks(db: Client, orderedIds: string[]): Promise<void> {
  await Promise.all(orderedIds.map((id, i) => db.from('yareforms_blocks').update({ position: i }).eq('id', id)));
}

// ---------------------------------------------------------------- images (owner)
export async function uploadImage(db: Client, formId: string, kind: 'logo' | string, file: File): Promise<string> {
  const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
  const path = `yare-forms/${formId}/${kind}-${Date.now()}.${ext}`;
  const { error } = await db.storage.from('yare-images').upload(path, file, { upsert: true, contentType: file.type || undefined });
  fail(error);
  return path;
}

export async function removeImage(db: Client, path: string): Promise<void> {
  await db.storage.from('yare-images').remove([path]);
}

// ---------------------------------------------------------------- responses (owner)
export async function listResponses(db: Client, formId: string): Promise<FormResponse[]> {
  const { data, error } = await db.from('yareforms_responses').select('*').eq('form_id', formId).order('started_at', { ascending: false });
  fail(error);
  return data;
}

export async function deleteResponse(db: Client, id: string): Promise<void> {
  const { error } = await db.from('yareforms_responses').delete().eq('id', id);
  fail(error);
}

// ---------------------------------------------------------------- public (anyone)
export async function getPublicForm(db: Client, slug: string): Promise<{ form: Form; blocks: Block[] } | null> {
  const { data: form, error } = await db.from('yareforms_forms').select('*').eq('slug', slug).maybeSingle();
  fail(error);
  if (!form) return null;
  const { data: blocks, error: e2 } = await db.from('yareforms_blocks').select('*').eq('form_id', form.id).order('position');
  fail(e2);
  return { form, blocks };
}

export async function startResponse(db: Client, slug: string): Promise<{ id: string; token: string }> {
  const { data, error } = await db.rpc('yareforms_start_response', { p_slug: slug });
  fail(error);
  const row = data?.[0];
  if (!row) throw new Error('This form is not available.');
  return { id: row.response_id, token: row.token };
}

export async function saveAnswer(db: Client, response: { id: string; token: string }, blockId: string | null, value: AnswerValue | null, complete = false): Promise<void> {
  const { error } = await db.rpc('yareforms_save_answer', { p_response_id: response.id, p_token: response.token, p_block_id: blockId, p_value: value, p_complete: complete });
  fail(error);
}
