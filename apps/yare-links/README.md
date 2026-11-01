# Yare Links

Every link you have, on one page. The page is a grid, six blocks wide and one phone screen tall,
and every block is yours to place and size: a link, a picture, a line of text, a video, a form.
Views and taps counted by your own database, with nothing about who.

**Status:** In progress. The grid editor, the block types, backgrounds, locks and
schedules, the redirect, insights and entries work.

Part of [Yare Monster](https://yare.monster), created by Orlando Pedro.
Free to self-host for personal use and for your own business under the
[Yare Monster Community License](LICENSE). This folder is self-contained: copy it, follow
[DEPLOYMENT.md](DEPLOYMENT.md), and it runs on your own accounts.

## What it does

- **Pages**: as many as you like, each at `/<address>` on the domain you give the app.
- **The grid**: six cells wide, ten rows to a phone screen, more rows when a page needs them.
  Cells scale with the screen and never go under 44px, so every block stays easy to tap. On a
  wide screen the page is a phone-wide column with hairline edges, standing on the page colour
  with a soft vignette and grain; a page picture shows blurred and dimmed around it.
- **One kind of block.** Every block has the same parts: a type, an icon from the set or your own
  picture, a title, a subtext, a link, and a background colour or picture. What shows depends on
  the block's size: an icon in a small one, a title and a subtext in a bigger one. The type says
  what a big enough block does: **Link** opens its address; **Product** is a thing for sale,
  its picture, its name and a price in a small pill (from 2 by 2); **Video** plays a YouTube, Vimeo,
  Spotify or SoundCloud address on the page (from 4 wide and 3 tall); **Spotify** plays a song, an
  album, a playlist, an episode or a show (from 4 by 2); **Giphy** puts a GIF behind the block's
  words, at any size; **Email** shows a field and a Join button (from 4 by 2, or the field alone in
  one row 6 wide); **Message** shows name, email and a message (from 4 by 4);
  **Yare Form** shows one of your Yare Forms inside the block (from 4 by 4); **YouTube**,
  **Substack** and **Podcast** show the latest videos of a channel, posts of a publication or
  episodes of a podcast, from its RSS address (from 4 by 3);
  **QR code** draws the link as a code in the block's colours (from 2 by 2). Too small for its
  type, a block behaves like a link. What visitors type lands in Insights.
- **The editor**: the phone is the canvas. Add a block, drag it where you want it, pull its corner
  to size it. Press a block and its fields open beside the phone; the trash button or the Delete
  key removes it. Fields that don't fit the block's size are greyed out.
- **Templates**: ten starting points, each shown as its design (Creator, Shop, Musician, Minimal,
  Podcast, Café, Portfolio, Event, Writer, Filmmaker). One press sets the look and lays out the
  blocks as in the design, with placeholder words and no pictures: the words and the pictures are
  yours to add. Your current blocks are replaced, after a confirmation.
- **Per block**: show from and hide after dates, a lock with a code or an age check, archive.
- **Look**: the page background (a colour, and on top of it a picture or a short clip filling the
  first screen, both at once if you like), the page's font (fourteen
  to pick from: Nunito and Inter ship with the app, the other ten come from Google Fonts when a
  visitor opens the page), the gap between blocks from none to 16px, the space at the edges on or off (off, blocks
  touch the sides of the screen), and the corners from square to pill, each chosen from tiles.
- **Block style**: the icon small, normal or large; the block's own corners or the page's; a colour and a fill — painted, no fill (open, with a line in the colour) or
  glass (the colour frosted and see-through); a picture, or a video by link, behind it; an
  optional thin border; edge to edge, so a block at the top, left or right of the grid runs over the
  page's edge space and touches the screen; the
  block's own font or the page's; dark, light or automatic words; the title small, normal, large or huge and the subtext small, normal or large; left, centred
  or right; at the top, in the middle or at the bottom of the block.
- **Settings**: the address, the page name, and a switch to send every visitor to one link for a
  while.
- **SEO/AEO**: the title and description for search, the picture when shared, the page's own icon,
  whether search engines may list the page, and what the page is about (a person or an
  organisation) for structured data, with live previews of the Google result and the share card.
  The Worker writes it all into the page before it leaves Cloudflare, so link previews and agents
  that never run scripts see it; `/<address>/summary.txt` is a plain summary for agents.
- **Insights**: views, taps and the tap rate over 7, 30, 90 days or all time, views per day,
  where visitors came from, countries, devices, taps per block, and what visitors typed into
  Email and Message blocks. Home shows the same traffic across every page. No cookies, no third
  party, nothing that points at a person.

## What it does not do

- No payments, no Instagram or TikTok embeds, no change of the page by visitor location. One
  account per deployment.

## What you need

