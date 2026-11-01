# Yare Analytics

**Status:** Not started. The folder is scaffolded with the shared Yare Monster design system, sign-in and the deployment setup every Yare Monster app uses. Its features are not built; this page describes the shell.

Part of [Yare Monster](https://yare.monster), created by Orlando Pedro.
Free to self-host for personal use and for your own business under the
[Yare Monster Community License](LICENSE). This folder is self-contained: copy it, follow
[DEPLOYMENT.md](DEPLOYMENT.md), and it runs on your own accounts.

## What exists

Sign-in and first-run account creation work against your own Supabase project. Nothing else is built: the home page says so.

## Install it with your AI assistant

Hand this folder to your assistant and say:

> Make the `apps/yare-analytics` folder the root of my project. Follow its DEPLOYMENT.md. I will give you
> my Supabase project URL, publishable key and, for the migrations, my database password, and I
> will sign in to Cloudflare myself when you ask.

The assistant needs nothing from Yare Monster. Everything it needs is in this folder; the guide
says where each value comes from.

## Run it locally

```sh
# in this folder
cp .env.example .env     # then fill in the two values (see DEPLOYMENT.md, step 4)
npm install
npm run dev              # http://localhost:4610
```

## Where things are

```
src/App.tsx               configuration check, session, sign-in or the home page
src/features/HomePage.tsx the shell with the empty state
src/yare/                 the shared Yare Monster design system (generated copy; see docs/DESIGN.md at the repo root)
public/yare/              shared logos and marks (generated copy)
supabase/migrations/      20261018190001_yareanalytics_owner.sql (one owner per deployment)
.env.example              both environment variables, explained
wrangler.jsonc            Cloudflare configuration
```

## What changed

- **v0.0.1** (18 October 2026): scaffold only.

## Credit

Yare Analytics is part of Yare Monster, created by Orlando Pedro. See [ATTRIBUTION.md](../../ATTRIBUTION.md)
in the repository (or the Help menu inside the app). Dependencies keep their own licences.
