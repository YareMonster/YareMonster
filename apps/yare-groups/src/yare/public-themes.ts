/**
 * The nine looks a public page can wear: a published form, a transfer link, a booking page. Two
 * neutral, five in Yare Monster's colours, two soft gradients. A theme is a handful of CSS
 * variables the page applies to its root (see public-page.css).
 */
export interface PublicTheme {
  id: string;
  name: string;
  group: 'neutral' | 'colour' | 'gradient';
  /** Light text on a dark ground. */
  dark: boolean;
  vars: { bg: string; text: string; muted: string; accent: string; accentText: string; field: string; fieldBorder: string };
}

export const publicThemes: PublicTheme[] = [
  { id: 'paper', name: 'Paper', group: 'neutral', dark: false, vars: { bg: '#f7f8fb', text: '#272d39', muted: '#6b7694', accent: '#ffe91a', accentText: '#272d39', field: '#ffffff', fieldBorder: '#dde5f1' } },
  { id: 'ink', name: 'Ink', group: 'neutral', dark: true, vars: { bg: '#272d39', text: '#ffffff', muted: '#b4bccf', accent: '#ffe91a', accentText: '#272d39', field: '#333a48', fieldBorder: '#4a5265' } },
  { id: 'sunshine', name: 'Sunshine', group: 'colour', dark: false, vars: { bg: '#ffe91a', text: '#272d39', muted: '#5a5420', accent: '#272d39', accentText: '#ffffff', field: '#fff7a8', fieldBorder: '#e9ca13' } },
  { id: 'ocean', name: 'Ocean', group: 'colour', dark: true, vars: { bg: '#0073fe', text: '#ffffff', muted: '#cfe3ff', accent: '#ffe91a', accentText: '#272d39', field: '#1f84ff', fieldBorder: '#6aaaff' } },
  { id: 'coral', name: 'Coral', group: 'colour', dark: true, vars: { bg: '#ff6b57', text: '#ffffff', muted: '#ffd9d3', accent: '#272d39', accentText: '#ffffff', field: '#ff8574', fieldBorder: '#ffb0a5' } },
  { id: 'forest', name: 'Forest', group: 'colour', dark: true, vars: { bg: '#1f6f4a', text: '#ffffff', muted: '#bfe3d0', accent: '#ffe91a', accentText: '#272d39', field: '#2a7f58', fieldBorder: '#5ea885' } },
  { id: 'lavender', name: 'Lavender', group: 'colour', dark: true, vars: { bg: '#8f7cf8', text: '#ffffff', muted: '#e4defd', accent: '#ffe91a', accentText: '#272d39', field: '#9d8cf9', fieldBorder: '#c3b8fc' } },
  { id: 'dawn', name: 'Dawn', group: 'gradient', dark: false, vars: { bg: 'linear-gradient(135deg, #ffe3d6 0%, #e9ddff 100%)', text: '#272d39', muted: '#6b6480', accent: '#272d39', accentText: '#ffffff', field: '#ffffff', fieldBorder: '#e4d8ea' } },
  { id: 'mist', name: 'Mist', group: 'gradient', dark: false, vars: { bg: 'linear-gradient(135deg, #dcefff 0%, #d9f7ea 100%)', text: '#272d39', muted: '#5f7084', accent: '#0073fe', accentText: '#ffffff', field: '#ffffff', fieldBorder: '#cfe0ee' } },
];

export const defaultPublicTheme = publicThemes[0]!;
export const publicThemeById = (id: string) => publicThemes.find((t) => t.id === id) ?? defaultPublicTheme;

/** Inline style for a themed page root. */
export function publicThemeStyle(theme: PublicTheme): Record<string, string> {
  const v = theme.vars;
  return { '--f-bg': v.bg, '--f-text': v.text, '--f-muted': v.muted, '--f-accent': v.accent, '--f-accent-text': v.accentText, '--f-field': v.field, '--f-field-border': v.fieldBorder };
}
