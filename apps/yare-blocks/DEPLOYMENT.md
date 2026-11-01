# Deploying Yare Blocks

Yare Blocks is static: no database, no sign-in. The deployment is the build and the upload.

## On your computer

```sh
cd apps/yare-blocks
npm install
npm run dev            # http://localhost:4611
npm run build          # writes dist/
npx wrangler deploy    # signs you in to Cloudflare the first time
```

## From GitHub

Cloudflare dashboard → Workers & Pages → Create → Import a repository. Root directory
`apps/yare-blocks`, build command `npm run build`, deploy command `npx wrangler deploy`.

## Your domain

Worker → Settings → Domains & Routes → Add → Custom domain. Cloudflare issues the certificate.

## Check

The address loads over HTTPS and shows the Yare Blocks shell. Help → About Yare Blocks opens the credit.
