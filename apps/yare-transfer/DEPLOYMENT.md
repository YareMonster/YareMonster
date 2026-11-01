# Deploying Yare Transfer

From nothing to Yare Transfer running at your own address, in about 20 minutes. Follow it yourself
or hand it to an AI assistant. You sign in to Supabase and Cloudflare yourself when asked; nothing
here needs a credential sent to anyone.

Commands marked **on your computer** run in a terminal inside this folder (`apps/yare-transfer`).

## 1. Accounts

- A [Supabase](https://supabase.com) account and a project. Reuse the project you use for other
  Yare Monster apps if you have one: this app's tables are prefixed `yaretransfer_`.
- A [Cloudflare](https://cloudflare.com) account.
- Optional: a domain whose DNS you control.

## 2. Get the code

**On your computer**: clone the repository and work in this folder, or copy just this folder.

```sh
git clone https://github.com/YareMonster/YareMonster.git
cd YareMonster/apps/yare-transfer
npm install
```

## 3. Database and function

**On your computer**, sign in to Supabase once, then let the app push its own migrations. The
script reads your project from `.env` (step 4, so do that first).

```sh
npx supabase login
npm run db:push
```

Then deploy the function that hands recipients their files and removes expired ones. Replace
`<ref>` with your project ref, the part before `.supabase.co` in your project URL.

```sh
npx supabase functions deploy yaretransfer-file --project-ref <ref>
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
npm run dev            # http://localhost:4606
```

The sign-in screen offers **Create your account**; use the email you allowed. If your Supabase
project requires email confirmation (the default), confirm the email it sends, then sign in. Press
**New transfer**, drop a file, publish, open the link from Share in a private window and download
it. The download appears under Downloads.

## 6. Deploy to Cloudflare

**Option A, on your computer:** `npm run build` then `npx wrangler deploy`.

**Option B, from GitHub:** Cloudflare dashboard → Workers & Pages → Create → Import a repository.
Root directory `apps/yare-transfer`, build command `npm run build`, deploy command
`npx wrangler deploy`, build variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.

## 7. Your domain (optional)

Worker → Settings → Domains & Routes → Add → Custom domain. If the domain's DNS is on Cloudflare,
that is all; otherwise create the CNAME it shows you.

## 8. Check

1. The address loads over HTTPS and shows the Yare Transfer sign-in with its lockup.
2. Your account signs in. A private window, signed out, shows the sign-in screen only.
3. "Create your account" with an email that is not on the list is refused.
4. Create a transfer with two files, publish, open `/t/<slug>` in a private window: the page shows
   the files, each downloads, "Download all" gives a zip, and the page ends with "Pwrd by Yare Monster".
5. Set a password in Settings: the page asks for it first.
6. Close the link: the same address says "not open".
7. The monster button in the sidebar opens the credit dialog.

## Updating

Pull the new version (or copy the new folder over this one, keeping `.env`), read "What changed"
in the README, run `npm run db:push` for any new migrations, deploy the function again if its
folder changed, then `npm install`, `npm run build`, `npx wrangler deploy`.

## Backing up and restoring

Transfers are meant to expire, so there is little to keep. Supabase → Table Editor → export
`yaretransfer_transfers` and `yaretransfer_files` as CSV if you want the record; the files of a
live transfer are in Storage → `yare-transfer`, one folder per transfer, until they expire.

## Troubleshooting

- **"Almost there" screen**: a `VITE_` variable is missing or still a placeholder.
- **"This email is not on the list"**: run the `yare_allow_email` step for that email.
- **Upload refused, "over the limit your Supabase plan allows"**: the file is bigger than your plan's
  ceiling (50 MB per file on the free plan), whatever the app's own limit says.
- **A recipient cannot download**: the `yaretransfer-file` function is not deployed (step 3), or the
  link expired.
- **The page says "not open"**: the transfer is a draft, expired, or the address is old. Check Share.
- **Project paused**: free Supabase projects pause after seven days idle. Resume in the dashboard.

## Costs and limits

The code is free. For one person's use, Cloudflare's and Supabase's free plans are enough. Files
count against Supabase storage and bandwidth; the free plan has 1 GB of storage and a monthly
transfer allowance. Expired transfers free their space. Check the providers' pricing pages for
current limits.
