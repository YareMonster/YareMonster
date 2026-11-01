# Deploying Yare Pages

From nothing to Yare Pages running at your own address, in about 20 minutes. Follow it yourself or
hand it to an AI assistant. You sign in to Supabase and Cloudflare yourself when asked; nothing
here needs a credential sent to anyone.

Commands marked **on your computer** run in a terminal inside this folder (`apps/yare-pages`).

## 1. Accounts

- A [Supabase](https://supabase.com) account and a project. Reuse the project you use for other
  Yare Monster apps if you have one: this app's tables are prefixed `yarepages_`.
- A [Cloudflare](https://cloudflare.com) account.
- Optional: a domain whose DNS you control.

## 2. Get the code

**On your computer**: clone the repository and work in this folder, or copy just this folder.

```sh
git clone https://github.com/YareMonster/YareMonster.git
cd YareMonster/apps/yare-pages
npm install
```

## 3. Database and function

**On your computer**, sign in to Supabase once, then let the app push its own migrations. The
script reads your project from `.env` (step 4, so do that first).

```sh
npx supabase login
npm run db:push
```

Then deploy the function that reads your websites' visitors from Cloudflare. Replace `<ref>` with
your project ref, the part before `.supabase.co` in your project URL.

```sh
npx supabase functions deploy yarepages-sync --project-ref <ref>
```

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

Then:

```sh
npm run dev            # http://localhost:4603
```

The sign-in screen offers **Create your account**; use the email you allowed. If your Supabase
project requires email confirmation (the default), confirm the email it sends, then sign in.

## 6. Your Cloudflare token, for the visitors

Cloudflare → My Profile → API Tokens → Create Token → Custom token, with three permissions, all
**Read**: Zone → Zone, Zone → Analytics, Account → Account Analytics. In the app, under
Connections → Visitors, paste the token and press Save. It goes to your own database, where only
the sync function can read it.

Then press **New website** → "Add one I already have", paste the address of a site whose domain is
on your Cloudflare, and the visitors appear after the read. A site hosted elsewhere shows visitors
once it carries Cloudflare Web Analytics (Cloudflare → Web Analytics → Add a site → one script line
on the page).

Prefer the terminal? `npx supabase secrets set CLOUDFLARE_API_TOKEN=<token> --project-ref <ref>`
works too and wins over a pasted token.

## 7. Deploy to Cloudflare

**Option A, on your computer:** `npm run build` then `npx wrangler deploy`.

**Option B, from GitHub:** Cloudflare dashboard → Workers & Pages → Create → Import a repository.
Root directory `apps/yare-pages`, build command `npm run build`, deploy command
`npx wrangler deploy`, build variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.

## 8. Your domain (optional)

Worker → Settings → Domains & Routes → Add → Custom domain. If the domain's DNS is on Cloudflare,
that is all; otherwise create the CNAME it shows you.

## 9. Check

1. The address loads over HTTPS and shows the Yare Pages sign-in with its lockup.
2. Your account signs in. A private window, signed out, shows the sign-in screen only.
3. "Create your account" with an email that is not on the list is refused.
4. Connections → Visitors shows Cloudflare as "Key in place".
5. Add a website whose domain is on your Cloudflare: visits, page views and the chart appear.
6. New website → Build a new one → Download the guide: the file arrives.
7. The monster button in the sidebar opens the credit dialog.

## Updating

Pull the new version (or copy the new folder over this one, keeping `.env`), read "What changed"
in the README, run `npm run db:push` for any new migrations, deploy the function again if its
folder changed, then `npm install`, `npm run build`, `npx wrangler deploy`.

## Backing up and restoring

Supabase → Table Editor → export `yarepages_sites` as CSV; that is the list, the checklists and
the notes. The figures are rebuilt by a read. Pictures you uploaded are in Storage → `yare-images`
→ `yare-pages`. The websites themselves live in your GitHub and your Cloudflare.

## Troubleshooting

- **"Almost there" screen**: a `VITE_` variable is missing or still a placeholder.
- **"This email is not on the list"**: run the `yare_allow_email` step for that email.
- **"Add your Cloudflare token"**: paste it under Connections → Visitors, or the function is not
  deployed (step 3).
- **A website says "Could not read"**: the message beside it says why. "Cloudflare did not accept
  the token" means the token is wrong or lacks a permission.
- **"No visitor source"**: the domain is not on your Cloudflare account and the page carries no
  Cloudflare Web Analytics. Add one or the other.
- **No picture**: the page has no social image. Upload one under Settings.
- **Project paused**: free Supabase projects pause after seven days idle. Resume in the dashboard.

## Costs and limits

The code is free. For one person's use, Cloudflare's and Supabase's free plans are enough. A read
of a website makes a handful of Cloudflare calls. Check the providers' pricing pages for current
limits.
