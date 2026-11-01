// Yare Sign · Edge Function yaresign-send
//
// Sends the emails: the signing links, the "it is your turn" messages, the "everyone signed" copy
// and a test. It runs inside the person's own Supabase project and talks to their own Resend account.
//
//   status   (owner)  is the deployment able to send?
//   test     (owner)  send the signed-in person a test email
//   send     (owner)  email the signing link to the signers whose turn it is (or to given ids)
//   advance  (signer) after a signature: tell the next signer, the owner, and, when complete, everyone
//
// Deploy:   npx supabase functions deploy yaresign-send --project-ref <ref>
// Secret:   npx supabase secrets set RESEND_API_KEY=<key> --project-ref <ref>   (the person runs it)
// Settings: the From address and the deployment's address come from the yaresign_settings row the
//           owner fills in under Connections → Email.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { cors, json } from '../_shared/cors.ts';

type Participant = { id: string; envelope_id: string; position: number; role: 'signer' | 'viewer'; first_name: string; last_name: string; email: string; token: string; status: string };
type Envelope = { id: string; owner_id: string; title: string; status: string; ordered: boolean; message: string };
type Settings = { from_email: string; sender_name: string; app_url: string };

const RESEND = 'https://api.resend.com/emails';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405);
  let body: { action?: string; envelope_id?: string; participant_ids?: string[]; token?: string };
  try { body = await req.json(); } catch { return json({ error: 'Send JSON.' }, 400); }

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const key = Deno.env.get('RESEND_API_KEY') ?? '';

  try {
    switch (body.action) {
      case 'status': {
        const user = await owner(admin, req);
        const s = await settings(admin, user.id);
        return json({ configured: !!key && !!s.from_email, from: s.from_email });
      }
      case 'test': {
        const user = await owner(admin, req);
        const s = await settings(admin, user.id);
        if (!key) throw new Err('No RESEND_API_KEY secret on this project yet.', 400);
        if (!s.from_email) throw new Err('Fill in the sender address first.', 400);
        if (!user.email) throw new Err('Your account has no email.', 400);
        await deliver(key, s, user.email, 'Yare Sign can send email', `<p>This is a test from your Yare Sign deployment. Emails to signers will come from ${s.from_email}.</p>`, `This is a test from your Yare Sign deployment. Emails to signers will come from ${s.from_email}.`);
        return json({ configured: true, sent: 1 });
      }
      case 'send': {
        const user = await owner(admin, req);
        const s = await settings(admin, user.id);
        if (!key || !s.from_email) return json({ configured: false, sent: 0 });
        if (!body.envelope_id) throw new Err('envelope_id missing.', 400);
        const { data: env } = await admin.from('yaresign_envelopes').select('*').eq('id', body.envelope_id).eq('owner_id', user.id).maybeSingle();
        if (!env) throw new Err('Envelope not found.', 404);
        if (env.status !== 'sent') throw new Err('This document is not out for signature.', 400);
        const all = await participants(admin, env.id);
        let due = turn(env, all);
        if (body.participant_ids?.length) due = due.filter((p) => body.participant_ids!.includes(p.id));
        const sent = await sendLinks(admin, key, s, env, due);
        return json({ configured: true, sent });
      }
      case 'advance': {
        if (!body.token || !/^[0-9a-f-]{36}$/i.test(body.token)) throw new Err('This link is not valid.', 400);
        const { data: me } = await admin.from('yaresign_participants').select('*').eq('token', body.token).maybeSingle();
        if (!me || me.status !== 'signed') throw new Err('Nothing to do.', 400);
        const { data: env } = await admin.from('yaresign_envelopes').select('*').eq('id', me.envelope_id).single();
        if (!env) throw new Err('Envelope not found.', 404);
        const s = await settings(admin, env.owner_id);
        if (!key || !s.from_email) return json({ configured: false, sent: 0 });
        const all = await participants(admin, env.id);
        const { data: ownerUser } = await admin.auth.admin.getUserById(env.owner_id);
        const ownerEmail = ownerUser.user?.email ?? null;
        let sent = 0;
        const who = name(me);
        if (env.status === 'completed') {
          for (const p of all) {
            if (!p.email) continue;
            const ok = await attempt(admin, key, s, env, p, `Everyone signed: ${env.title}`, `<p>Hello ${p.first_name},</p><p>Everyone has signed <strong>${esc(env.title)}</strong>. Your copy is ready:</p><p><a href="${link(s, p)}">Open the signed document</a></p>`, `Everyone has signed "${env.title}". Your copy: ${link(s, p)}`);
            if (ok) sent++;
          }
          if (ownerEmail) { await deliver(key, s, ownerEmail, `Everyone signed: ${env.title}`, `<p>Everyone has signed <strong>${esc(env.title)}</strong>. Download the signed copy from Yare Sign:</p><p><a href="${s.app_url}/documents/${env.id}">Open in Yare Sign</a></p>`, `Everyone has signed "${env.title}". ${s.app_url}/documents/${env.id}`).catch(() => undefined); sent++; }
        } else {
          if (ownerEmail) { await deliver(key, s, ownerEmail, `${who} signed: ${env.title}`, `<p><strong>${esc(who)}</strong> signed <strong>${esc(env.title)}</strong>.</p><p><a href="${s.app_url}/documents/${env.id}">See the status in Yare Sign</a></p>`, `${who} signed "${env.title}". ${s.app_url}/documents/${env.id}`).catch(() => undefined); sent++; }
          if (env.ordered) sent += await sendLinks(admin, key, s, env, turn(env, all).filter((p) => p.status === 'pending'));
        }
        return json({ configured: true, sent });
      }
      default:
        return json({ error: 'Unknown action.' }, 400);
    }
  } catch (err) {
    const e = err instanceof Err ? err : new Err(err instanceof Error ? err.message : 'Something went wrong.', 500);
    return json({ error: e.message }, e.status);
  }
});

