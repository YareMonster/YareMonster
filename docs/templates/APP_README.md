# Yare [App]

> Template. Copy to `apps/yare-<slug>/README.md` and replace every bracketed part. Delete sections that
> do not apply rather than leaving them empty. Describe what the app does today, not what it may do.

One sentence: what this app is for and who it is for.

**Status:** [Not started | In progress | Released vX.Y.Z]. [One line on what works and what does not.]

Part of [Yare Monster](https://yare.monster), created by Orlando Pedro.
Free to self-host for personal use and for your own business under the
[Yare Monster Community License](LICENSE). This folder is self-contained: copy it, follow
[DEPLOYMENT.md](DEPLOYMENT.md), and it runs on your own accounts.

## What it does

- [Feature that exists, one line each.]

## What it does not do

- [Limits. Ideas are not features.]

## What you need

| Service | Why | Cost |
| --- | --- | --- |
| [Supabase](https://supabase.com) project | Database and sign-in | Free plan is enough for personal use |
| [Cloudflare](https://cloudflare.com) account | Hosting | Free plan |
| A domain (optional) | Your own address | Registrar's price |
| [Other provider] | [Why] | [Link to pricing] |

Node.js 20 or newer on your computer to build it.

## Install it with your AI assistant

Hand this folder to your assistant and say:

> Make the `apps/yare-[slug]` folder the root of my project. Follow its DEPLOYMENT.md. I will give you
> my Supabase project URL, publishable key and, for the migrations, my database password, and I
> will sign in to Cloudflare myself when you ask.

## Run it locally

```sh
# in this folder
cp .env.example .env     # then fill in the values (see DEPLOYMENT.md)
npm install
npm run dev              # http://localhost:[port]
```

## Deploy it

Follow [DEPLOYMENT.md](DEPLOYMENT.md). It covers the Supabase project, the migrations, the
environment variables, Cloudflare, your domain, and how to check that everything works.

## Where things are

```
src/            the app
src/yare/       the shared Yare Monster design system (generated copy, see docs/DESIGN.md at the repo root)
public/yare/    shared logos and marks (generated copy)
supabase/       database migrations, in order
skills/         guide, install, deploy, update, backup: instructions written for AI assistants (generated)
.env.example    every environment variable, explained
wrangler.jsonc  Cloudflare configuration
```

## What changed

- **vX.Y.Z** ([date]): [one line].

## Credit

Yare [App] is part of Yare Monster, created by Orlando Pedro. See [ATTRIBUTION.md](../../ATTRIBUTION.md).
Dependencies keep their own licences.
