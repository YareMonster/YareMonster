# Yare Launcher

The place to set up the whole Yare Monster collection on your own accounts, and to keep track of it
afterwards. It is optional: every Yare Monster app works on its own without it.

**Status:** In progress. First-run account creation, sign-in, the apps view, the
Connections page and the downloadable setup guide work.

Part of [Yare Monster](https://yare.monster), created by Orlando Pedro.
Free to self-host for personal use and for your own business under the
[Yare Monster Community License](LICENSE). This folder is self-contained: copy it, follow
[DEPLOYMENT.md](DEPLOYMENT.md), and it runs on your own accounts.

## What it does

- Creates your account, for emails on the deployment's allow list, which you or your assistant fill during setup.
- **Yare Monster Apps**: the Yare Monster apps with their logos and one-line descriptions, each with a
  status you set (Not set up / Set up), an optional address once it is deployed, and an Open button
  when it has one.
- **Setup guide**: pick the apps you want and download one Markdown file with every step, your
  Supabase project already filled in, to hand to your AI assistant or paste into another tool. This is the website's "use my AI assistant" path for the whole collection. The file
  holds only public values; your database password and Cloudflare sign-in happen at your keyboard.
- **Connections**: your copy of the repository (saved), the Supabase project your apps will use
  (the launcher's own by default, or one you connect by pasting its URL and publishable key), and
  your Cloudflare account. These are the three accounts the website's guided setup walks through:
  code, database, hosting, each with its steps.

## What it does not do

- It does not deploy anything itself. Deployment runs on your computer or in your Cloudflare
  account, following the guide.
- It does not check whether an app is really up. The status is yours to set; the launcher takes
  your word for it.
- It does not sign you in to the other apps. Each app has its own sign-in.
- Connecting Supabase or GitHub means pasting addresses and public keys. One-click sign-in connections are not built.

## What you need

| Service | Why | Cost |
| --- | --- | --- |
| [Supabase](https://supabase.com) project | One table (`launcher_apps`) and your sign-in | Free plan is enough |
| [Cloudflare](https://cloudflare.com) account | Hosting the static build | Free plan |
| A domain (optional) | Your own address instead of `*.workers.dev` | Your registrar's price |

Node.js 20 or newer on your computer to build it.

## Install it with your AI assistant

Hand this folder to your assistant and say:

> Make the `apps/yare-launcher` folder the root of my project. Follow its DEPLOYMENT.md. I will give you
> my Supabase project URL, publishable key and, for the migrations, my database password, and I
> will sign in to Cloudflare myself when you ask.

The assistant needs nothing from Yare Monster. Everything it needs is in this folder; the guide
says where each value comes from.

## Run it locally

```sh
# in this folder
cp .env.example .env     # then fill in the two values (see DEPLOYMENT.md, step 4)
npm install
npm run dev              # http://localhost:4600
```

Other scripts: `npm run check` (TypeScript), `npm run build` (static output in `dist/`),
`npm run preview` (serve `dist/` on :4700), `npm run deploy` (build and deploy with Wrangler),
`npm run db:link` and `npm run db:push` (Supabase CLI: connect to your project, apply migrations).

## Deploy it

Follow [DEPLOYMENT.md](DEPLOYMENT.md). It covers the Supabase project, the migration, the
environment variables, Cloudflare, your domain, and how to check that everything works.

## Where things are

```
src/App.tsx                    configuration check, session, sign-in or the launcher
src/features/LauncherPage.tsx  the shell, the two pages, the dialogs
src/features/AppCard.tsx       one app of the collection
src/features/AppStatusDialog.tsx status, address and note for one app
src/lib/supabase.ts            the typed Supabase client and the row types
src/lib/apps.ts                data access
src/yare/                     the shared Yare Monster design system (generated copy; see docs/DESIGN.md at the repo root)
public/yare/                  shared logos and marks (generated copy)
supabase/migrations/          20261018000001_launcher_apps.sql … 20261018000005_launcher_access.sql
supabase/config.toml          lets the Supabase CLI link this folder to your project
.env.example                  both environment variables, explained
wrangler.jsonc                Cloudflare configuration
skills/                       guide, install, deploy, update, backup: instructions for AI assistants
```

## Data

Two tables in your Supabase project's `public` schema. `launcher_apps`: one row per app per
owner with the status you set, an optional address and note. `launcher_settings`: your repository
address. Row-level security limits every row to the account that created it; anonymous visitors
get nothing. The access migration adds the allow list: only emails in `yare_allowed_emails` may
create an account. All files are commented in full.

## What changed

- **v0.2.0** (18 October 2026): the launcher becomes the collection's setup hub: status per app,
  Connections page, downloadable setup guide, its own logo.
- **v0.1.0** (18 October 2026): first version. First-run account, sign-in, tiles, add, edit, remove.

## Credit

Yare Launcher is part of Yare Monster, created by Orlando Pedro. See
[ATTRIBUTION.md](../../ATTRIBUTION.md) in the repository (or the Help menu inside the app).
Dependencies keep their own licences: HeroUI and React (MIT), React Aria (Apache-2.0), Phosphor
Icons (MIT), Inter and Nunito (SIL OFL 1.1), Supabase JS (MIT).
