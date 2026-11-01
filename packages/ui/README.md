# @yare/ui

The Yare Monster Design System as code: HeroUI v3 with Yare Monster's tokens, plus the shared app shell, sign-in
screen and attribution components. The rules it implements are written up in
[docs/DESIGN.md](../../docs/DESIGN.md).

## This package is copied, not installed

Apps must run on their own when someone copies a single app folder, so this package is never a
dependency. `npm run sync-ui` at the repository root copies:

| From | To |
| --- | --- |
| `packages/ui/src` | `apps/yare-<app>/src/yare` |
| `packages/ui/assets` | `apps/yare-<app>/public/yare` |
| `LICENSE` | `apps/yare-<app>/LICENSE` |

Edit here, run the sync, commit both. `npm run check-ui` fails if any copy is stale, and it checks
that every app's `package.json` lists the peer dependencies declared here.

## Contents

```
src/theme.css              tokens and component rules; the only stylesheet an app imports
src/brand.ts               project facts, the app registry, asset paths
src/components/
  YareProvider.tsx         Phosphor duotone defaults + toast region
  AppShell.tsx             sidebar, top bar, mobile drawer
  PageHeader.tsx           breadcrumbs + actions for the top bar
  SignIn.tsx               the shared sign-in card (auth logic stays in the app)
  HelpMenu.tsx             Help popover: docs, Yare Monster, About
  AboutYareDialog.tsx      the in-app credit
  PoweredByYare.tsx        the footer credit for public pages
  StatusChip.tsx           soft chip with a coloured dot
  YareLogo.tsx             app lockups and the monster mark
assets/
  apps/yare-<slug>.png          one lockup per app, transparent, 192px tall
  yare-lockup.png          the Yare Monster lockup
  yare-mark-64.png, -256   the monster head
```

## Using it in an app

```tsx
// src/main.tsx
import './yare/theme.css';
import { YareProvider } from './yare';

// anywhere
import { Button, Card } from '@heroui/react';           // components come from HeroUI
import { AppShell, PageHeader, yareApp } from './yare';  // identity, shell and credit come from Yare Monster

const app = yareApp('forms');
<AppShell app={app} nav={[...]} primaryAction={<Button variant="primary">New form</Button>} topbar={<PageHeader crumbs={[{ label: 'Forms' }]} />}>
  …
</AppShell>
```

## Assets

The PNGs were produced once from brand source files that live outside git: trimmed to their
content and resized to 192px tall (lockups) or a 256px square (mark). Regenerate the same way if
the sources change.
