# Yare Monster

**Useful apps you run on your own accounts. Your infrastructure, your data.**

Forms, a link page, a community, file transfer, signatures, bookings, invoices and more: each one an
independent app you deploy yourself on a free Supabase project and a free Cloudflare account. No
subscription, no third party in the middle, nothing leaves your accounts.

Created by Orlando Pedro · [yare.monster](https://yare.monster) · [Licence](LICENSE)

Last updated: 1 November 2026

## The apps

| App | What it does | Folder |
| --- | --- | --- |
| Yare Forms | Forms as a sequence of screens, with every answer in your own database. | `apps/yare-forms` |
| Yare Links | Every link you have, on one page: a grid of blocks you place and size. | `apps/yare-links` |
| Yare Groups | Your community, in channels, with members, roles and invite links. | `apps/yare-groups` |
| Yare Transfer | Send files from your own storage, with links that expire. | `apps/yare-transfer` |
| Yare Sign | Documents signed on a page you host. | `apps/yare-sign` |
| Yare Pages | A site of your own, page by page. | `apps/yare-pages` |
| Yare Crypto | Your wallets and coins, read with keys that can only look. | `apps/yare-crypto` |
| Yare Launcher | Set up the whole collection on your accounts and keep track of it. | `apps/yare-launcher` |

### In development

Each of these runs, has its place in the collection and its own guides; its features are on the way.

| App | What it will do | Folder |
| --- | --- | --- |
| Yare Analytics | Visitors counted, nobody tracked. | `apps/yare-analytics` |
| Yare Bill | Simple invoices, sent in a minute. | `apps/yare-bill` |
| Yare Blocks | Your week in blocks, on paper. | `apps/yare-blocks` |
| Yare Book | Let people book a time with you. | `apps/yare-book` |
| Yare Canvas | Simple designs, exported. | `apps/yare-canvas` |
| Yare Coms | A chat bubble and your inbox. | `apps/yare-coms` |
| Yare Contacts | Keep your people in one place. | `apps/yare-contacts` |
| Yare Dash | Your Stripe numbers, charted. | `apps/yare-dash` |
| Yare Fit | Every session, written down. | `apps/yare-fit` |
| Yare Flash | Cards that come back when you need them. | `apps/yare-flash` |
| Yare Fonts | Free fonts, commercial use included. | `apps/yare-fonts` |
| Yare Lingo | A language, a little every day. | `apps/yare-lingo` |
| Yare Looks | Try a new look before you commit. | `apps/yare-looks` |
| Yare Meet | A little less back-and-forth. | `apps/yare-meet` |
| Yare Persona | An assistant that is yours. | `apps/yare-persona` |

[catalog.json](catalog.json) lists every app with its state and version.

## Install one app

Each app's folder is self-contained. You need Node.js 20 or newer, a Supabase project and a Cloudflare
account, both on their free plans.

```sh
git clone https://github.com/YareMonster/YareMonster
cd YareMonster/apps/yare-forms
npm install
cp .env.example .env            # the two public values of your Supabase project
npm run db:push                 # the app's tables and rules, in your project
npm run build && npx wrangler deploy
```

Then allow your own email to sign in, once, from the same folder:

```sh
npx supabase db query "select public.yare_allow_email('you@domain.com')" --linked
```

Each app's `README.md` says what it does, `DEPLOYMENT.md` says how to put it live, and the
`skills/` folder holds step-by-step guides written for AI assistants: give one to yours and it does
the install with you.

## How it is built

- One design system, [packages/ui](packages/ui), shared by every app and copied into each folder
  by `scripts/sync-ui.mjs`, so every app looks and behaves the same.
- One Supabase project is enough for all the apps: each one prefixes its tables and keeps its own
  rules, so they live side by side.
- One account per deployment. Only emails you allow can sign in; nobody else has an account.
- Nothing phones home. The only thing an app reads from Yare Monster is the published list of
  versions, to tell you when a newer one is out.

## Your accounts, your care

Everything an app connects to is yours: the code, the database, the hosting, the domains, the
bills. Yare Monster never sees your accounts, your keys or your data, and does not run or watch
your apps. That also means the care is yours: check what you deploy, keep your passwords to
yourself, back up what matters. Each app's `skills/backup` guide shows how.

## Licence

Yare Monster is source-available under the **Yare Monster Community License 1.0**. You may use it
for yourself and to run your own business, modify your copy for those uses, and share copies free
of charge under the same terms. You may not sell it, offer it as a paid hosted service, or build
it into paid products without written permission. The "Pwrd by Yare Monster" credit stays on
public pages. Everything comes as it is, with no warranty; you are responsible for your own
deployment, accounts and data. The full text is in [LICENSE](LICENSE); the required credit and
the third-party material are listed in [ATTRIBUTION.md](ATTRIBUTION.md).

One maintainer, no unsolicited contributions: see [CONTRIBUTING.md](CONTRIBUTING.md). Security
reports go to the address in [SECURITY.md](SECURITY.md).

Yare Monster · [yare.monster](https://yare.monster)
