# Yare Groups

Your community, in channels, on your own accounts: channels in
categories, posts with pictures and reactions, roles and flairs, invite links, and a look of its
own. Admins and members share one sign-in page.

**Status:** In progress. Sign-in and joining, channels, posts, reactions, pins, roles,
flairs, invites, themes and the admin pages work.

Part of [Yare Monster](https://yare.monster), created by Orlando Pedro.
Free to self-host for personal use and for your own business under the
[Yare Monster Community License](LICENSE). This folder is self-contained: copy it, follow
[DEPLOYMENT.md](DEPLOYMENT.md), and it runs on your own accounts.

## What it does

- **One door**: everyone signs in on the same page, in the group's look. Admins are the emails on
  the deployment's allow list; the first one in becomes the owner. Members create their account on
  that page with an invite link, or freely when the group is open.
- **Roles**: owner (everything), admin (everything but the owner and the group itself), moderator
  (pins, removes posts, mutes), member. Flairs: a short word in a colour next to a name.
- **Channels** in categories, each saying who posts: everyone, moderators and up, or admins only
  for announcements. Private channels show only to the people added to them and to admins.
- **Posts**: live, with one picture, GIF or file each, links, edits, pins, eight reactions, and
  removal by the author or a moderator. Unread channels are marked.
- **Members**: a directory by role, who is here right now, a profile with a name and a picture.
  Admins change roles, flairs and standing: mute for a while, remove, block.
- **Invites**: links with an expiry, a number of uses and a role, revocable, use counted.
- **Look**: name, tagline, welcome text, logo, a full-page picture behind the sign-in card, and
  twelve themes, six classics and six soft gradients, half of them dark.
- **The group's own tab**: inside the group and on its sign-in page, the browser tab carries the
  group's name and its logo as the icon; Yare Groups by default, and on the admin side.
- **Settings**: open, invite-only or closed; who makes invite links (admins, or moderators too);
  the landing channel; group rules members accept before they post; whether members edit and
  remove their own posts and change their name and picture; what posts may carry (pictures, GIFs,
  files, reactions) and how big, 1 to 5 MB.

## What it does not do

- No voice or video, no threads, no direct messages, no mentions or notifications, no search.
  One group per deployment.

## What you need

| Service | Why | Cost |
| --- | --- | --- |
| [Supabase](https://supabase.com) project | The group, every account, the posts, the files, the live updates, and the function that creates member accounts | Free plan is enough to start: 50,000 monthly active users, 1 GB of storage |
| [Cloudflare](https://cloudflare.com) account | Hosting the static build | Free plan |
| A domain (optional) | Your own address instead of `*.workers.dev` | Your registrar's price |

Node.js 20 or newer on your computer to build it.

## Install it with your AI assistant

Hand this folder to your assistant and say:

> Make the `apps/yare-groups` folder the root of my project. Follow its DEPLOYMENT.md. I will give
> you my Supabase project URL and publishable key, and I will sign in to Supabase and Cloudflare
> myself when you ask.

Or sign in to the app and press **Setup guide** under Manage → Connections for a ready-made file.

## Run it locally

```sh
# in this folder
cp .env.example .env     # then fill in the two values (see DEPLOYMENT.md, step 4)
npm install
npm run dev              # http://localhost:4621
```

Other scripts: `npm run check` (TypeScript), `npm run build`, `npm run preview`, `npm run deploy`,
`npm run db:link` and `npm run db:push` (Supabase CLI).

## Where things are

```
src/App.tsx                          one door: sign-in, then the group or the admin pages
src/gate/Gate.tsx                    the sign-in page in the group's look; creates member accounts
src/gate/ResetPassword.tsx           choose a new password from the email link
src/features/GroupContext.tsx        the group, its people and channels, kept live
src/group/                           the group view: channels, posts, composer, members, profile
src/manage/                          the admin pages: Home, Channels, Members, Invites, Look, Settings, Connections
src/lib/groups-api.ts                every database, storage and function call
src/lib/themes.ts                    the twelve themes
src/lib/supabase.ts                  the typed client and the row types
src/yare/                            the shared Yare Monster design system (generated copy)
supabase/migrations/                 the allow list, then the group, members, channels, posts, invites
supabase/functions/yaregroups-join   Edge Function: creates a member's account from an invite
.env.example                         both environment variables, explained
wrangler.jsonc                       Cloudflare configuration
skills/                              guide, install, deploy, update, backup: instructions for AI assistants
```

## Data

Everything lives in your own Supabase project. Yare Monster has no access to your project, your
data or your keys; nothing is sent anywhere else.

Nine tables, all prefixed `yaregroups_`: `yaregroups_group` (one row: name, look, door, limits),
`yaregroups_members` (everyone, with role, flair and standing), `yaregroups_categories`,
`yaregroups_channels`, `yaregroups_channel_members` (who sees a private channel),
`yaregroups_messages`, `yaregroups_reactions`, `yaregroups_invites`, `yaregroups_reads` (unread
marks).

Row-level security does the work: members read what their role allows, posting follows the
channel's rule and the member's standing, admins manage everything, and triggers guard the columns
a role may not touch. Members are accounts in your Supabase Auth, like yours; the `yaregroups-join`
function creates them, puts their email on the allow list marked as a member, and flags the account
so it never counts as an operator. Pictures and files in posts live in the private bucket
`yare-groups` and reach the browser through short-lived addresses; the logo, the background and
avatars live in the public bucket `yare-images`, under `yare-groups/`. Live updates come from
Supabase Realtime.

## What changed

- **v0.1.0** (23 October 2026): first working version. One sign-in page, invites, channels, posts
  with pictures and reactions, roles and flairs, the admin pages, twelve themes, the function.

## Credit

Yare Ugroups is part of Yare Monster, created by Orlando Pedro. See [ATTRIBUTION.md](../../ATTRIBUTION.md)
in the repository.

The sign-in page ends with "Pwrd by Yare Monster", as the licence asks. The monster button in the
admin sidebar opens the About dialog.
