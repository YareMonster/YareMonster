# Yare Sign

A simpler way to get things signed. Upload a PDF, place the fields, add the people, send. The
signatures land in your own database and the signed copy is yours to download.

**Status:** In progress. Documents, fields, participants, signing order, the signing page,
the signed PDF, status and the audit trail work. Email through your own Resend account is optional.

Part of [Yare Monster](https://yare.monster), created by Orlando Pedro.
Free to self-host for personal use and for your own business under the
[Yare Monster Community License](LICENSE). This folder is self-contained: copy it, follow
[DEPLOYMENT.md](DEPLOYMENT.md), and it runs on your own accounts.

## What it does

- **Documents**: upload one or several PDFs to a document set. Word or Pages? Export to PDF first.
- **Fields**: signature, name, date and text boxes, placed on any page by clicking, moved by
  dragging, each assigned to one person with that person's colour. Preview exactly what each
  participant will see.
- **Participants**: people who sign and people who only receive the copy. First name, surname,
  email, company and position. A switch sets the signing order: one after the other, or all at once.
- **Send**: publishing freezes the documents and creates one private link per signer. If email is
  set up, the first signers get their link by email right away; otherwise copy each link from the
  Share tab and send it yourself.
- **Signing page**: the documents with the fields, a panel that lists what to fill in, a signature
  pad to draw or type, a typed full name and a consent switch. When the order is on, each signer
  sees the signatures before theirs. No account needed.
- **Status**: who opened, who signed and when, a timeline of everything that happened, and the
  signed PDF composed in your browser from the original plus the signatures.
- **Email, optional**: your own [Resend](https://resend.com) account sends the links, the
  "your turn" messages, a note to you at every signature and the completed copy to everyone.

## What it does not do

- No Word files, no code verification by email, no stamped certificate page, no templates, no
  reminders. One account per deployment.

## What you need

| Service | Why | Cost |
| --- | --- | --- |
| [Supabase](https://supabase.com) project | Documents, participants, signatures, your sign-in, and the two small functions that serve documents to signers and send email | Free plan is enough for personal use |
| [Cloudflare](https://cloudflare.com) account | Hosting the static build | Free plan |
| [Resend](https://resend.com) account (optional) | Sending the emails from a domain you own | Free for 3,000 emails a month |
| A domain (optional) | Your own address instead of `*.workers.dev`, and the sender address for email | Your registrar's price |

Node.js 20 or newer on your computer to build it.

## Install it with your AI assistant

Hand this folder to your assistant and say:

> Make the `apps/yare-sign` folder the root of my project. Follow its DEPLOYMENT.md. I will give you
> my Supabase project URL and publishable key, and I will sign in to Supabase and Cloudflare myself
> when you ask.

Or sign in to the app and press **Setup guide** under Connections for a ready-made file.

## Run it locally

```sh
# in this folder
cp .env.example .env     # then fill in the two values (see DEPLOYMENT.md, step 4)
npm install
npm run dev              # http://localhost:4602
```

Other scripts: `npm run check` (TypeScript), `npm run build`, `npm run preview`, `npm run deploy`,
`npm run db:link` and `npm run db:push` (Supabase CLI).

## Where things are

```
src/App.tsx                          routes: /s/:token is a signer's page, everything else needs sign-in
src/features/Shell.tsx               the sidebar: Home, Connections, Your documents
src/features/HomePage.tsx            the dashboard
src/features/ConnectionsPage.tsx     Connections plus the Email block
src/features/envelope/EnvelopePage.tsx  a document set: Build / Participants / Settings / Share / Signatures
src/features/envelope/*Tab.tsx       the five tabs
src/features/envelope/PreviewPage.tsx   what a participant sees, for the owner
src/features/pdf/PdfPages.tsx        the page viewer with the field boxes (editor, preview, signing)
src/public/SigningPage.tsx           a participant's page, loaded through their token
src/public/SigningView.tsx           the signing layout (shared with the preview)
src/lib/sign-api.ts                  every database and function call
src/lib/pdf.ts                       pdf.js: open, inspect, render
src/lib/compose.ts                   pdf-lib: draw the signatures onto the PDF
src/lib/supabase.ts                  the typed client and the row types
src/yare/                            the shared Yare Monster design system (generated copy)
supabase/migrations/                 one owner, the tables and functions, the allow list
supabase/functions/yaresign-send     Edge Function: the emails
supabase/functions/yaresign-file     Edge Function: short-lived links to documents for signers
.env.example                         both environment variables, explained
wrangler.jsonc                       Cloudflare configuration
public/_headers                      security headers
skills/                              guide, install, deploy, update, backup: instructions for AI assistants
```

## Data

Everything lives in your own Supabase project. Yare Monster has no access to your project, your
data or your keys; nothing is sent anywhere else.

Six tables, all prefixed `yaresign_`:

- `yaresign_envelopes`: one row per document set (title, status, signing order, message).
- `yaresign_documents`: the PDFs of a set, with page count and page sizes.
- `yaresign_participants`: the people, with their role, their secret link token and their status.
- `yaresign_fields`: the boxes on the pages, each for one participant, with the value once signed.
- `yaresign_events`: what happened, in order: sent, emailed, opened, signed, completed.
- `yaresign_settings`: your sender address and this deployment's address, for the emails.

Row-level security keeps everything to your account, and only emails on the deployment's allow
list (`yare_allowed_emails`, filled during setup) can create an account. Signers never touch the
tables: they read and write through two database functions that check their token. The PDFs live
in the private bucket `yare-sign`; a signer gets a ten-minute link to their document from the
`yaresign-file` function after their token is checked. Signature images are stored with the fields.

The Resend key is a Supabase secret set from your own terminal. It is never in the app, the code,
the database or the browser.

## What changed

- **v0.1.0** (20 October 2026): first working version. Documents, fields, participants, signing
  order, sending, the signing page, the signed PDF, status, audit trail, optional email.

## Credit

Yare Usign is part of Yare Monster, created by Orlando Pedro. See [ATTRIBUTION.md](../../ATTRIBUTION.md)
in the repository.

Every signing page ends with "Pwrd by Yare Monster", as the licence asks. The monster button in
the sidebar opens the About dialog.
