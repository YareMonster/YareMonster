/**
 * The fonts a page can use. Nunito and Inter ship with the app; the rest come from Google Fonts
 * when a page picks them, so a visitor's browser asks Google for that one file.
 */
export interface Font { id: string; label: string; family: string; google?: string; blurb: string }

export const fonts: Font[] = [
  { id: 'nunito', label: 'Nunito', family: '"Nunito Variable", ui-sans-serif, system-ui, sans-serif', blurb: 'Round and friendly. The house face.' },
  { id: 'inter', label: 'Inter', family: '"Inter Variable", ui-sans-serif, system-ui, sans-serif', blurb: 'Plain and clear.' },
  { id: 'poppins', label: 'Poppins', family: '"Poppins", sans-serif', google: 'Poppins:wght@400;600;700;800', blurb: 'Geometric, a bit bold.' },
  { id: 'space-grotesk', label: 'Space Grotesk', family: '"Space Grotesk", sans-serif', google: 'Space+Grotesk:wght@400;500;700', blurb: 'Techy with a wink.' },
  { id: 'josefin-sans', label: 'Josefin Sans', family: '"Josefin Sans", sans-serif', google: 'Josefin+Sans:wght@400;600;700', blurb: 'Light and tall.' },
  { id: 'bebas-neue', label: 'Bebas Neue', family: '"Bebas Neue", sans-serif', google: 'Bebas+Neue', blurb: 'All caps, poster loud.' },
  { id: 'playfair-display', label: 'Playfair', family: '"Playfair Display", serif', google: 'Playfair+Display:wght@400;700;800', blurb: 'High-contrast serif, editorial.' },
  { id: 'lora', label: 'Lora', family: '"Lora", serif', google: 'Lora:wght@400;600;700', blurb: 'A calm serif for reading.' },
  { id: 'fraunces', label: 'Fraunces', family: '"Fraunces", serif', google: 'Fraunces:wght@400;700;900', blurb: 'Soft, old-style, warm.' },
  { id: 'dm-serif-display', label: 'DM Serif', family: '"DM Serif Display", serif', google: 'DM+Serif+Display', blurb: 'Big elegant headings.' },
  { id: 'montserrat', label: 'Montserrat', family: '"Montserrat", sans-serif', google: 'Montserrat:wght@400;600;800', blurb: 'Wide and confident.' },
  { id: 'merriweather', label: 'Merriweather', family: '"Merriweather", serif', google: 'Merriweather:wght@400;700;900', blurb: 'A sturdy serif for long reads.' },
  { id: 'caveat', label: 'Caveat', family: '"Caveat", cursive', google: 'Caveat:wght@400;700', blurb: 'Handwritten.' },
  { id: 'jetbrains-mono', label: 'JetBrains', family: '"JetBrains Mono", monospace', google: 'JetBrains+Mono:wght@400;700', blurb: 'Monospace, for the technical.' },
];

export const CUSTOM = 'custom:';
/** A font named by the person: any family on Google Fonts, stored as custom:<Family Name>. */
export const isCustom = (id: string | null | undefined) => !!id && id.startsWith(CUSTOM);
export const customName = (id: string | null | undefined) => (id && isCustom(id) ? id.slice(CUSTOM.length) : '');
/** Only letters, digits and spaces, as Google family names are. */
export const cleanFamily = (name: string) => name.replace(/[^A-Za-z0-9 ]/g, '').replace(/\s+/g, ' ').trim().slice(0, 50);

export function fontById(id: string | null | undefined): Font {
  if (id && isCustom(id)) { const name = customName(id); return { id, label: name, family: `"${name}", sans-serif`, google: `${name.replace(/ /g, '+')}:wght@400;700`, blurb: 'From Google Fonts, by name.' }; }
  return fonts.find((f) => f.id === id) ?? fonts[0]!;
}

/** The Google Fonts stylesheet for one font, or for every Google font at once (the editor's picker). */
export function fontHref(ids?: string[]): string | null {
  const picked = (ids ? ids.map(fontById).filter((f, i, a) => a.findIndex((x) => x.id === f.id) === i) : fonts).filter((f) => f.google);
  if (!picked.length) return null;
  return `https://fonts.googleapis.com/css2?${picked.map((f) => `family=${f.google}`).join('&')}&display=swap`;
}

/** Put the stylesheet for these fonts in the document head once. */
export function ensureFonts(ids: string[]): void {
  const href = fontHref(ids);
  if (!href || typeof document === 'undefined') return;
  if (document.head.querySelector(`link[data-yare-fonts="${ids.join(',')}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet'; link.href = href; link.dataset.yareFonts = ids.join(',');
  document.head.appendChild(link);
}
