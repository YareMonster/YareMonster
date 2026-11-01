# Supabase conventions

Every Yare Monster app that needs a database uses [Supabase](https://supabase.com): Postgres, Auth, Storage
and a REST API, in the operator's own project. These are the rules all apps follow so they can share
one project without stepping on each other and so every deployment stays under the operator's
control.

## One project, prefixed tables

An operator may run several Yare Monster apps on a single Supabase project. To make that safe, every
database object an app owns carries the app's prefix:

| App | Prefix | Example |
| --- | --- | --- |
| Shared by every app | `yare_` | `yare_allowed_emails`, the `yare-images` bucket |
| Yare Launcher | `launcher_` | `launcher_apps` |
| Yare Forms | `yareforms_` | `yareforms_forms`, `yareforms_responses` |
| Yare Sign | `yaresign_` | `yaresign_envelopes`, `yaresign_participants`, the private `yare-sign` bucket, the `yaresign-send` function |
| Yare Pages | `yarepages_` | `yarepages_sites`, `yarepages_days`, the `yarepages-sync` function |
| Yare Contacts | `yarecontacts_` | |
| Yare Meet | `yaremeet_` | |
| Yare Transfer | `yaretransfer_` | `yaretransfer_transfers`, the private `yare-transfer` bucket, the `yaretransfer-file` function |
| Yare Bill | `yarebill_` | |
| Yare Book | `yarebook_` | |
| Yare Looks | `yarelooks_` | |
| Yare Analytics | `yareanalytics_` | |
| Yare Blocks | none (static planner, no database) | |
| Yare Canvas | `yarecanvas_` | |
| Yare Coms | `yarecoms_` | |
| Yare Crypto | `yarecrypto_` | `yarecrypto_wallets`, `yarecrypto_transactions`, the `yarecrypto-sync` function |
| Yare Dash | `yaredash_` | |
| Yare Fit | `yarefit_` | |
| Yare Flash | `yareflash_` | |
| Yare Fonts | none (static collection, no database) | |
| Yare Lingo | `yarelingo_` | |
| Yare Groups | `yaregroups_` | `yaregroups_group`, `yaregroups_members`, `yaregroups_channels`, `yaregroups_messages`, the private `yare-groups` bucket, the `yaregroups-join` function |
| Yare Links | `yarelinks_` | `yarelinks_pages`, `yarelinks_blocks`, `yarelinks_events`, `yarelinks_entries`, the public `yare-links` bucket |
| Yare Persona | `yarepersona_` | |

The prefix applies to tables, views, functions, triggers, indexes, policies and storage buckets.

### Edge Functions

An app that needs server-side code (sending email, calling an outside API with a key, handing out
short-lived file links) ships it as Supabase Edge Functions inside its own folder, under
`apps/yare-<slug>/supabase/functions/<prefix>-<job>/` with the app's prefix in the name:
`yaresign-send`, `yaresign-file`, `yarecrypto-sync`. The app's install skill deploys them with
`npx supabase functions deploy <name> --project-ref <ref>`. Keys the functions need are project
secrets the person sets from their own terminal (`npx supabase secrets set NAME=value`), never
`VITE_` variables and never rows. Functions check who is calling themselves (`verify_jwt = false`
in `supabase/config.toml`), so publishable keys can reach them.

Nothing is created without a prefix. Everything lives in the `public` schema; prefixes rather than
separate schemas keep the Supabase client configuration simple.

Apps never read another app's tables. If two apps need to share data in the future, that is a
product decision, documented and built explicitly; it does not happen by convention.

## Who may create an account

The apps are built for the person who deploys them, and the people they let in. Authentication is
Supabase Auth with email and password. The sign-in screen offers **Create your account**, and the
database accepts it only for emails on the deployment's allow list: the shared table
`yare_allowed_emails`, filled during setup (`select public.yare_allow_email('you@domain.com')`,
by hand or by the assistant doing the install). A trigger on `auth.users`, shipped by every app
under its own prefix (`launcher_allowed_email`, `yareforms_allowed_email`, …), refuses everyone
else. One entry opens every Yare Monster app in the project. Nobody has to touch the Supabase
dashboard to create a user, and sign-ups do not need to be switched off by hand.

Rows belong to the account that created them. Every table has an `owner_id uuid` column defaulting
to `auth.uid()`, and row-level security policies compare it with `(select auth.uid())`.

Public-facing pages (a published form, a booking page) are a separate case. They are reached without
signing in, so the policies that expose them are deliberate, narrow and documented in that app:
for example, anonymous users may read a published form and may insert a response, and nothing else.

## Migrations live with the app

Each app keeps its SQL in `apps/yare-<app>/supabase/migrations/`, named the way the Supabase CLI
expects, a timestamp then a name:

```
apps/yare-launcher/supabase/migrations/20261018000001_launcher_apps.sql
apps/yare-launcher/supabase/migrations/20261018000002_launcher_owner.sql
```

Migrations are plain SQL, idempotent where practical (`create table if not exists`,
`drop policy if exists` before `create policy`), and commented so a reader understands each object.
The operator, or the assistant helping them, applies them from the app folder with the app's own
script, after signing in to the Supabase CLI once:

```sh
npx supabase login
npm run db:push
```

The script reads the project from `.env`, applies only the files the project has not seen, oldest
first, and records each one in the project's migration history. Pasting each file into the SQL
editor works too.

### Several apps, one project

The CLI keeps a single migration history per project. So that apps never collide there, every
app owns a version range: the launcher uses `20261018000xxx`, Forms `2026101810xxxx`, Sign
`2026101811xxxx`, Contacts `12`, Meet `13`, Transfer `14`, Bill `15`, Book `16`, Looks `17`, Pages
`18`, Analytics `19`, Blocks `20`, Canvas `21`, Coms `22`, Crypto `23`, Dash `24`, Fit `25`, Flash `26`,
Fonts `27`, Lingo `28`, Persona `29`, Groups `30`, Links `31`. The plain `supabase db push` command refuses to push from a folder whose history does not list
every version the project already has, which is why each app's `npm run db:push` applies its files
one by one and records them itself. From the repository root, `node scripts/db-push.mjs
--project-ref <ref> [apps…]` pushes several apps in one go.

A migration is never edited after it has shipped. Changes come as a new numbered file.

## Images and files

One shared public bucket, `yare-images`, holds every app's images under the app's own folder:
`yare-forms/<form id>/logo.png`, `yare-book/…`. Anyone can read (the images appear on public
pages); only the owner can write, and only inside their app's folder. Each app's migration creates
the bucket if it does not exist and adds its own storage policies. Private files, when an app needs
them, get their own non-public bucket named after the app.

## Row-level security is always on

Every table enables RLS in the same migration that creates it. Access for the `anon` role is
revoked unless a public page needs a specific, minimal policy. Functions run with
`set search_path = ''` and reference objects by schema.

## Keys

| Key | Where it goes | Why |
| --- | --- | --- |
| Project URL | `VITE_SUPABASE_URL` | Public |
| Publishable key (`sb_publishable_…`, or the legacy anon key) | `VITE_SUPABASE_PUBLISHABLE_KEY` | Public; RLS decides what it can do |
| Secret / service-role key | Nowhere in an app | Bypasses RLS. Only for the operator's own tooling, never in a `VITE_` variable |
| Database password | Nowhere in an app | Only the Supabase CLI and dashboard need it |

`VITE_` variables are compiled into the browser bundle. Treat anything in one as public.

## Costs

Supabase's free plan covers a personal deployment of these apps comfortably. Projects on the free
plan pause after a week without activity and need a click to resume. Storage-heavy apps (file
sharing, photos) count against the plan's storage and egress limits; the app's documentation says
what to expect.
