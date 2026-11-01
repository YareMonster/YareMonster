/**
 * Facts shared by every Yare Monster app: the project, its creator and the app registry.
 * Asset paths point at /yare/*, which scripts/sync-ui.mjs copies into each app's public folder.
 */
export const YARE = {
  name: 'Yare Monster',
  url: 'https://yare.monster',
  /** The official repository. Each app's README lives under apps/yare-<slug>/. */
  repo: 'https://github.com/YareMonster/YareMonster',
  /** The published list of apps and their versions, which every app compares itself against. */
  catalog: 'https://yare.monster/catalog.json',
  creator: { name: 'Orlando Pedro' },
  /** Where people running Yare Monster apps meet. */
  community: { name: 'r/YareMonster', url: 'https://www.reddit.com/r/YareMonster/' },
} as const;

export const yareApps = {
  forms: { name: 'Yare Forms' },
  sign: { name: 'Yare Sign' },
  pages: { name: 'Yare Pages' },
  contacts: { name: 'Yare Contacts' },
  meet: { name: 'Yare Meet' },
  transfer: { name: 'Yare Transfer' },
  bill: { name: 'Yare Bill' },
  book: { name: 'Yare Book' },
  looks: { name: 'Yare Looks' },
  analytics: { name: 'Yare Analytics' },
  blocks: { name: 'Yare Blocks' },
  canvas: { name: 'Yare Canvas' },
  coms: { name: 'Yare Coms' },
  crypto: { name: 'Yare Crypto' },
  dash: { name: 'Yare Dash' },
  fit: { name: 'Yare Fit' },
  flash: { name: 'Yare Flash' },
  fonts: { name: 'Yare Fonts' },
  lingo: { name: 'Yare Lingo' },
  persona: { name: 'Yare Persona' },
  groups: { name: 'Yare Groups' },
  links: { name: 'Yare Links' },
} as const;

export type YareAppSlug = keyof typeof yareApps;
export const yareAppSlugs = Object.keys(yareApps) as YareAppSlug[];

/** What the shell needs to know about the app it is rendering. */
export interface AppIdentity {
  /** Full product name, e.g. "Yare Forms". Used in titles, the About dialog and alt text. */
  name: string;
  /** The app's lockup (monster + wordmark), transparent PNG, 192px tall. */
  logoSrc: string;
  /** Where this app's documentation lives. Shown in the Help menu. */
  docsUrl?: string;
}

/** The licence text, served by every app next to its assets. */
export const yareLicenceUrl = '/yare/LICENSE.txt';
export const yareLogoSrc = '/yare/yare-lockup.png';
/** The launcher's own lockup: the monster holding a grid of apps. */
export const launcherLogoSrc = '/yare/apps/launcher.png';
export const yareMarkSrc = (size: 64 | 256 = 64) => `/yare/yare-mark-${size}.png`;
export const appLogoSrc = (slug: YareAppSlug) => `/yare/apps/${slug}.png`;
/** Monster poses for empty states and notices. Transparent PNGs, 320px tall. */
export const monsterSrc = (pose: 'puzzled' | 'crypto') => `/yare/monsters/${pose}.png`;

/** Identity for one of the nine Yare Monster apps. */
export function yareApp(slug: YareAppSlug): AppIdentity {
  return { name: yareApps[slug].name, logoSrc: appLogoSrc(slug), docsUrl: `${YARE.repo}/tree/main/apps/yare-${slug}` };
}
