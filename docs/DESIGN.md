# Yare Monster Design System

Every Yare Monster app looks like the same family without being the same app. This document is the shared
agreement: which library, which tokens, which measurements, and where the code lives. Apps follow
it; they do not reinterpret it.

## Base: HeroUI v3

The design system is built on [HeroUI v3](https://heroui.com) (React, Tailwind CSS v4, React Aria).
HeroUI gives us accessible components with a compound API (`Modal.Dialog`, `Select.Trigger`, …) and
a set of CSS variables for colour, radius and elevation. Yare Monster does not fork or re-implement these
components. It sets their variables to Yare Monster's values and adds a thin layer on top: the app shell,
the sign-in screen and the attribution components.

Use HeroUI components directly from `@heroui/react`. Reach for a Yare Monster component only for what
HeroUI does not have (the shell, the credit) or where Yare Monster fixes a specific look (the status chip).

| Layer | What it is | Where |
| --- | --- | --- |
| Tokens | Colour, type, radius, measurements as CSS variables | `packages/ui/src/theme.css` |
| Atoms | HeroUI components: Button, Input, Chip, Switch, Tabs, Card, … | `@heroui/react` |
| Yare Monster atoms | `YareLogo`, `YareMark`, `StatusChip`, `PoweredByYare` | `packages/ui/src/components` |
| Yare Monster molecules | `DataTable`: the one table every app uses (card, quiet uppercase header, hairline rows, horizontal scroll) | `packages/ui/src/components` |
| Molecules | `PageHeader`, `HelpMenu`, `AboutYareDialog`, `SignIn`, `PasswordField`, `Notice`, `Steps` | `packages/ui/src/components` |
| Organisms | `ConnectionsPanel`: the Code, Database and Hosting cards plus the responsibility note, shown by every app | `packages/ui/src/components` |
| Organisms | `SetupGuideDialog` + `AppPicker`: the yellow Setup guide button in every sidebar downloads a Markdown install guide for that app (the launcher offers the whole catalogue) | `packages/ui/src/components`, `packages/ui/src/setup-guide.ts` |
| Organisms | `AppShell` (sidebar, top bar, drawer) | `packages/ui/src/components` |

## How apps get it

`packages/ui` is the source of truth, but apps never install it as a package. Running
`npm run sync-ui` at the repository root copies `packages/ui/src` into each app as `src/yare/`,
the assets into `public/yare/`, and the root `LICENSE` into the app folder. An app imports from
`./yare` and `./yare/theme.css` like any local code.

This keeps every app folder standalone: copy the folder, run `npm install`, and it works. The cost
is a generated folder that must not be hand-edited; `npm run check-ui` fails when any copy drifts.

Each app's `package.json` must list the peer dependencies declared in `packages/ui/package.json`.
The sync script checks that too.

## Colour

Values are HeroUI variable names.

| Variable | Value | Role |
| --- | --- | --- |
| `--background` | `#f7f8fb` | Page canvas |
| `--surface` | `#ffffff` | Cards, sidebar, top bar, dialogs |
| `--surface-secondary` / `--surface-tertiary` | `#f3f5f9` / `#eef1f6` | Hover fills, quiet panels |
| `--foreground` | `#272d39` | Charcoal: text and icons |
| `--muted` | `#6b7694` | Supporting text |
| `--border` / `--separator` | `#dde5f1` / `#e8edf5` | Cool gray lines |
| `--default` | `#eef2f7` | Neutral fills: chips, tertiary buttons |
| `--accent` | `#0073fe` | Blue: selection, links, focus ring, toggles, checks, active tab |
| `--success` / `--warning` / `--danger` | `#029e4a` / `#ee9e05` / `#e5232b` | Status |
| `--yare-yellow` | `#ffe91a` | The one primary action per screen |
| `--yare-yellow-deep` | `#e9ca13` | 1px border and pressed state of the yellow button |
| `--yare-ink` | `#272d39` | Charcoal button (`variant="secondary"`) |
| `--yare-selected` | `#e6f1fd` | Selected navigation item |

Brand coral and cream exist as Tailwind utilities (`bg-yare-coral`, `bg-yare-cream`) for marketing
touches. They are not interface colours.

Light mode only. A dark theme has not been designed; do not enable HeroUI's `.dark` until it has.

## Type

- **Body**: Inter (variable), `--font-sans`. 15px for controls, 14px for supporting text, 12px for
  section labels. Weights 400, 500 (labels, nav), 600 (buttons).
- **Headings**: Nunito (variable) at weight 800, `--font-display`. Rounded, heavy
  headlines ("Let's get to know you") are this face. Applied to `h1`–`h4` by the theme; size them
  with Tailwind (`text-2xl` for a page title, `text-lg` for a card title).

Both fonts load from Fontsource packages, bundled with the app. No font files live in the repo.

## Shape and measurements

| Variable | Value | Used by |
| --- | --- | --- |
| `--yare-radius-control` | 10px | Buttons, inputs, nav items, select triggers |
| `--yare-radius-card` | 14px | Cards, dialogs, tiles, popovers |
| `--yare-control-h` | 44px | Buttons (md), inputs, nav items, tabs |
| `--yare-control-h-sm` / `-lg` | 36px / 52px | Small buttons; hero and sign-in buttons |
| `--yare-sidebar-w` | 240px | The sidebar |
| `--yare-topbar-h` | 64px | The top bar |
| `--yare-gutter` | 24px (16px on phones) | Page padding |
| `--yare-content-max-w` | 1152px | Content column |

Chips are pills. Status chips carry a coloured dot (`StatusChip`). Surfaces are flat with a 1px
border; only floating layers (popovers, menus, dialogs) cast a shadow.

## Buttons

HeroUI variants, re-coloured:

| Variant | Look | Use |
| --- | --- | --- |
| `primary` | Yellow, charcoal text, 1px deeper-yellow border | The main action: "New form", "Add app", "Continue". One per screen. |
| `secondary` | Charcoal, white text | The strong confirm next to a primary: "Publish" |
| `outline` | White, cool-gray border | Quiet actions: "Preview", "Cancel" |
| `ghost` | Transparent | Icon buttons in the sidebar footer, overflow menus |
| `danger` / `danger-soft` | Red | Destructive confirmations only |

Links use `accent` blue with an optional trailing Phosphor icon (`Link.Icon`).

## Icons

[Phosphor](https://phosphoricons.com) **duotone**, 20px, via `@phosphor-icons/react`. `YareProvider`
sets this as the default so components just render `<PlusIcon />`. Use the `Icon`-suffixed exports
(`QuestionIcon`, not `Question`) to avoid clashing with HeroUI names. The bold weight is allowed
for the plus sign in a yellow button and for the overflow dots.

## The app shell

`AppShell` is the layout every app uses:

- **Sidebar, 240px**: the app's lockup (40px tall), the yellow primary action, navigation grouped
  under small uppercase section labels, and a footer with the signed-in user (avatar initials, name,
  detail) above a row of icon buttons: Settings, Help, the monster (About Yare Monster), Sign out.
- **Top bar, 64px**: whatever the page passes as `topbar`, normally `PageHeader` with breadcrumbs
  on the left and actions on the right. Tabs, when a page has them, sit under the top bar as
  HeroUI `Tabs variant="secondary"` (underlined, blue when selected).
- **Content**: centred column, max 1152px, 24px gutters.
- **Phones (under 768px)**: the sidebar hides behind a menu button; the same sidebar content opens
  in a left drawer. The top bar shows the logo at 32px.

There is no app switcher. Each app is its own product; the launcher is a separate app.

## Logos

Each app has a lockup: the monster holding the app's prop, next to the "yare" wordmark and the app
name. Transparent PNGs, 192px tall, in `packages/ui/assets/apps/<slug>.png`. The monster head alone
(`yare-mark-64.png`, `yare-mark-256.png`) is the mark in the "Pwrd by" credit and in empty states.
The favicon set (`favicon/`: SVG, 32px PNG, Apple touch icon, 192 and 512 icons) is the same one
yare.monster uses, the monster head on a periwinkle tile, so every app's tab matches the website.
The launcher has its own lockup (`apps/launcher.png`, the monster holding a grid of apps). The
Yare Monster lockup (`yare-lockup.png`) is for anything that speaks for the whole collection.

Assets are processed once from brand source files that stay outside git (trimmed, resized). To
regenerate, export the sources again and resize to 192px tall with transparent background.

## Attribution

Two components, required by the licence and shared by every app:

- The monster button in the sidebar footer → `AboutYareDialog`: "Yare [App] is part of Yare Monster. Free to
  use, open code, self-hosted." with links to the licence, Yare Monster and the app's
  documentation. `HelpMenu` next to it links to the documentation and the Yare Monster site.
- `PoweredByYare`: the footer for public pages. Apps render it on every page a visitor can reach
  without signing in.

## Loading

A page never sits empty while its data is on the way. Every place that will hold data shows a
`Skeleton` (HeroUI) in the shape of what is coming: a bar where a number goes, a block where a table
or a chart goes, a row per list item. The skeleton is replaced, never preceded by a blank. A
full-page `Spinner` is only for the moment before the app knows who is signed in. An empty state
(the monster, a sentence, a button) is for when the data has arrived and there is none.

## Writing

Friendly, direct, short. Sentence case everywhere ("Add app", not "Add App"). Say what happened
("Yare Forms added"), not what the system did ("Record inserted"). Empty states explain what will
appear and offer the first action. No exclamation marks in the interface; the monster does the
smiling.
