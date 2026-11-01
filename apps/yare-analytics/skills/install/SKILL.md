---
name: analytics-install
description: Install Yare Analytics on the person's own Supabase project and prepare it to deploy. Use when they ask to install, set up or self-host Yare Analytics.
---

# Install Yare Analytics

Yare Analytics is one folder of the Yare Monster repository and runs on its own. Node.js 20 or newer is required.

## Rules

- You are working in the person's own accounts. Yare Monster is source code they run themselves; it does not provide hosting, accounts or services and never receives their data or keys.
- Stop and hand the person the exact command when a tool needs a sign-in (`gh auth login`, `npx supabase login`, `npx wrangler login`) or asks for the database password. Never ask them to paste a password or a secret key into the chat.
- Only the two public Supabase values go into `.env`: `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_…`, or the legacy anon key). Refuse anything that starts with `sb_secret_` or is called service role.
- Do not change application code. `.env` and `wrangler.jsonc` are the only files you edit.
- Report every address you produce. The person opens it themselves.
- Folder: `apps/yare-analytics`. Its `README.md` and `DEPLOYMENT.md` win if anything here disagrees.

## Steps

1. **Get the code.** If the person has their own copy of the repository, clone that; otherwise clone the official one.
   ```sh
   git clone https://github.com/YareMonster/YareMonster yare
   cd yare/apps/yare-analytics
   npm install
   ```
2. **Configuration.** Ask for the Supabase project URL and the publishable key (Supabase → Project Settings → Data API and API Keys). Write `.env`:
   ```
   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=<publishable key>
   ```
3. **Database.** Push this app's migrations (tables prefixed `yareanalytics_`). The app's own script reads the project from `.env`, applies only the files the project has not seen, and works whether the project is empty or already holds other Yare Monster apps. The CLI must be signed in first.
   ```sh
   npx supabase login
   npm run db:push
   ```
   If the CLI asks the person for anything, hand them the command to run themselves.
4. **Allow the person's email.** Only emails on the allow list can create an account.
   ```sh
   npx supabase db query "select public.yare_allow_email('<their email>')" --linked
   ```
5. **Run it locally and check.** `npm run dev` serves http://localhost:4610. The person opens it, chooses **Create your account** with that email, confirms the email if Supabase asks, and signs in.
6. Continue with the `deploy` skill when they want it online.

## If something goes wrong

- "This email is not on the list": run step 4 for that email and try again.
- "That email already has an account": the person signs in instead of creating one.
- Migration errors: run the push again; the files are safe to repeat.
- "Almost there" screen: a `.env` value is missing or still a placeholder. Fix it and restart.
