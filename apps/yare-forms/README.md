# Yare Forms

Forms that feel like a conversation: one question per screen, a theme you pick, a link you share.
The answers land in your own database.

**Status:** In progress. Building, publishing, answering, themes, logo, responses and CSV
export work.

Part of [Yare Monster](https://yare.monster), created by Orlando Pedro.
Free to self-host for personal use and for your own business under the
[Yare Monster Community License](LICENSE). This folder is self-contained: copy it, follow
[DEPLOYMENT.md](DEPLOYMENT.md), and it runs on your own accounts.

## What it does

- **Build** a form as a sequence of screens: a welcome (title, text, optional image, start button),
  and on any screen a picture beside the question: half and half on the left or the right, or
  full, taking its half of the page edge to edge;
  questions, and a thank-you screen. Question types: short answer, paragraph, email, number, date,
  multiple choice, checkboxes, dropdown, yes/no. Each question has a title, supporting text, a
  required switch and type-specific settings. Reorder and delete screens. Changes save as you type.
- **Publish** to a public address, `/f/<slug>`, or keep it as a draft. Unpublishing closes the link
  without deleting anything. Preview a draft before publishing.
- **Answer** on any device: one screen at a time, Enter to continue, a progress bar, inline
  validation (required, email shape, numbers, length). Respondents need no account.
- **Themes**: two neutral, five in Yare Monster's colours, two soft gradients. Add your logo. Every
  published form ends with the Yare Monster credit (part of the licence).
- **Share**: copy the link or an embed snippet for your own site.
- **Responses**: a table with one column per question, started and completed counts, completion
  rate and the screen where people drop off most. Include or hide unfinished responses. Export CSV.
  Delete single responses.

## What it does not do

- No file-upload question, no payments, no logic jumps between screens, no notifications by email.
- No team access: one account per deployment.
- Published forms are not indexed by search engines (`noindex` by default).

## What you need

| Service | Why | Cost |
| --- | --- | --- |
| [Supabase](https://supabase.com) project | Forms, screens, responses, images, and your sign-in | Free plan is enough for personal use |
| [Cloudflare](https://cloudflare.com) account | Hosting the static build | Free plan |
| A domain (optional) | Your own address instead of `*.workers.dev` | Your registrar's price |

Node.js 20 or newer on your computer to build it.

## Install it with your AI assistant

Hand this folder to your assistant and say:

> Make the `apps/yare-forms` folder the root of my project. Follow its DEPLOYMENT.md. I will give you
> my Supabase project URL, publishable key and, for the migrations, my database password, and I
> will sign in to Cloudflare myself when you ask.

Or sign in to the app and press **Setup guide** in the sidebar for a ready-made file.

## Run it locally

```sh
# in this folder
cp .env.example .env     # then fill in the two values (see DEPLOYMENT.md, step 4)
npm install
npm run dev              # http://localhost:4601
```

Other scripts: `npm run check` (TypeScript), `npm run build`, `npm run preview`, `npm run deploy`,
`npm run db:link` and `npm run db:push` (Supabase CLI).

## Where things are

```
src/App.tsx                     routes: /f/:slug is public, everything else needs sign-in
src/features/Shell.tsx          the sidebar: Home, Connections, Setup guide, Your forms
src/features/HomePage.tsx       the dashboard
src/features/form/FormPage.tsx  the form: top bar, Build / Settings / Share / Responses tabs
src/features/form/*Tab.tsx      the four tabs
src/public/PublicForm.tsx       the published form, one screen at a time
src/public/ScreenView.tsx       one screen (shared with the editor's preview)
src/public/public-form.css      the themed look of a published form
src/lib/blocks.ts               the question types, defaults and validation
src/lib/themes.ts               the nine themes
src/lib/forms-api.ts            every database call
src/lib/supabase.ts             the typed client and the row types
src/yare/                       the shared Yare Monster design system (generated copy)
supabase/migrations/            one owner, forms/screens/responses/images, the allow list
.env.example                    both environment variables, explained
wrangler.jsonc                  Cloudflare configuration
public/_headers                 security headers; published forms may be embedded
skills/                         guide, install, deploy, update, backup: instructions for AI assistants
```

## Data

Everything lives in your own Supabase project. Yare Monster has no access to your project, your
data or your keys; nothing is sent anywhere else. You set it up in your own environment, by hand or
through your AI assistant, and only you can read the answers.

Three tables, all prefixed `yareforms_`:

- `yareforms_forms`: one row per form (title, slug, draft or published, theme, logo, settings).
- `yareforms_blocks`: one row per screen, in order, with its type, texts and options.
- `yareforms_responses`: one row per respondent. Answers are one JSON object keyed by screen id,
  so the table never changes shape when you add questions. Status, start and completion times, and
  the last screen reached give you completion and drop-off.

Row-level security keeps everything to your account, and only emails on the deployment's allow
list (`yare_allowed_emails`, filled during setup) can create an account. Anyone can read a
published form and its screens by slug. Respondents write through two database functions that check a per-response token,
never to the tables directly.

Images (your logo, the pictures on screens) go in the shared public bucket `yare-images`, under
`yare-forms/<form id>/`. Only you can write there; anyone can view, since they appear on public forms.

## What changed

- **v0.2.0** (25 October 2026): a picture beside any screen, half and half or full, left or right;
  the Build tab half and half with the preview beside the screens, each screen unfolding under its
  row, the list folding to a rail.
- **v0.1.0** (18 October 2026): first working version. Builder, publishing, runner, themes, logo,
  responses, CSV export, embed snippet.

## Credit

Yare Forms is part of Yare Monster, created by Orlando Pedro. See [ATTRIBUTION.md](../../ATTRIBUTION.md)
in the repository (or the monster button inside the app). Dependencies keep their own licences:
HeroUI, React, React Router (MIT), React Aria (Apache-2.0), Phosphor Icons (MIT), Inter and Nunito
(SIL OFL 1.1), Supabase JS (MIT).
