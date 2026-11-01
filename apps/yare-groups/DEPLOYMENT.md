# Deploying Yare Groups

From nothing to Yare Groups running at your own address, in about 20 minutes. Follow it yourself or
hand it to an AI assistant. You sign in to Supabase and Cloudflare yourself when asked; nothing
here needs a credential sent to anyone.

Commands marked **on your computer** run in a terminal inside this folder (`apps/yare-groups`).

## 1. Accounts

- A [Supabase](https://supabase.com) account and a project. Reuse the project you use for other
  Yare Monster apps if you have one: this app's tables are prefixed `yaregroups_`.
- A [Cloudflare](https://cloudflare.com) account.
- Optional: a domain whose DNS you control.

## 2. Get the code

**On your computer**: clone the repository and work in this folder, or copy just this folder.

```sh
git clone https://github.com/YareMonster/YareMonster.git
cd YareMonster/apps/yare-groups
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
npm run dev            # http://localhost:4621
```

Sign in with the email you allowed (the first time, use **Forgot your password?** to set one, or
create the account from any other Yare Monster app on the same project). The first operator to
sign in becomes the owner: the group is created with a `welcome` and a `general` channel, and the
gear in the channel list opens **Manage**. Every other allow-listed email becomes an admin when it
signs in.

## 6. The function that lets people join

Members are not on the allow list, so their accounts are created by an Edge Function in your own
project. **On your computer**:

```sh
npx supabase functions deploy yaregroups-join --project-ref <your-project-ref>
```

Without it, invite links cannot create accounts; admins can still sign in.

## 7. Deploy to Cloudflare

**Option A, on your computer:** `npm run build` then `npx wrangler deploy`.

**Option B, from GitHub:** Cloudflare dashboard → Workers & Pages → Create → Import a repository.
Root directory `apps/yare-groups`, build command `npm run build`, deploy command
`npx wrangler deploy`, build variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.

## 8. Your domain (optional)

Worker → Settings → Domains & Routes → Add → Custom domain. If the domain's DNS is on Cloudflare,
that is all; otherwise create the CNAME it shows you.

## 9. Check

1. The address loads over HTTPS and shows the group's sign-in page with its name and theme.
2. Your account signs in and sees the channels. A private window, signed out, shows the sign-in
   page only.
3. Manage → Invites → New invite link. Opened in a private window, the link offers **Join the
   group**; a test member can create an account and post in #general.
4. Manage → the monster button → About Yare Groups opens the credit dialog.

## Updating, backups, troubleshooting

See [the launcher's guide](../yare-launcher/DEPLOYMENT.md) for the shared procedures. The `skills/` folder has the backup and update
steps written for assistants; the data worth keeping is the tables prefixed `yaregroups_`, the
`channels` folder of the `yare-groups` bucket and the `yare-groups` folder of `yare-images`.
