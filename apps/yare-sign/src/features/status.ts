import type { StatusTone } from '../yare';
import type { EnvelopeStatus, FieldType, ParticipantStatus } from '../lib/supabase';

export function envelopeTone(s: EnvelopeStatus): StatusTone {
  return s === 'completed' ? 'success' : s === 'sent' ? 'accent' : s === 'voided' ? 'danger' : 'default';
}
export function envelopeLabel(s: EnvelopeStatus): string {
  return s === 'completed' ? 'Completed' : s === 'sent' ? 'Out for signature' : s === 'voided' ? 'Cancelled' : 'Draft';
}
export function participantTone(s: ParticipantStatus): StatusTone {
  return s === 'signed' ? 'success' : s === 'viewed' ? 'accent' : s === 'sent' ? 'warning' : 'default';
}
export function participantLabel(s: ParticipantStatus): string {
  return s === 'signed' ? 'Signed' : s === 'viewed' ? 'Opened' : s === 'sent' ? 'Sent' : 'Waiting';
}
export const fieldLabels: Record<FieldType, string> = { signature: 'Signature', name: 'Name', date: 'Date', text: 'Text' };
/** Default box size, as fractions of a page, when a field is placed. */
export const fieldDefaults: Record<FieldType, { w: number; h: number }> = {
  signature: { w: 0.28, h: 0.06 },
  name: { w: 0.28, h: 0.035 },
  date: { w: 0.16, h: 0.035 },
  text: { w: 0.28, h: 0.035 },
};
export const fullName = (p: { first_name: string; last_name: string }) => `${p.first_name} ${p.last_name}`.trim() || 'Unnamed';
