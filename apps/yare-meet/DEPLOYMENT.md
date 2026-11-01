# Deploying Yare Meet

From nothing to Yare Meet running at your own address, in about 20 minutes. Follow it yourself or
hand it to an AI assistant. You sign in to Supabase and Cloudflare yourself when asked; nothing
here needs a credential sent to anyone.

Commands marked **on your computer** run in a terminal inside this folder (`apps/yare-meet`).

## 1. Accounts

- A [Supabase](https://supabase.com) account and a project. Reuse the project you use for other
  Yare Monster apps if you have one: this app's tables are prefixed `yaremeet_`.
- A [Cloudflare](https://cloudflare.com) account.
- Optional: a domain whose DNS you control.

## 2. Get the code

**On your computer**: clone the repository and work in this folder, or copy just this folder.

```sh
git clone https://github.com/YareMonster/YareMonster.git
cd YareMonster/apps/yare-meet
npm install
```

## 3. Database

**On your computer**, sign in to Supabase once, then let the app push its own migrations. The
script reads your project from `.env` (step 4, so do that first), applies only the files your
project has not seen, and works whether the project is empty or already holds other Yare Monster
apps.

```sh
npx supabase login
npm run db:push
```

Without the CLI: open each file in `supabase/migrations/` in order, paste it into Supabase → SQL
Editor, run it. The files are safe to run twice.

## 4. Environment variables

**On your computer**, copy `.env.example` to `.env` and fill in:

| Variable | Public or secret | Where to find it |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Public | Supabase → Project Settings → Data API → Project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Public | Supabase → Project Settings → API Keys → Publishable key |

Both end up in the browser bundle. Never put a secret or service-role key in a `VITE_` variable.

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
npm run dev            # http://localhost:4605
```

The sign-in screen offers **Create your account**; use the email you allowed. If your Supabase
project requires email confirmation (the default), confirm the email it sends, then sign in.

## 6. Deploy to Cloudflare

**Option A, on your computer:** `npm run build` then `npx wrangler deploy`.

**Option B, from GitHub:** Cloudflare dashboard → Workers & Pages → Create → Import a repository.
Root directory `apps/yare-meet`, build command `npm run build`, deploy command
`npx wrangler deploy`, build variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.

## 7. Your domain (optional)

Worker → Settings → Domains & Routes → Add → Custom domain. If the domain's DNS is on Cloudflare,
that is all; otherwise create the CNAME it shows you.

## 8. Check

1. The address loads over HTTPS and shows the Yare Meet sign-in with its lockup.
2. Your account signs in. A private window, signed out, shows the sign-in screen only.
3. "Create your account" with an email that is not on the list is refused.
4. Help → About Yare Meet opens the credit dialog.

## Updating, backups, troubleshooting

See [the launcher's guide](../yare-launcher/DEPLOYMENT.md) for the shared procedures; this app has no data of its own.
