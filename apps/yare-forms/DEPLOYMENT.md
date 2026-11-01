# Deploying Yare Forms

From nothing to Yare Forms running at your own address, in about 20 minutes. Follow it yourself or
hand it to an AI assistant. You sign in to Supabase and Cloudflare yourself when asked; nothing
here needs a credential sent to anyone.

Commands marked **on your computer** run in a terminal inside this folder (`apps/yare-forms`).

## 1. Accounts

- A [Supabase](https://supabase.com) account and a project. Reuse the project you use for other
  Yare Monster apps if you have one: this app's tables are prefixed `yareforms_`.
- A [Cloudflare](https://cloudflare.com) account.
- Optional: a domain whose DNS you control.

## 2. Get the code

**On your computer**: clone the repository and work in this folder, or copy just this folder.

```sh
git clone https://github.com/YareMonster/YareMonster.git
cd YareMonster/apps/yare-forms
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
npm run dev            # http://localhost:4601
```

The sign-in screen offers **Create your account**; use the email you allowed. If your Supabase
project requires email confirmation (the default), confirm the email it sends, then sign in. Press
**New form**, publish it, open its link in a private window and answer it; the response appears
under Responses. Note that **Preview** (the eye button) never records answers; use the real link
from the Share tab to test recording.

## 6. Deploy to Cloudflare

**Option A, on your computer:** `npm run build` then `npx wrangler deploy`.

**Option B, from GitHub:** Cloudflare dashboard → Workers & Pages → Create → Import a repository.
Root directory `apps/yare-forms`, build command `npm run build`, deploy command
`npx wrangler deploy`, build variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.

## 7. Your domain (optional)

Worker → Settings → Domains & Routes → Add → Custom domain. If the domain's DNS is on Cloudflare,
that is all; otherwise create the CNAME it shows you.

## 8. Check

1. The address loads over HTTPS and shows the Yare Forms sign-in with its lockup.
2. Your account signs in. A private window, signed out, shows the sign-in screen only.
3. "Create your account" with an email that is not on the list is refused.
4. Create a form, publish it, and open `/f/<slug>` in a private window: the form runs, the
   answers appear under Responses, and the page ends with "Pwrd by Yare Monster".
5. Unpublish it: the same link now says "This form isn't open".
6. Upload a logo in Settings: it appears at the top of the published form (the image is in
   Supabase → Storage → yare-images → yare-forms).
7. The monster button in the sidebar opens the credit dialog.

## Updating

Pull the new version (or copy the new folder over this one, keeping `.env`), read "What changed"
in the README, run any new files in `supabase/migrations/` (`npm run db:push`), then
`npm install`, `npm run build`, `npx wrangler deploy`.

## Backing up and restoring

Supabase → Table Editor → export `yareforms_forms`, `yareforms_blocks` and `yareforms_responses`
as CSV, and download the `yare-forms` folder from Storage → `yare-images`. The Responses tab also
exports any form's answers as CSV. To restore, import the CSVs into the same tables (forms first,
then blocks, then responses) and upload the images back to the same paths. The free Supabase plan
has no automatic backups; paid plans do.

## Troubleshooting

- **"Almost there" screen**: a `VITE_` variable is missing or still a placeholder. Fix `.env` (local)
  or the build variables (Cloudflare), rebuild, redeploy.
- **"This email is not on the list"**: run the `yare_allow_email` step for that email, then try
  again. Supabase → Table Editor → `yare_allowed_emails` shows who is allowed.
- **A published form says "This form isn't open"**: it is a draft, or the slug in the link is old.
  Check the Share tab.
- **Images do not upload**: the `yare-images` bucket or its policies are missing. Run the
  migrations again; they are idempotent. Files over 2 MB and non-image types are refused by design.
- **Embedding shows a blank frame**: the host page blocks frames, or `public/_headers` was changed.
  Published forms allow framing under `/f/*`.
- **Project paused**: free Supabase projects pause after seven days idle. Resume in the dashboard.

## Costs and limits

The code is free. For one person's use, Cloudflare's and Supabase's free plans are enough. Images
count against Supabase storage and bandwidth; a few logos are nothing, thousands of welcome
pictures are not. Check the providers' pricing pages for current limits.
