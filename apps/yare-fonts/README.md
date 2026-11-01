# Yare Fonts

**Status:** Not started. The folder is scaffolded with the shared Yare Monster design system, the app shell and the deployment setup every Yare Monster app uses. Its features are not built; this page describes the shell.

Part of [Yare Monster](https://yare.monster), created by Orlando Pedro.
Free to self-host for personal use and for your own business under the
[Yare Monster Community License](LICENSE). This folder is self-contained: copy it, follow
[DEPLOYMENT.md](DEPLOYMENT.md), and it runs on your own accounts.

## What exists

Yare Fonts is planned as a static app with no database: free fonts, commercial use included, to browse and pick for your own work. This folder holds the shell it will be presented in. There is no Supabase setup and no sign-in.

## Install it with your AI assistant

Hand this folder to your assistant and say:

> Make the `apps/yare-fonts` folder the root of my project. Follow its DEPLOYMENT.md. I will sign in
> to Cloudflare myself when you ask.

The assistant needs nothing from Yare Monster. Everything it needs is in this folder; the guide
says where each value comes from.

## Run it locally

```sh
# in this folder
npm install
npm run dev              # http://localhost:4618
```

## Where things are

```
src/App.tsx               renders the shell
src/features/HomePage.tsx the shell with the empty state
src/yare/                 the shared Yare Monster design system (generated copy; see docs/DESIGN.md at the repo root)
public/yare/              shared logos and marks (generated copy)
wrangler.jsonc            Cloudflare configuration
```

## What changed

- **v0.0.1** (18 October 2026): scaffold only.

## Credit

Yare Fonts is part of Yare Monster, created by Orlando Pedro. See [ATTRIBUTION.md](../../ATTRIBUTION.md)
in the repository (or the Help menu inside the app). Dependencies keep their own licences.
