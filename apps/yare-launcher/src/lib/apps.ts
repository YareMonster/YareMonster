import type { AppStatus, Client, LauncherApp, LauncherSettings, LauncherSlug } from './supabase';

export interface AppInput {
  status: AppStatus;
  url: string | null;
  note: string | null;
}

/** Data access. Row-level security scopes every query to the signed-in owner. */
export async function listApps(db: Client): Promise<LauncherApp[]> {
  const { data, error } = await db.from('launcher_apps').select('*').order('position').order('created_at');
  if (error) throw new Error(error.message);
  return data;
}

/** Creates or updates the one row an owner has for an app. */
export async function saveApp(db: Client, slug: LauncherSlug, existingId: string | undefined, input: AppInput): Promise<LauncherApp> {
  const query = existingId
    ? db.from('launcher_apps').update(input).eq('id', existingId)
    : db.from('launcher_apps').insert({ slug, ...input, position: 0 });
  const { data, error } = await query.select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function getSettings(db: Client): Promise<LauncherSettings | null> {
  const { data, error } = await db.from('launcher_settings').select('*').maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export type SettingsInput = Partial<Pick<LauncherSettings, 'github_repo_url' | 'supabase_url' | 'supabase_publishable_key'>>;

export async function saveSettings(db: Client, input: SettingsInput): Promise<LauncherSettings> {
  const { data, error } = await db.from('launcher_settings').upsert(input, { onConflict: 'owner_id' }).select().single();
  if (error) throw new Error(error.message);
  return data;
}
