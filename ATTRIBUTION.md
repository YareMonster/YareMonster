# Attribution

Yare Monster is created and maintained by **Orlando Pedro**.

- Project: https://yare.monster
- GitHub: https://github.com/YareMonster
- Contact: hola@yare.monster

Copyright (c) 2026 Orlando Pedro. Licensed under the Yare Monster Community License 1.0
(see [LICENSE](LICENSE)).

## The required credit

Section 6 of the licence asks every copy to keep this notice:

> Yare Monster, created by Orlando Pedro.
> https://yare.monster

In the apps it appears in two places, both built once and shared through the design system in
[packages/ui](packages/ui):

- **The monster button → About.** Every app's sidebar has the monster mark next to Help; it opens
  a dialog that reads "Yare [App] is part of Yare Monster. Free to use, open code, self-hosted."
  with links to the licence, Yare Monster and the app's documentation. The licence text, which
  names the creator, is one click away. Component: `AboutYareDialog`.
- **Pwrd by Yare Monster.** Every public-facing page an app renders (a published form, a booking
  page, a shared file) shows a small footer with the monster mark and the text "Pwrd by Yare Monster", linking to https://yare.monster. Component: `PoweredByYare`.

The credit says where the apps come from. It does not mean Orlando Pedro or Yare Monster
operates, endorses or can access the deployment that shows it.

## Third-party material

Yare Monster builds on open-source work that keeps its own licence. Each app's `package.json` lists its
dependencies; their licence files ship inside `node_modules` when installed. The main ones:

| Material | Licence | Used for |
| --- | --- | --- |
| [HeroUI](https://heroui.com) | MIT | Components and theme tokens (the design system base) |
| [React Aria Components](https://react-spectrum.adobe.com/react-aria/) | Apache-2.0 | Accessible component behaviour, through HeroUI |
| [Tailwind CSS](https://tailwindcss.com) | MIT | Styling |
| [Phosphor Icons](https://phosphoricons.com) | MIT | Interface icons, duotone weight |
| [Inter](https://rsms.me/inter/) via Fontsource | SIL OFL 1.1 | Body text |
| [Nunito](https://fonts.google.com/specimen/Nunito) via Fontsource | SIL OFL 1.1 | Headings |
| [Supabase JS](https://supabase.com) | MIT | Database and authentication client |
| [React](https://react.dev) | MIT | UI runtime |
| [Vite](https://vite.dev) | MIT | Build tool |

Supabase, Cloudflare and any other service an operator connects run under that service's own
terms. Nothing in the Yare Monster licence changes them.

The Yare Monster, the app logos and the Yare Monster name are brand assets of Orlando Pedro. The
licence allows keeping them in place in permitted deployments and copies; it does not allow using
them to suggest an official Yare Monster service or endorsement (see section 7).
