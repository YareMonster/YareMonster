# Deploying Yare Launcher

This guide takes you from nothing to Yare Launcher running at your own address. Allow about
20 minutes. You can follow it yourself or hand it to an AI assistant; either way, you sign in to
Supabase and Cloudflare yourself when asked, and nothing here needs a credential sent to anyone.

Commands marked **on your computer** run in a terminal inside this folder (`apps/yare-launcher`).
Everything else happens in the Supabase or Cloudflare dashboard.

## 1. Accounts

- A [Supabase](https://supabase.com) account. Create a new project for Yare Monster, or reuse one you
  already use for other Yare Monster apps: the launcher's table is prefixed `launcher_` so it does not
  collide. Note the database password you set; the dashboard needs it only for the CLI route.
- A [Cloudflare](https://cloudflare.com) account.
- Optional: a domain whose DNS you control.

## 2. Get the code

**On your computer**, either clone the repository and work in this folder, or copy just this
folder somewhere:

```sh
git clone https://github.com/YareMonster/YareMonster.git
cd YareMonster/apps/yare-launcher
npm install
```

Node.js 20 or newer is required (`node --version`).

## 3. Database

**On your computer**, sign in to Supabase once, then let the app push its own migrations. The
script reads your project from `.env` (step 4, so do that first), applies only the files your
project has not seen, and works whether the project is empty or already holds other Yare Monster
apps.

```sh
npx supabase login
npm run db:push
```

Without the CLI: Supabase → **SQL Editor** → **New query**, paste each file in
`supabase/migrations/` in order and run it. They are safe to run twice.

Afterwards, **Table Editor** shows `launcher_apps` with row-level security enabled. You do not
need to create a user in the dashboard: the app does that on first run (step 5).

## 4. Environment variables

**On your computer**, copy `.env.example` to `.env` and fill in the two values:

| Variable | Public or secret | Where to find it |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Public | Supabase → Project Settings → Data API → **Project URL** |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Public | Supabase → Project Settings → API Keys → **Publishable key** (`sb_publishable_…`). Older projects show an "anon" key instead; that works too. |

Both values are compiled into the browser bundle, which is fine: the publishable key can only do
what row-level security allows. Never put the secret key, a service-role key or the database
password in a `VITE_` variable.

## 5. Allow your email, then create your account

Only emails on the deployment's allow list may create an account. **On your computer** (or ask
your assistant), add yours:

```sh
npx supabase db query "select public.yare_allow_email('you@domain.com')" --linked
```

Without the CLI: Supabase → SQL Editor → `select public.yare_allow_email('you@domain.com');`.
The list is shared by every Yare Monster app in the project, so one entry opens all of them. Add
more emails the same way when you want more people in.

Then:

```sh
npm run dev
```

Open http://localhost:4600 and choose **Create your account** with that email. If your Supabase
project requires email confirmation, which is the default, confirm the email it sends, then sign
in. Mark one app as set up and confirm a row appears in Supabase → Table Editor → `launcher_apps`.

## 6. Deploy to Cloudflare

### Option A: from your computer

```sh
npm run build          # writes dist/
npx wrangler deploy    # opens a browser to sign in to Cloudflare the first time
```

Wrangler prints the address, something like `https://yare-launcher.<your-subdomain>.workers.dev`.
The build used the values from your `.env`. Repeat both commands to deploy again.

### Option B: from GitHub

Cloudflare dashboard → **Workers & Pages → Create → Import a repository** → pick your fork or
copy of the repository. Settings:

- **Root directory**: `apps/yare-launcher`
- **Build command**: `npm run build`
- **Deploy command**: `npx wrangler deploy`
- **Build variables**: `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` with the values
  from step 4

Every push to the branch you chose rebuilds and deploys.

## 7. Your domain (optional)

Cloudflare dashboard → Workers & Pages → `yare-launcher` → **Settings → Domains & Routes → Add →
Custom domain**. Enter the hostname, for example `apps.yourdomain.com`.

- If the domain's DNS is already on Cloudflare, that is all; Cloudflare adds the record and the
  certificate.
- If not, Cloudflare shows a CNAME to create at your registrar pointing at your `workers.dev`
  address, and verifies it for you.

## 8. Check that it works

1. The address loads over HTTPS and shows the sign-in screen with the Yare Monster lockup.
2. A wrong password is refused with "That email and password do not match."
3. Your password signs you in. Mark an app as set up; a row appears in `launcher_apps`.
   Download the setup guide; the file names your Supabase project.
4. Open a private browser window to the same address: it shows the sign-in screen, not your
   tiles. "Create your account" with an email that is not on the list is refused.
5. Help (the question-mark button at the bottom of the sidebar) → About Yare Launcher opens the
   credit dialog.

## Updating

Pull the new version of the repository (or copy the new folder over this one, keeping your
`.env`), read "What changed" in the README, run any new files in `supabase/migrations/` in order,
then:

```sh
npm install
npm run build
npx wrangler deploy
```

Migrations never change earlier files, so running only the new ones is correct.

## Backing up and restoring

The launcher stores names and links only, so the data is small. Supabase → Table Editor →
`launcher_apps` → **Export** gives a CSV. To restore, import that CSV into the same table, or
re-add the tiles by hand. The free Supabase plan has no automatic backups; paid plans do.

## Troubleshooting

- **"Almost there" screen** listing variables: a `VITE_` variable is missing or still the
  placeholder. Fix `.env` (local) or the build variables (Cloudflare), then rebuild and deploy.
- **"That email and password do not match"** with the right password: in Supabase →
  Authentication → Users, check the user exists and is confirmed; use "Send password recovery" or
  set a new password there.
- **"This email is not on the list"**: run the `yare_allow_email` step for that email, then try
  again. Supabase → Table Editor → `yare_allowed_emails` shows who is allowed.
- **Tiles do not save, or an error mentions permission or policy**: the migration did not run
  fully. Run `npm run db:push` again (or the SQL files); they are idempotent.
- **Blank page after deploy**: open the browser console. A failed request to `supabase.co` usually
  means the project URL is wrong. A 404 on a route means `not_found_handling` in `wrangler.jsonc`
  was changed; it must be `single-page-application`.
- **Project paused**: free Supabase projects pause after seven days without traffic. Resume in the
  dashboard; nothing is lost.

## Costs and limits

The code is free. For one person's use, Cloudflare's free plan and Supabase's free plan are enough:
the launcher serves a few static files and reads one small table. A custom domain costs whatever
your registrar charges. Check the providers' current pricing pages for limits; this guide does not
quote numbers that go stale.

## Removing it

Delete the Worker in Cloudflare (Workers & Pages → `yare-launcher` → Settings → Delete). In
Supabase, drop the table if you want the data gone:
`drop table public.launcher_apps; drop table public.launcher_settings; drop function
public.launcher_set_updated_at();` and, if no other
Yare Monster app is installed, `drop trigger launcher_allowed_email on auth.users; drop function
public.launcher_enforce_allowed_email(); drop table public.yare_allowed_emails;`. Your account in Supabase Auth is yours to keep or delete.
