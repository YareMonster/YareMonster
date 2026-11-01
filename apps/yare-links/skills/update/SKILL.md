---
name: links-update
description: Update an existing Yare Links deployment to the latest version of the code. Use when the person asks to update or upgrade Yare Links.
---

# Update Yare Links

## Rules

- You are working in the person's own accounts. Yare Monster is source code they run themselves; it does not provide hosting, accounts or services and never receives their data or keys.
- Stop and hand the person the exact command when a tool needs a sign-in (`gh auth login`, `npx supabase login`, `npx wrangler login`) or asks for the database password. Never ask them to paste a password or a secret key into the chat.
- Only the two public Supabase values go into `.env`: `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_…`, or the legacy anon key). Refuse anything that starts with `sb_secret_` or is called service role.
- Do not change application code. `.env` and `wrangler.jsonc` are the only files you edit.
- Report every address you produce. The person opens it themselves.
- Folder: `apps/yare-links`. Its `README.md` and `DEPLOYMENT.md` win if anything here disagrees.

## Steps

1. In the repository folder, pull the latest code: `git pull` (or copy the new `apps/yare-links` over the old one, keeping `.env`).
2. Read "What changed" in `apps/yare-links/README.md` and tell the person in one or two lines.
3. Apply any new migration files: `npm run db:push` in `apps/yare-links`. Earlier files never change, so only new ones run.
4. `npm install`, then `npm run build` and `npx wrangler deploy`.
5. Verify as in the deploy skill. If `supabase/functions/` changed, deploy the functions again as in the install skill.
