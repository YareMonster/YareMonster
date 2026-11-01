---
name: transfer-backup
description: Back up or restore the data of a Yare Transfer deployment. Use when the person asks to export, back up, restore or move their Yare Transfer data.
---

# Back up and restore Yare Transfer

## Rules

- You are working in the person's own accounts. Yare Monster is source code they run themselves; it does not provide hosting, accounts or services and never receives their data or keys.
- Stop and hand the person the exact command when a tool needs a sign-in (`gh auth login`, `npx supabase login`, `npx wrangler login`) or asks for the database password. Never ask them to paste a password or a secret key into the chat.
- Only the two public Supabase values go into `.env`: `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_…`, or the legacy anon key). Refuse anything that starts with `sb_secret_` or is called service role.
- Do not change application code. `.env` and `wrangler.jsonc` are the only files you edit.
- Report every address you produce. The person opens it themselves.
- Folder: `apps/yare-transfer`. Its `README.md` and `DEPLOYMENT.md` win if anything here disagrees.

## What holds the data

Tables in the person's Supabase project: `yare_allowed_emails`, `yaretransfer_transfers`, `yaretransfer_files`, `yaretransfer_downloads`, `yaretransfer_settings`. Files live in the PRIVATE storage bucket `yare-transfer`, one folder per transfer, and are deleted at expiry by design; pictures in `yare-images`, folder `yare-transfer/`.

## Back up

1. Supabase dashboard → Table Editor → each table → Export as CSV. Or, with the connection string the person gets from Supabase → Connect, `pg_dump` of those tables.
2. Storage → `yare-transfer` → download the folders of transfers worth keeping; they are gone at expiry.
3. Tell the person where the files are. The free Supabase plan has no automatic backups; paid plans do.

## Restore

Import the CSVs into the same tables in the same order they were created (the migration files show the order), then upload the files back to the same paths. Row ids are preserved, so links keep working.
