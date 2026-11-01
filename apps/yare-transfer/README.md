# Yare Transfer

Share files with a simple link. Upload, write a line, pick a look, send the link. It lives up to
seven days, then the files are gone. Everything stays in your own storage.

**Status:** In progress. Files, themes, logo and picture, expiry, password, the recipient
page with zip download, and download counts work.

Part of [Yare Monster](https://yare.monster), created by Orlando Pedro.
Free to self-host for personal use and for your own business under the
[Yare Monster Community License](LICENSE). This folder is self-contained: copy it, follow
[DEPLOYMENT.md](DEPLOYMENT.md), and it runs on your own accounts.

## What it does

- **Files**: any type, zips included. The app accepts up to 20 MB per file to start; raise it under
  Connections, up to 1 GB. Your Supabase plan sets the real ceiling (50 MB per file and 1 GB in
  total on the free plan) and refuses what is over it.
- **Words and look**: a title, a few lines, a picture above, the button's label, your logo, one of
  nine themes. The page looks like the first screen of a form, with the files in place of a question.
- **Link**: publishing starts the clock, 1 to 7 days. The page shows how long is left; when the time
  is up it says so and the files are deleted from your storage. Close the link early any time.
- **Password**: optional. Stored hashed; recipients type it before they see the files.
- **Recipient page**: no account. Each file has its own download, several files come as one zip.
- **Downloads**: opens and downloads counted, per file and over time. Nothing about who.

## What it does not do

- No email to recipients: you copy the link. No resumable uploads for very large files. No links
  that never expire. One account per deployment.

## What you need

| Service | Why | Cost |
| --- | --- | --- |
| [Supabase](https://supabase.com) project | The files, the transfers, your sign-in, and the function that hands files out | Free plan is enough for personal use: 50 MB per file, 1 GB in total |
| [Cloudflare](https://cloudflare.com) account | Hosting the static build | Free plan |
| A domain (optional) | Your own address instead of `*.workers.dev` | Your registrar's price |

Node.js 20 or newer on your computer to build it.

## Install it with your AI assistant

Hand this folder to your assistant and say:

> Make the `apps/yare-transfer` folder the root of my project. Follow its DEPLOYMENT.md. I will give
> you my Supabase project URL and publishable key, and I will sign in to Supabase and Cloudflare
> myself when you ask.

Or sign in to the app and press **Setup guide** under Connections for a ready-made file.

## Run it locally

```sh
# in this folder
cp .env.example .env     # then fill in the two values (see DEPLOYMENT.md, step 4)
npm install
npm run dev              # http://localhost:4606
```

Other scripts: `npm run check` (TypeScript), `npm run build`, `npm run preview`, `npm run deploy`,
`npm run db:link` and `npm run db:push` (Supabase CLI).

## Where things are

```
src/App.tsx                              routes: /t/:slug is a recipient's page, everything else needs sign-in
src/features/Shell.tsx                   the sidebar: New transfer, Home, Connections, Your transfers
src/features/HomePage.tsx                the dashboard
src/features/ConnectionsPage.tsx         Connections plus the storage limit
src/features/transfer/TransferPage.tsx   a transfer: Build / Settings / Share / Downloads
src/features/transfer/*Tab.tsx           the four tabs
src/public/PublicTransfer.tsx            the recipient's page, loaded through the link
src/public/TransferScreen.tsx            the page's layout (shared with the editor's preview)
src/lib/transfer-api.ts                  every database and function call
src/lib/supabase.ts                      the typed client and the row types
src/yare/                                the shared Yare Monster design system (generated copy)
supabase/migrations/                     one owner, the tables and functions, the allow list
supabase/functions/yaretransfer-file     Edge Function: hands files out, removes expired ones
.env.example                             both environment variables, explained
wrangler.jsonc                           Cloudflare configuration
skills/                                  guide, install, deploy, update, backup: instructions for AI assistants
```

## Data

Everything lives in your own Supabase project. Yare Monster has no access to your project, your
data or your keys; nothing is sent anywhere else.

Four tables, all prefixed `yaretransfer_`:

- `yaretransfer_transfers`: one row per transfer: title, text, look, days, expiry, the password's
  hash, counts.
- `yaretransfer_files`: the files of a transfer, with name, size and where they are in the bucket.
- `yaretransfer_downloads`: when a file was handed out. No addresses, no names.
- `yaretransfer_settings`: your file size limit.

Row-level security keeps everything to your account, and only emails on the deployment's allow
list (`yare_allowed_emails`, filled during setup) can create an account. Anyone with the link reads
what the page shows through one database function, never a storage path. Files live in the private
bucket `yare-transfer`; the `yaretransfer-file` function checks the link, the expiry and the
password, counts the download and hands out a ten-minute address. Pictures go to the public bucket
`yare-images`, under `yare-transfer/<transfer id>/`.

## What changed

- **v0.1.0** (22 October 2026): first working version. Files, words and look, expiry, password, the
  recipient page with zip download, counts, the function.

## Credit

Yare Utransfer is part of Yare Monster, created by Orlando Pedro. See [ATTRIBUTION.md](../../ATTRIBUTION.md)
in the repository.

Every transfer page ends with "Pwrd by Yare Monster", as the licence asks. The monster button in
the sidebar opens the About dialog.
