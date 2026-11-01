# Deployment conventions

How every Yare Monster app is built and deployed. Each app's own `DEPLOYMENT.md` gives the exact steps for
that app; this page explains the shared shape so the steps look familiar from one app to the next.

## The shape of a deployment

```
Your browser  ──►  Cloudflare (static files of the app, on your domain)
                        │
                        └──►  Supabase (your project: database, auth, storage)
```

- The app is a static build: HTML, JavaScript, CSS and images. Cloudflare serves it.
- The app talks to Supabase directly from the browser using the project URL and the publishable
  key. Row-level security in the database decides what that key may do.
- There is no Yare Monster server anywhere in the picture. Nothing phones home.

## Cloudflare

Apps deploy as **Cloudflare Workers with static assets**. Each app has a `wrangler.jsonc` naming
the worker and pointing at its `dist/` folder, with `not_found_handling` set to
`single-page-application` so the app handles its own routes.

Two ways to deploy, both documented per app:

1. **From your computer** with Wrangler: `npm run build` then `npx wrangler deploy`. Wrangler asks
   you to sign in to Cloudflare the first time. Build-time variables come from your local `.env`.
2. **From GitHub** with Workers Builds: connect your fork or copy in the Cloudflare dashboard, set
   the root directory to the app folder (for example `apps/yare-launcher`), the build command to
   `npm run build` and the deploy command to `npx wrangler deploy`. Build-time variables are set in
   the dashboard under the Worker's settings.

Custom domains are added in the Cloudflare dashboard under the Worker → Settings → Domains &
Routes. Cloudflare issues the certificate. If the domain's DNS is not on Cloudflare, the app's
`DEPLOYMENT.md` says what record to create.

Cloudflare Pages would also serve these builds. The apps standardise on Workers because Cloudflare
treats it as its platform for static assets, and because one configuration file per app
keeps the instructions short.

## Environment variables

Apps are built with Vite. Only variables prefixed `VITE_` reach the app, and every one of them is
compiled into the public bundle. Rules:

- Each app ships `.env.example` listing every variable, with a placeholder value, whether it is
  public or secret, and where to get it.
- `.env` files are git-ignored. Copy the example, fill it in, keep it local.
- Nothing secret is ever a `VITE_` variable. If an app ever needs a server-side secret, it needs a
  server-side component, and that is a documented design decision for that app.

## Supabase

See [SUPABASE.md](SUPABASE.md). In short: your own project, prefixed tables, migrations pushed
with the Supabase CLI from the app's folder, your email on the allow list, and your account created
from the app's first screen.

## Verifying a deployment

Every app's `DEPLOYMENT.md` ends with a checklist along these lines:

1. The site loads over HTTPS on your domain.
2. The sign-in screen appears. "Create your account" works for an allowed email and is refused for
   any other. A wrong password is rejected; the right one signs you in.
3. The first real action works (add a tile, create a form) and the row appears in the Supabase
   table editor.
4. Signed out, the private pages are not reachable and the browser console shows no errors.
5. For apps with public pages: the public page loads without signing in and shows the
   "Pwrd by Yare Monster" footer.

## Updating

Pull or copy the newer version of the app folder, read its changelog section in the README, apply
any new migration files in order, run `npm install`, build and deploy. Migrations never modify
earlier migration files, so applying the new ones is enough.

## Backups

Supabase takes daily backups on paid plans; the free plan does not include them. Each app's
documentation explains how to export its tables (the Supabase dashboard's table editor can export
CSV, and `pg_dump` works with the connection string). Storage buckets need to be downloaded
separately. Back up before applying migrations.

## Costs and limits

The code is free. Cloudflare's free plan serves static assets generously; Supabase's free plan
covers one person's use and pauses idle projects after a week. Custom domains cost whatever your
registrar charges. Apps that call paid APIs (an email provider, an image model) say so in their
README with the provider's pricing page linked.
