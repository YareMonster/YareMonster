---
name: fonts-backup
description: Back up or restore the data of a Yare Fonts deployment. Use when the person asks to export, back up, restore or move their Yare Fonts data.
---

# Back up and restore Yare Fonts

## Rules

- You are working in the person's own accounts. Yare Monster is source code they run themselves; it does not provide hosting, accounts or services and never receives their data or keys.
- Stop and hand the person the exact command when a tool needs a sign-in (`gh auth login`, `npx supabase login`, `npx wrangler login`) or asks for the database password. Never ask them to paste a password or a secret key into the chat.
- Only the two public Supabase values go into `.env`: `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_…`, or the legacy anon key). Refuse anything that starts with `sb_secret_` or is called service role.
- Do not change application code. `.env` and `wrangler.jsonc` are the only files you edit.
- Report every address you produce. The person opens it themselves.
- Folder: `apps/yare-fonts`. Its `README.md` and `DEPLOYMENT.md` win if anything here disagrees.

## What holds the data

Yare Fonts has no database. Its content is the code in `apps/yare-fonts`; the person's copy of the repository is the backup.
