---
name: sign-deploy
description: Deploy Yare Sign to the person's own Cloudflare account, optionally on their domain, and verify it. Use after the install skill.
---

# Deploy Yare Sign

## Rules

- You are working in the person's own accounts. Yare Monster is source code they run themselves; it does not provide hosting, accounts or services and never receives their data or keys.
- Stop and hand the person the exact command when a tool needs a sign-in (`gh auth login`, `npx supabase login`, `npx wrangler login`) or asks for the database password. Never ask them to paste a password or a secret key into the chat.
- Only the two public Supabase values go into `.env`: `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_…`, or the legacy anon key). Refuse anything that starts with `sb_secret_` or is called service role.
- Do not change application code. `.env` and `wrangler.jsonc` are the only files you edit.
- Report every address you produce. The person opens it themselves.
- Folder: `apps/yare-sign`. Its `README.md` and `DEPLOYMENT.md` win if anything here disagrees.

## Steps

1. **Cloudflare sign-in.** Check `npx wrangler whoami`. If not signed in, give the person `npx wrangler login` to run themselves; it opens a browser.
2. **Build and deploy.** In `apps/yare-sign`, with `.env` in place:
   ```sh
   npm run build
   npx wrangler deploy
   ```
   Wrangler prints an address ending in `workers.dev`. Report it.
3. **Verify.** The address loads over HTTPS, shows the sign-in screen with the app's lockup, and the person can sign in. A signing link opened in a private window shows the document, the signature pad works, and the signature appears under Signatures. The page ends with "Pwrd by Yare Monster".
4. **Custom domain, if they want one.** Cloudflare dashboard → Workers & Pages → `yare-sign` → Settings → Domains & Routes → Add → Custom domain. If the domain's DNS is not on Cloudflare, create the CNAME Cloudflare shows. The person does this in their dashboard; tell them where to click.
   After the first deployment, the person puts the final address under Connections → Email so the links in the emails use it.

## Alternative: deploy from GitHub

Cloudflare dashboard → Workers & Pages → Create → Import a repository → their copy of the repository. Root directory `apps/yare-sign`, build command `npm run build`, deploy command `npx wrangler deploy`, build variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Every push to the chosen branch redeploys.
