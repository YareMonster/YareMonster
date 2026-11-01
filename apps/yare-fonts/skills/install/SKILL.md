---
name: fonts-install
description: Install Yare Fonts on the person's computer and prepare it to deploy. It has no database. Use when they ask to install, set up or self-host Yare Fonts.
---

# Install Yare Fonts

Yare Fonts is one folder of the Yare Monster repository and runs on its own. Node.js 20 or newer is required.

## Rules

- You are working in the person's own accounts. Yare Monster is source code they run themselves; it does not provide hosting, accounts or services and never receives their data or keys.
- Stop and hand the person the exact command when a tool needs a sign-in (`gh auth login`, `npx supabase login`, `npx wrangler login`) or asks for the database password. Never ask them to paste a password or a secret key into the chat.
- Only the two public Supabase values go into `.env`: `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_…`, or the legacy anon key). Refuse anything that starts with `sb_secret_` or is called service role.
- Do not change application code. `.env` and `wrangler.jsonc` are the only files you edit.
- Report every address you produce. The person opens it themselves.
- Folder: `apps/yare-fonts`. Its `README.md` and `DEPLOYMENT.md` win if anything here disagrees.

## Steps

1. **Get the code.** If the person has their own copy of the repository, clone that; otherwise clone the official one.
   ```sh
   git clone https://github.com/YareMonster/YareMonster yare
   cd yare/apps/yare-fonts
   npm install
   ```
2. **Run it locally and check.** This app has no database and no sign-in. `npm run dev` serves http://localhost:4618; the person opens it and checks it loads.
3. Continue with the `deploy` skill when they want it online.

## If something goes wrong

- "Almost there" screen: a `.env` value is missing or still a placeholder. Fix it and restart.
