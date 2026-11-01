# Deploying Yare Sign

From nothing to Yare Sign running at your own address, in about 25 minutes. Follow it yourself or
hand it to an AI assistant. You sign in to Supabase and Cloudflare yourself when asked; nothing
here needs a credential sent to anyone.

Commands marked **on your computer** run in a terminal inside this folder (`apps/yare-sign`).

## 1. Accounts

- A [Supabase](https://supabase.com) account and a project. Reuse the project you use for other
  Yare Monster apps if you have one: this app's tables are prefixed `yaresign_`.
- A [Cloudflare](https://cloudflare.com) account.
- Optional: a [Resend](https://resend.com) account and a domain you own, for sending email.
- Optional: a domain whose DNS you control, for your own address.

## 2. Get the code

**On your computer**: clone the repository and work in this folder, or copy just this folder.

```sh
git clone https://github.com/YareMonster/YareMonster.git
cd YareMonster/apps/yare-sign
npm install
```

## 3. Database and functions

**On your computer**, sign in to Supabase once, then let the app push its own migrations. The
script reads your project from `.env` (step 4, so do that first), applies only the files your
project has not seen, and works whether the project is empty or already holds other Yare Monster
apps.

```sh
npx supabase login
npm run db:push
```

Then deploy the two small functions that live in your project. One hands signers a short-lived
link to their document; the other sends the emails. Replace `<ref>` with your project ref, the
part before `.supabase.co` in your project URL.

```sh
npx supabase functions deploy yaresign-file --project-ref <ref>
npx supabase functions deploy yaresign-send --project-ref <ref>
```

Without the CLI: open each file in `supabase/migrations/` in order, paste it into Supabase → SQL
Editor, run it. The functions need the CLI.

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

The list is shared by every Yare Monster app in the project, so one entry opens all of them.

Then:

```sh
npm run dev            # http://localhost:4602
```

The sign-in screen offers **Create your account**; use the email you allowed. If your Supabase
project requires email confirmation (the default), confirm the email it sends, then sign in. Press
**New document**, upload a PDF, add yourself as a signer with a signature field, send it, open the
link from Share in a private window and sign. The signature appears under Signatures.

## 6. Email (optional)

Yare Sign works without email: you copy each link from Share and send it yourself. To let it send:

1. Create a free account at [resend.com](https://resend.com), add the domain you send from and
   create the three DNS records it shows.
2. Create an API key with sending permission.
3. **On your computer**, give the key to your project. It is a secret of the project, never a
   `VITE_` variable:
   ```sh
   npx supabase secrets set RESEND_API_KEY=<the key> --project-ref <ref>
   ```
4. In the app, under Connections → Email, fill in the sender address (on that domain) and this
   deployment's address (steps 7 and 8 below), save, and send yourself a test.

## 7. Deploy to Cloudflare

**Option A, on your computer:** `npm run build` then `npx wrangler deploy`.

**Option B, from GitHub:** Cloudflare dashboard → Workers & Pages → Create → Import a repository.
Root directory `apps/yare-sign`, build command `npm run build`, deploy command
`npx wrangler deploy`, build variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.

## 8. Your domain (optional)

Worker → Settings → Domains & Routes → Add → Custom domain. If the domain's DNS is on Cloudflare,
that is all; otherwise create the CNAME it shows you. Then put the final address under
Connections → Email so the links in the emails use it.

## 9. Check

1. The address loads over HTTPS and shows the Yare Sign sign-in with its lockup.
2. Your account signs in. A private window, signed out, shows the sign-in screen only.
3. "Create your account" with an email that is not on the list is refused.
4. Create a document set, upload a PDF, add a signer with a signature field, send it, and open
   the signer's link in a private window: the document shows, the signature pad works, and after
   "Finish signing" the Signatures tab shows the signature. The page ends with "Pwrd by Yare Monster".
5. Download the signed PDF from Signatures: the signature is on the page.
6. If email is set up: "Send me a test" under Connections → Email arrives in your inbox.
7. The monster button in the sidebar opens the credit dialog.

## Updating

Pull the new version (or copy the new folder over this one, keeping `.env`), read "What changed"
in the README, run `npm run db:push` for any new migrations, deploy the functions again if their
folder changed, then `npm install`, `npm run build`, `npx wrangler deploy`.

## Backing up and restoring

Supabase → Table Editor → export the six `yaresign_` tables as CSV, and download the `yare-sign`
bucket from Storage. To restore, import the CSVs into the same tables in this order: envelopes,
documents, participants, fields, events, settings; then upload the PDFs back to the same paths. The
free Supabase plan has no automatic backups; paid plans do.

## Troubleshooting

- **"Almost there" screen**: a `VITE_` variable is missing or still a placeholder. Fix `.env` (local)
  or the build variables (Cloudflare), rebuild, redeploy.
- **"This email is not on the list"**: run the `yare_allow_email` step for that email, then try
  again.
- **A signer's page says "Could not open the document"**: the `yaresign-file` function is not
  deployed, or the document was removed. Deploy the functions (step 3).
- **Connections → Email says "Could not check"**: the `yaresign-send` function is not deployed.
- **Emails do not arrive**: the secret is missing (`npx supabase secrets list --project-ref <ref>`),
  the sender address is not on a domain verified in Resend, or Resend refused it. The Signatures
  tab's timeline shows "Email could not be sent" with the reason.
- **"It is not your turn to sign"**: the signing order is on and someone before this person has
  not signed yet.
- **Upload refused**: PDF only, up to 20 MB, not password-protected.
- **Project paused**: free Supabase projects pause after seven days idle. Resume in the dashboard.

## Costs and limits

The code is free. For one person's use, Cloudflare's, Supabase's and Resend's free plans are
enough. PDFs count against Supabase storage; a few contracts are nothing, thousands of scans are
not. Check the providers' pricing pages for current limits.
