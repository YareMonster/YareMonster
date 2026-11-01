// Yare Groups · Edge Function yaregroups-join
//
// Creates a member's account. Members are not on the deployment's allow list, so the app cannot
// create them with a plain sign-up; this function checks the group's door (open, or a valid invite
// link), puts the email on the allow list marked as a member, creates the account with the password
// the person chose, and adds them to the group. Accounts it creates carry app_metadata
// yare_groups = "member", so the database never treats them as operators.
//
//   join   { email, password, display_name, code? }  → { ok: true }
//
// Someone who already has an account (from another Yare Monster app, or a member who left) signs in
// and the app calls yaregroups_join(code) instead; this function answers { exists: true } for them.
//
// Deploy: npx supabase functions deploy yaregroups-join --project-ref <ref>
import { createClient } from 'npm:@supabase/supabase-js@2';
import { cors, json } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405);
  let body: { email?: string; password?: string; display_name?: string; code?: string };
  try { body = await req.json(); } catch { return json({ error: 'Send JSON.' }, 400); }
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  try {
    const email = (body.email ?? '').trim().toLowerCase();
    const password = body.password ?? '';
    const name = (body.display_name ?? '').trim().slice(0, 40);
    const code = (body.code ?? '').trim();
    if (!/^[^@\s]+@[^@\s]+$/.test(email)) throw new Err('That does not look like an email.', 400);
    if (password.length < 8) throw new Err('Use at least 8 characters for the password.', 400);
    if (!name) throw new Err('Tell us what to call you.', 400);

    const { data: g } = await admin.from('yaregroups_group').select('join_mode').limit(1).maybeSingle();
    if (!g || g.join_mode === 'closed') throw new Err('This group is not taking new people.', 403);
    let role = 'member';
    let inviteId: string | null = null;
    if (code) {
      const { data: i } = await admin.from('yaregroups_invites').select('id, role, uses, max_uses, expires_at, revoked_at').eq('code', code).maybeSingle();
      const valid = i && !i.revoked_at && (!i.expires_at || new Date(i.expires_at).getTime() > Date.now()) && (i.max_uses == null || i.uses < i.max_uses);
      if (!valid) throw new Err('This invite link is not valid any more.', 410);
      role = i.role; inviteId = i.id;
    } else if (g.join_mode !== 'open') {
      throw new Err('This group needs an invite link.', 403);
    }

    // Someone with an account already signs in; the app then joins them with the code.
    const { data: existing } = await admin.rpc('yaregroups_user_id_for_email', { p_email: email });
    if (existing) return json({ exists: true });

    await admin.from('yare_allowed_emails').upsert({ email, note: 'Yare Groups member' }, { onConflict: 'email', ignoreDuplicates: true });
    const { data: created, error } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { full_name: name },
      app_metadata: { yare_groups: 'member' },
    });
    if (error || !created.user) throw new Err(error?.message ?? 'Could not create the account.', 400);
    const { error: mErr } = await admin.from('yaregroups_members').insert({ user_id: created.user.id, display_name: name, role });
    if (mErr) throw new Err('The account exists but could not join the group. Sign in and try the link again.', 500);
    if (inviteId) await admin.rpc('yaregroups_count_invite', { p_id: inviteId }).then(() => undefined, () => undefined);
    return json({ ok: true });
  } catch (err) {
    const e = err instanceof Err ? err : new Err(err instanceof Error ? err.message : 'Something went wrong.', 500);
    return json({ error: e.message }, e.status);
  }
});

class Err extends Error { constructor(message: string, public status: number) { super(message); } }
