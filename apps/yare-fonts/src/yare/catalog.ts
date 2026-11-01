import { yareApps, type YareAppSlug } from './brand';

/** The collection as yare.monster describes it: one line per app, and whether it needs a database. */
export interface CatalogEntry {
  slug: YareAppSlug;
  name: string;
  line: string;
  database: boolean;
}

const lines: Record<YareAppSlug, string> = {
  forms: 'Forms, surveys and good questions.',
  sign: 'Send documents. Collect signatures.',
  pages: 'Your own place on the web.',
  contacts: 'Keep your people in one place.',
  meet: 'A little less back-and-forth.',
  transfer: 'Share files with a simple link.',
  bill: 'Simple invoices, sent in a minute.',
  book: 'Let people book a time with you.',
  looks: 'Try a new look before you commit.',
  analytics: 'Visitors counted, nobody tracked.',
  blocks: 'Your week in blocks, on paper.',
  canvas: 'Simple designs, exported.',
  coms: 'A chat bubble and your inbox.',
  crypto: 'Your wallets, in one view.',
  dash: 'Your Stripe numbers, charted.',
  fit: 'Every session, written down.',
  flash: 'Cards that come back when you need them.',
  fonts: 'Free fonts, commercial use included.',
  lingo: 'A language, a little every day.',
  persona: 'An assistant that is yours.',
  groups: 'Your community, in channels.',
  links: 'Every link you have, on one page.',
};

export const catalog: CatalogEntry[] = (Object.keys(yareApps) as YareAppSlug[]).map((slug) => ({
  slug,
  name: yareApps[slug].name,
  line: lines[slug],
  database: !['blocks', 'fonts'].includes(slug),
}));
