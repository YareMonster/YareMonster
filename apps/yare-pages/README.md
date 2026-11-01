# Yare Pages

Your websites, in one place. Build a new one with your assistant and the guide, bring the ones you
already have, and see their visitors from your own Cloudflare account. Your code, your hosting,
your domain: Yare Pages keeps the list and the figures, never the website.

**Status:** In progress. Websites, the build guide and checklist, pictures, and visitors
from Cloudflare (domains on your account, or Cloudflare Web Analytics elsewhere) work.

Part of [Yare Monster](https://yare.monster), created by Orlando Pedro.
Free to self-host for personal use and for your own business under the
[Yare Monster Community License](LICENSE). This folder is self-contained: copy it, follow
[DEPLOYMENT.md](DEPLOYMENT.md), and it runs on your own accounts.

## What it does

- **New website, two doors.** Build a new one: a four-step card, the guide to download, the
  sentence to say to your assistant. Or add one you already have: a name and an address.
- **Home**: one card per website with its picture, its status and its visits over 30 days, and a
  Visitors tab with every website combined.
- **Website page**: Overview and Visitors (visits, page views and unique visitors over 7, 30 or 90
  days, the chart, top pages, countries and referrers), Guide (the build checklist you tick off,
  the guide, what to say), Settings (name, address, repository, picture, live or building).
- **Pictures**: the website's own social image, read from the page, or one you upload, a capture
  from Kapture for instance.
- **The guide**: `skills/website/SKILL.md`, the file that tells an assistant how to plan, design,
  build, check and publish a website with Astro, GitHub and Cloudflare, and connect a domain.
  Download it from the app or open the file in this folder.

## What it does not do

- No screenshots taken by the app, no uptime checks, no SEO scores, and it never edits a website.
  One account per deployment.

## What you need

| Service | Why | Cost |
| --- | --- | --- |
| [Supabase](https://supabase.com) project | Your websites, their figures, your sign-in, and the sync function | Free plan is enough for personal use |
| [Cloudflare](https://cloudflare.com) account | Hosting this app, and the visitor figures of your websites through an API token | Free plan |
| [GitHub](https://github.com) account | Where the websites you build keep their code | Free |
| A domain (optional) | Your own address instead of `*.workers.dev` | Your registrar's price |

Node.js 20 or newer on your computer to build it.

## Install it with your AI assistant

Hand this folder to your assistant and say:

> Make the `apps/yare-pages` folder the root of my project. Follow its DEPLOYMENT.md. I will give you
> my Supabase project URL and publishable key, and I will sign in to Supabase and Cloudflare and
> create my Cloudflare token myself when you ask.

Or sign in to the app and press **Setup guide** under Connections for a ready-made file.

## Run it locally

```sh
# in this folder
cp .env.example .env     # then fill in the two values (see DEPLOYMENT.md, step 4)
npm install
npm run dev              # http://localhost:4603
```

Other scripts: `npm run check` (TypeScript), `npm run build`, `npm run preview`, `npm run deploy`,
`npm run db:link` and `npm run db:push` (Supabase CLI).

## Where things are

```
src/App.tsx                          routes: /, /sites/:id, /connections; everything needs sign-in
src/features/Shell.tsx               the sidebar: New website, Home, Connections, Your websites
src/features/HomePage.tsx            the cards and the combined visitors
src/features/NewSiteDialog.tsx       the two doors
src/features/site/SitePage.tsx       one website: Overview / Visitors / Guide / Settings
src/features/site/GuideTab.tsx       the build checklist and the guide
src/features/site/SiteSettings.tsx   name, address, picture, live or building, removal
src/features/dashboard/Visitors.tsx  the visitor report both pages show
src/features/ConnectionsPage.tsx     Connections plus the Cloudflare token box
src/lib/pages-api.ts                 every database and function call
src/lib/guide.ts                     the guide text, the prompt and the build steps
src/lib/supabase.ts                  the typed client and the row types
src/yare/                            the shared Yare Monster design system (generated copy)
src/yare-charts/                     the shared charts (generated copy; needs recharts)
supabase/migrations/                 one owner, the tables, the allow list
supabase/functions/yarepages-sync    Edge Function: reads a website and its visitors from Cloudflare
skills/website/SKILL.md              the website guide people download
skills/                              guide, install, deploy, update, backup, website: for AI assistants
.env.example                         both environment variables, explained
wrangler.jsonc                       Cloudflare configuration
```

## Data

Everything lives in your own Supabase project. Yare Monster has no access to your project, your
data or your keys; nothing is sent anywhere else.

Four tables, all prefixed `yarepages_`:

- `yarepages_sites`: one row per website: name, address, kind, status, the build checklist, the
  picture, where its visitors come from.
- `yarepages_days`: visits, page views and unique visitors per day, from Cloudflare.
- `yarepages_tops`: the top pages, countries and referrers of the last thirty days.
- `yarepages_keys`: your Cloudflare token, readable only by the sync function.

Row-level security keeps everything to your account, and only emails on the deployment's allow
list (`yare_allowed_emails`, filled during setup) can create an account. Pictures you upload go to
the shared public bucket `yare-images`, under `yare-pages/<site id>/`. The token you paste goes to
`yarepages_keys`, which only the sync function can read; the browser can save it and ask whether
one is set, never read it back.

## What changed

- **v0.1.0** (20 October 2026): websites, the build guide and checklist, pictures, visitors from
  Cloudflare, the sync function, the token box.

## Credit

Yare Upages is part of Yare Monster, created by Orlando Pedro. See [ATTRIBUTION.md](../../ATTRIBUTION.md)
in the repository.

The monster button in the sidebar opens the About dialog, as the licence asks.
