/**
 * Public configuration, read at build time from VITE_* variables (see .env.example).
 * Missing values are reported on screen instead of crashing.
 */
export interface PublicEnv {
  supabaseUrl: string;
  supabasePublishableKey: string;
}

export function readEnv(): { ok: true; env: PublicEnv } | { ok: false; missing: string[] } {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
  const missing: string[] = [];
  if (!supabaseUrl || supabaseUrl.includes('YOUR-PROJECT-REF')) missing.push('VITE_SUPABASE_URL');
  if (!supabasePublishableKey || supabasePublishableKey.includes('REPLACE_ME')) missing.push('VITE_SUPABASE_PUBLISHABLE_KEY');
  if (missing.length) return { ok: false, missing };
  return { ok: true, env: { supabaseUrl: supabaseUrl!, supabasePublishableKey: supabasePublishableKey! } };
}