| Service | Why | Cost |
| --- | --- | --- |
| [Supabase](https://supabase.com) project | The pages, the blocks, the counts, the entries, the pictures and videos, your sign-in | Free plan is enough to start: 1 GB of storage |
| [Cloudflare](https://cloudflare.com) account | Hosting the static build; the country of a visit comes from it | Free plan |
| A domain (optional) | Your own address instead of `*.workers.dev` | Your registrar's price |

Node.js 20 or newer on your computer to build it.

## Install it with your AI assistant

Hand this folder to your assistant and say:

> Make the `apps/yare-links` folder the root of my project. Follow its DEPLOYMENT.md. I will give
> you my Supabase project URL and publishable key, and I will sign in to Supabase and Cloudflare
> myself when you ask.

Or sign in to the app and press **Setup guide** under Connections for a ready-made file.

## Run it locally

```sh
# in this folder
cp .env.example .env     # then fill in the two values (see DEPLOYMENT.md, step 4)
npm install
npm run dev              # http://localhost:4622
```

Other scripts: `npm run check` (TypeScript), `npm run build`, `npm run preview`, `npm run deploy`,
`npm run db:link` and `npm run db:push` (Supabase CLI).

## Where things are

```
src/App.tsx                          routes: /<address> is a visitor's page, everything else needs sign-in
src/features/Shell.tsx               the sidebar: New page, Home, Connections, Your pages
src/features/HomePage.tsx            the dashboard
src/features/page/PageEditor.tsx     a page: Build / Look / Templates / Settings / SEO/AEO / Insights
src/features/page/*Tab.tsx           the six tabs
worker.js                            the Worker: fills a page's <head> for search engines and agents, serves the summary
src/features/Traffic.tsx             the traffic maths and boxes, shared by Home and Insights
src/public/PublicLinks.tsx           the visitor's page, loaded by its address, counted
src/grid/GridScreen.tsx              the grid as visitors see it (shared with the editor's phone preview)
src/grid/GridEditor.tsx              the grid as a canvas: drag and size
src/grid/BlockFace.tsx               what a block looks like at any size
src/lib/grid.ts                      the grid's rules: cells, sizes, what fits where
src/lib/templates.ts                 the ten templates
src/lib/links-api.ts                 every database and storage call
src/lib/blocks.ts                    the block kinds and the embed addresses
src/lib/socials.ts                   the social networks and their icons
src/yare/                            the shared Yare Monster design system (generated copy)
supabase/migrations/                 the allow list, then pages, blocks, events, entries
.env.example                         both environment variables, explained
wrangler.jsonc                       Cloudflare configuration
skills/                              guide, install, deploy, update, backup: instructions for AI assistants
```

## Data

Everything lives in your own Supabase project. Yare Monster has no access to your project, your
data or your keys; nothing is sent anywhere else.

Four tables, all prefixed `yarelinks_`: `yarelinks_pages` (one row per page: words, look, address,
counts), `yarelinks_blocks` (the blocks of a page, in order), `yarelinks_events` (one row per view
or click: the site it came from, the country, the device), `yarelinks_entries` (what visitors typed
into a form or a sign-up).

Row-level security keeps everything to your account. Visitors never touch the tables: four database
functions give them the page as it is right now, count a view or a click, open a code-locked block
and store an entry. Pictures go to the public bucket `yare-images` under `yare-links/<page id>/`;
wallpapers and videos to the public bucket `yare-links`, up to 50 MB each.

## What changed

- **v0.7.0** (27 October 2026): Spotify, Giphy and Podcast blocks; the email block in a single
  row; the QR code on a block with no fill or glass.
- **v0.6.0** (26 October 2026): the SEO/AEO tab; a page's head written by the Worker for search
  engines, messaging apps and agents; a summary for agents.
- **v0.5.0** (26 October 2026): YouTube, Substack and QR code blocks, icon sizes, a block's own
  corners, colour and picture together behind the page.
- **v0.4.0** (25 October 2026): Product blocks with a price, fonts, fills, glass, words of any
  colour and size, edge to edge, ten templates built from their designs.
- **v0.3.0** (24 October 2026): block types (Link, Video, Email, Message, Yare Form), nine
  templates, traffic across pages on Home, the block panel with a word on every part.
- **v0.2.0** (24 October 2026): the page is a grid. One kind of block, any size, placed and sized
  on the phone; what it shows follows its size. Backgrounds per block and per page, the gap and
  the corners.
- **v0.1.0** (23 October 2026): first working version. Pages, eleven kinds of block, look, locks
  and schedules, the redirect, insights and entries.

## Credit

Yare Ulinks is part of Yare Monster, created by Orlando Pedro. See [ATTRIBUTION.md](../../ATTRIBUTION.md)
in the repository.

Every page ends with "Pwrd by Yare Monster" under the grid, as the licence asks. The monster button in the
sidebar opens the About dialog.
