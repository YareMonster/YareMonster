# Deploying Yare [App]

> Template. Copy to `apps/yare-<slug>/DEPLOYMENT.md`. Every command says where it runs. Every variable
> says whether it is public or secret and where to find it. Describe the real implementation.

This guide takes you from nothing to Yare [App] running at your own address. Allow about
[N] minutes. You can follow it yourself or hand it to an AI assistant; either way, you will need to
sign in to Supabase and Cloudflare yourself when asked.

## 1. Accounts

- A [Supabase](https://supabase.com) account and a new project for this app (or an existing Yare Monster
  project; the tables are prefixed `[prefix]_` so they do not collide).
- A [Cloudflare](https://cloudflare.com) account.
- Optional: a domain whose DNS you control.

## 2. Get the code

Either clone the whole repository and work in `apps/yare-[slug]`, or copy just this folder. On your
computer:

```sh
git clone https://github.com/YareMonster/YareMonster.git
cd YareMonster/apps/yare-[slug]
npm install
```

## 3. Set up Supabase

1. **On your computer**: `npx supabase login`, then `npm run db:push` (reads the project from
   `.env`, applies only the files the project has not seen, works alongside other Yare Monster apps
   in the same project). Without the CLI, paste each file in `supabase/migrations/` into the SQL
   Editor in order.
2. Allow your email: `npx supabase db query "select public.yare_allow_email('you@domain.com')" --linked`.
   Only listed emails may create an account; the list is shared by every Yare Monster app in the project.
3. [App-specific: storage buckets, extra auth settings, with the exact dashboard path.]

## 4. Environment variables

Copy `.env.example` to `.env` in this folder and fill it in:

| Variable | Public or secret | Where to find it |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Public | Supabase → Project Settings → Data API → Project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Public | Supabase → Project Settings → API Keys → Publishable key |
| [`VITE_OTHER`] | [Public] | [Where] |

Everything with a `VITE_` prefix ends up in the browser. Never put a secret or service-role key in
one.

## 5. Run it locally

```sh
# in apps/yare-[slug]
npm run dev
```

Open http://localhost:[port], choose **Create your account** with the email you allowed, confirm
the email if your project asks for it, sign in, and [do the first action].

## 6. Deploy to Cloudflare

### Option A: from your computer

```sh
# in apps/yare-[slug]
npm run build
npx wrangler deploy      # signs you in to Cloudflare the first time
```

Wrangler prints the `*.workers.dev` address when it finishes.

### Option B: from GitHub

In the Cloudflare dashboard: **Workers & Pages → Create → Import a repository**. Choose your fork
or copy. Settings:

- Root directory: `apps/yare-[slug]`
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Build variables: the `VITE_` variables from step 4

Every push to the branch you chose rebuilds and deploys.

## 7. Your domain (optional)

Worker → **Settings → Domains & Routes → Add → Custom domain**. Enter the hostname (for example
`[slug].yourdomain.com`). If the domain's DNS is on Cloudflare, that is all. If not, add a CNAME
for that hostname pointing at your `*.workers.dev` address and follow Cloudflare's verification
steps.

## 8. Check that it works

1. The address loads over HTTPS.
2. The sign-in screen appears. A wrong password is refused. Yours works.
3. [First action] succeeds and the row appears in Supabase → Table Editor → `[prefix]_[table]`.
4. In a private window, signed out, the private pages are not reachable.
5. [For public pages: the public page loads without signing in and shows "Pwrd by Yare Monster".]

## Updating

Pull the new version (or copy the new folder), read "What changed" in the README, run any new
migration files in order, then `npm install`, `npm run build`, deploy.

## Backing up and restoring

Supabase → Table Editor → `[prefix]_[table]` → Export as CSV, for each table. [Storage buckets:
how to download.] To restore, import the CSV into the same table, or restore a `pg_dump` taken with
the project's connection string. The free plan has no automatic backups.

## Troubleshooting

- **"Almost there" screen**: a `VITE_` variable is missing or still a placeholder. Fix `.env` (or
  the Cloudflare build variables) and rebuild.
- **Sign-in says the email and password do not match**: check the user exists under
  Authentication → Users and is confirmed. Reset the password there if needed.
- **Rows do not appear / "permission denied"**: the migration did not run fully, or row-level
  security policies are missing. Re-run the migration; it is safe to repeat.
- **Project paused**: free Supabase projects pause after a week idle. Resume it in the dashboard.
- [App-specific failure modes.]

## Costs and limits

[What the free plans cover for this app, what counts against limits (storage, egress, email
sends), links to the providers' pricing pages. No numbers that will go stale without a date.]