class Err extends Error { constructor(message: string, public status: number) { super(message); } }

/** The signed-in owner, from the JWT the app sends. A bare API key is not a person. */
async function owner(admin: SupabaseClient, req: Request) {
  const auth = req.headers.get('Authorization') ?? '';
  const jwt = auth.replace(/^Bearer\s+/i, '');
  if (!jwt || jwt.split('.').length !== 3) throw new Err('Sign in first.', 401);
  const { data, error } = await admin.auth.getUser(jwt);
  if (error || !data.user) throw new Err('Sign in first.', 401);
  return data.user;
}

async function settings(admin: SupabaseClient, ownerId: string): Promise<Settings> {
  const { data } = await admin.from('yaresign_settings').select('from_email, sender_name, app_url').eq('owner_id', ownerId).maybeSingle();
  return { from_email: data?.from_email ?? '', sender_name: data?.sender_name ?? '', app_url: (data?.app_url ?? '').replace(/\/+$/, '') };
}

async function participants(admin: SupabaseClient, envelopeId: string): Promise<Participant[]> {
  const { data } = await admin.from('yaresign_participants').select('*').eq('envelope_id', envelopeId).order('position');
  return (data ?? []) as Participant[];
}

/** The signers whose turn it is: the first unsigned one when ordered, every unsigned one otherwise. */
function turn(env: Envelope, all: Participant[]): Participant[] {
  const unsigned = all.filter((p) => p.role === 'signer' && p.status !== 'signed');
  return env.ordered ? unsigned.slice(0, 1) : unsigned;
}

async function sendLinks(admin: SupabaseClient, key: string, s: Settings, env: Envelope, due: Participant[]): Promise<number> {
  let sent = 0;
  for (const p of due) {
    if (!p.email) continue;
    const intro = s.sender_name ? `${esc(s.sender_name)} asked you to sign` : 'You are asked to sign';
    const html = `<p>Hello ${esc(p.first_name)},</p><p>${intro} <strong>${esc(env.title)}</strong>.</p>${env.message ? `<p>${esc(env.message).replace(/\n/g, '<br>')}</p>` : ''}<p><a href="${link(s, p)}" style="display:inline-block;padding:10px 18px;border-radius:10px;background:#ffe500;color:#15161a;text-decoration:none;font-weight:600">Review and sign</a></p><p>Or open this address: ${link(s, p)}</p>`;
    const text = `Hello ${p.first_name},\n\n${s.sender_name ? `${s.sender_name} asked you to sign` : 'You are asked to sign'} "${env.title}".\n${env.message ? `\n${env.message}\n` : ''}\nReview and sign: ${link(s, p)}`;
    const ok = await attempt(admin, key, s, env, p, `Please sign: ${env.title}`, html, text);
    if (ok) {
      sent++;
      if (p.status === 'pending') await admin.from('yaresign_participants').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', p.id);
    }
  }
  return sent;
}

async function attempt(admin: SupabaseClient, key: string, s: Settings, env: Envelope, p: Participant, subject: string, html: string, text: string): Promise<boolean> {
  try {
    await deliver(key, s, p.email, subject, html, text);
    await admin.from('yaresign_events').insert({ envelope_id: env.id, participant_id: p.id, type: 'emailed', detail: { subject } });
    return true;
  } catch (err) {
    await admin.from('yaresign_events').insert({ envelope_id: env.id, participant_id: p.id, type: 'email_failed', detail: { subject, error: err instanceof Error ? err.message : String(err) } });
    return false;
  }
}

async function deliver(key: string, s: Settings, to: string, subject: string, html: string, text: string): Promise<void> {
  const from = s.sender_name ? `${s.sender_name} <${s.from_email}>` : s.from_email;
  const footer = `<p style="color:#6b7280;font-size:12px">Sent with Yare Sign, self-hosted software from <a href="https://yare.monster">Yare Monster</a>.</p>`;
  const res = await fetch(RESEND, { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to: [to], subject, html: html + footer, text: `${text}\n\nSent with Yare Sign, self-hosted software from Yare Monster. https://yare.monster` }) });
  if (!res.ok) {
    let detail = `Resend answered ${res.status}.`;
    try { const j = await res.json(); if (j?.message) detail = j.message; } catch { /* keep the status */ }
    throw new Err(detail, 502);
  }
}

const link = (s: Settings, p: Participant) => `${s.app_url}/s/${p.token}`;
const name = (p: Participant) => `${p.first_name} ${p.last_name}`.trim() || 'Someone';
const esc = (v: string) => v.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] ?? c));
