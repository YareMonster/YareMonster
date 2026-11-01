import type { StatusTone } from '../yare';
import type { Transfer } from '../lib/supabase';

export type LinkState = 'draft' | 'live' | 'expired';
export function linkState(t: Transfer): LinkState {
  if (t.status !== 'published') return 'draft';
  return t.expires_at && new Date(t.expires_at).getTime() > Date.now() ? 'live' : 'expired';
}
export const linkTone: Record<LinkState, StatusTone> = { draft: 'default', live: 'success', expired: 'warning' };
export const linkLabel: Record<LinkState, string> = { draft: 'Draft', live: 'Live', expired: 'Expired' };

/** "3 days left", "in 5 hours", "expired". */
export function timeLeft(t: Transfer): string {
  if (!t.expires_at) return '–';
  const ms = new Date(t.expires_at).getTime() - Date.now();
  if (ms <= 0) return 'expired';
  const h = Math.round(ms / 3600000);
  if (h < 1) return 'less than an hour left';
  if (h < 48) return `${h} hour${h === 1 ? '' : 's'} left`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? '' : 's'} left`;
}
