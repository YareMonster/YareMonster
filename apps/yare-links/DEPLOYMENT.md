# Deploying Yare Links

From nothing to Yare Links running at your own address, in about 20 minutes. Follow it yourself or
hand it to an AI assistant. You sign in to Supabase and Cloudflare yourself when asked; nothing
here needs a credential sent to anyone.

Commands marked **on your computer** run in a terminal inside this folder (`apps/yare-links`).

## 1. Accounts

- A [Supabase](https://supabase.com) account and a project. Reuse the project you use for other
  Yare Monster apps if you have one: this app's tables are prefixed `yarelinks_`.
- A [Cloudflare](https://cloudflare.com) account.
- Optional: a domain whose DNS you control.

## 2. Get the code

**On your computer**: clone the repository and work in this folder, or copy just this folder.

```sh
git clone https://github.com/YareMonster/YareMonster.git
cd YareMonster/apps/yare-links
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
The list is shared by every Yare Monster app in the project, so one entry opens all of them.

Then:

```sh
npm run dev            # http://localhost:4622
```

The sign-in screen offers **Create your account**; use the email you allowed. If your Supabase
project requires email confirmation (the default), confirm the email it sends, then sign in.

## 6. Deploy to Cloudflare

**Option A, on your computer:** `npm run build` then `npx wrangler deploy`. The Worker (`worker.js`) ships with the assets: it fills each page's `<head>` for search engines, messaging apps and agents, reading the page through the same public function the browser uses, with the two public values the build writes to `dist/yare.json`.

**Option B, from GitHub:** Cloudflare dashboard → Workers & Pages → Create → Import a repository.
Root directory `apps/yare-links`, build command `npm run build`, deploy command
`npx wrangler deploy`, build variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.

## 7. Your domain (optional)

Worker → Settings → Domains & Routes → Add → Custom domain. If the domain's DNS is on Cloudflare,
that is all; otherwise create the CNAME it shows you.

## 8. Check

1. The address loads over HTTPS and shows the Yare Links sign-in with its lockup.
2. Your account signs in. A private window, signed out, shows the sign-in screen only.
3. New page, add a link, Publish, open the page's address in a private window: it shows, and a
   press on the link counts under Insights.
4. The monster button in the sidebar opens the About dialog.

## Updating, backups, troubleshooting

See [the launcher's guide](../yare-launcher/DEPLOYMENT.md) for the shared procedures. The `skills/` folder has the backup and update
steps written for assistants; the data worth keeping is the tables prefixed `yarelinks_` and the
`yare-links` folder of the `yare-images` bucket plus the `yare-links` bucket.

## The feed function

Feed blocks (YouTube, Substack) read their feeds through one Edge Function in your Supabase project. Deploy it once, after the migrations:

```sh
npx supabase functions deploy yarelinks-feed --project-ref <your-project-ref>
```

It keeps nothing and sends nothing about the visitor; it fetches the public feed and hands back the few fields a block shows.
