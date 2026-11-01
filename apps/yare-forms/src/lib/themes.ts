/**
 * The nine looks a published form can wear: two neutral, five in Yare Monster's colours, two soft
 * gradients. A theme is a handful of CSS variables the public runner applies to its root.
 */
export interface FormTheme {
  id: string;
  name: string;
  group: 'neutral' | 'colour' | 'gradient';
  vars: {
    bg: string;
    text: string;
    muted: string;
    accent: string;
    accentText: string;
    field: string;
    fieldBorder: string;
  };
}

export const themes: FormTheme[] = [
  { id: 'paper', name: 'Paper', group: 'neutral', vars: { bg: '#f7f8fb', text: '#272d39', muted: '#6b7694', accent: '#ffe91a', accentText: '#272d39', field: '#ffffff', fieldBorder: '#dde5f1' } },
  { id: 'ink', name: 'Ink', group: 'neutral', vars: { bg: '#272d39', text: '#ffffff', muted: '#b4bccf', accent: '#ffe91a', accentText: '#272d39', field: '#333a48', fieldBorder: '#4a5265' } },
  { id: 'sunshine', name: 'Sunshine', group: 'colour', vars: { bg: '#ffe91a', text: '#272d39', muted: '#5a5420', accent: '#272d39', accentText: '#ffffff', field: '#fff7a8', fieldBorder: '#e9ca13' } },
  { id: 'ocean', name: 'Ocean', group: 'colour', vars: { bg: '#0073fe', text: '#ffffff', muted: '#cfe3ff', accent: '#ffe91a', accentText: '#272d39', field: '#1f84ff', fieldBorder: '#6aaaff' } },
  { id: 'coral', name: 'Coral', group: 'colour', vars: { bg: '#ff6b57', text: '#ffffff', muted: '#ffd9d3', accent: '#272d39', accentText: '#ffffff', field: '#ff8574', fieldBorder: '#ffb0a5' } },
  { id: 'forest', name: 'Forest', group: 'colour', vars: { bg: '#1f6f4a', text: '#ffffff', muted: '#bfe3d0', accent: '#ffe91a', accentText: '#272d39', field: '#2a7f58', fieldBorder: '#5ea885' } },
  { id: 'lavender', name: 'Lavender', group: 'colour', vars: { bg: '#8f7cf8', text: '#ffffff', muted: '#e4defd', accent: '#ffe91a', accentText: '#272d39', field: '#9d8cf9', fieldBorder: '#c3b8fc' } },
  { id: 'dawn', name: 'Dawn', group: 'gradient', vars: { bg: 'linear-gradient(135deg, #ffe3d6 0%, #e9ddff 100%)', text: '#272d39', muted: '#6b6480', accent: '#272d39', accentText: '#ffffff', field: '#ffffff', fieldBorder: '#e4d8ea' } },
  { id: 'mist', name: 'Mist', group: 'gradient', vars: { bg: 'linear-gradient(135deg, #dcefff 0%, #d9f7ea 100%)', text: '#272d39', muted: '#5f7084', accent: '#0073fe', accentText: '#ffffff', field: '#ffffff', fieldBorder: '#cfe0ee' } },
];

export const defaultTheme = themes[0]!;
export const themeById = (id: string) => themes.find((t) => t.id === id) ?? defaultTheme;

/** Inline style for a themed surface. */
export function themeStyle(theme: FormTheme): Record<string, string> {
  const v = theme.vars;
  return { '--f-bg': v.bg, '--f-text': v.text, '--f-muted': v.muted, '--f-accent': v.accent, '--f-accent-text': v.accentText, '--f-field': v.field, '--f-field-border': v.fieldBorder };
}
