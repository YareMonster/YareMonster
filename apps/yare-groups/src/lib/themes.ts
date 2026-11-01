/**
 * The twelve looks a group can wear, on its sign-in page and inside: six classics (three light, three
 * dark) and six soft gradients (four light, two dark). No reds, nothing loud; a group is a place
 * people spend time. A theme recolours the shared design system (the same sidebar, cards and
 * controls every Yare Monster app uses) by setting its tokens on the page root; nothing else moves.
 */
export interface GroupTheme {
  id: string;
  name: string;
  group: 'classic' | 'gradient';
  dark: boolean;
  vars: {
    /** The page canvas: a colour or a gradient. */
    bg: string;
    /** Cards, the sidebar, the top bar. May be translucent on a gradient. */
    surface: string;
    /** Hover fills, chips, secondary fills. */
    raised: string;
    /** Popovers, menus, dialogs and fields: always opaque. */
    solid: string;
    text: string;
    muted: string;
    accent: string;
    accentText: string;
    border: string;
  };
}

export const groupThemes: GroupTheme[] = [
  { id: 'paper', name: 'Paper', group: 'classic', dark: false, vars: { bg: '#f7f8fb', surface: '#ffffff', raised: '#f3f5f9', solid: '#ffffff', text: '#272d39', muted: '#6b7694', accent: '#0073fe', accentText: '#ffffff', border: '#dde5f1' } },
  { id: 'cream', name: 'Cream', group: 'classic', dark: false, vars: { bg: '#f1ebdf', surface: '#fbf8f1', raised: '#f1ebdf', solid: '#fbf8f1', text: '#2b2a26', muted: '#7a7466', accent: '#8a6a3b', accentText: '#ffffff', border: '#e2d9c6' } },
  { id: 'sage', name: 'Sage', group: 'classic', dark: false, vars: { bg: '#e8efea', surface: '#f6faf7', raised: '#e9f0ea', solid: '#f6faf7', text: '#22302a', muted: '#627068', accent: '#2f7a5b', accentText: '#ffffff', border: '#d2dfd6' } },
  { id: 'ink', name: 'Ink', group: 'classic', dark: true, vars: { bg: '#1f242e', surface: '#272d39', raised: '#313847', solid: '#2c3341', text: '#f5f7fb', muted: '#aab3c5', accent: '#8ab4ff', accentText: '#0f1a2e', border: '#3a4252' } },
  { id: 'graphite', name: 'Graphite', group: 'classic', dark: true, vars: { bg: '#17181b', surface: '#202126', raised: '#2a2b31', solid: '#25262c', text: '#f2f2f3', muted: '#a0a3ab', accent: '#8ab4ff', accentText: '#0f1a2e', border: '#33353c' } },
  { id: 'midnight', name: 'Midnight', group: 'classic', dark: true, vars: { bg: '#0f1a33', surface: '#15224a', raised: '#1c2c5c', solid: '#182752', text: '#eef2ff', muted: '#9fb0d8', accent: '#f4d35e', accentText: '#1b2440', border: '#26386e' } },
  { id: 'dawn', name: 'Dawn', group: 'gradient', dark: false, vars: { bg: 'linear-gradient(160deg, #ffe3d6 0%, #e9ddff 100%)', surface: 'rgba(255, 255, 255, 0.78)', raised: 'rgba(255, 255, 255, 0.95)', solid: '#fffaf8', text: '#272d39', muted: '#6b6480', accent: '#7a5af5', accentText: '#ffffff', border: 'rgba(39, 45, 57, 0.1)' } },
  { id: 'mist', name: 'Mist', group: 'gradient', dark: false, vars: { bg: 'linear-gradient(160deg, #dcefff 0%, #d9f7ea 100%)', surface: 'rgba(255, 255, 255, 0.78)', raised: 'rgba(255, 255, 255, 0.95)', solid: '#f7fbfe', text: '#272d39', muted: '#5f7084', accent: '#0073fe', accentText: '#ffffff', border: 'rgba(39, 45, 57, 0.1)' } },
  { id: 'meadow', name: 'Meadow', group: 'gradient', dark: false, vars: { bg: 'linear-gradient(160deg, #e6f6d8 0%, #fff6c7 100%)', surface: 'rgba(255, 255, 255, 0.78)', raised: 'rgba(255, 255, 255, 0.95)', solid: '#fbfdf5', text: '#26301f', muted: '#6a7560', accent: '#3f8f3a', accentText: '#ffffff', border: 'rgba(38, 48, 31, 0.1)' } },
  { id: 'lilac', name: 'Lilac', group: 'gradient', dark: false, vars: { bg: 'linear-gradient(160deg, #efe6ff 0%, #dbe9ff 100%)', surface: 'rgba(255, 255, 255, 0.78)', raised: 'rgba(255, 255, 255, 0.95)', solid: '#faf8ff', text: '#2a2740', muted: '#6e6a88', accent: '#6a4cf0', accentText: '#ffffff', border: 'rgba(42, 39, 64, 0.1)' } },
  { id: 'dusk', name: 'Dusk', group: 'gradient', dark: true, vars: { bg: 'linear-gradient(160deg, #1c1f3a 0%, #3a2a5a 100%)', surface: 'rgba(14, 12, 32, 0.55)', raised: 'rgba(255, 255, 255, 0.08)', solid: '#262445', text: '#f3efff', muted: '#b8b0d6', accent: '#ffc97a', accentText: '#2a1f3a', border: 'rgba(255, 255, 255, 0.12)' } },
  { id: 'aurora', name: 'Aurora', group: 'gradient', dark: true, vars: { bg: 'linear-gradient(160deg, #0f2a3a 0%, #1f1f4a 100%)', surface: 'rgba(6, 14, 24, 0.55)', raised: 'rgba(255, 255, 255, 0.08)', solid: '#162838', text: '#eefaf6', muted: '#a9c6c0', accent: '#7ee0c3', accentText: '#0b2a24', border: 'rgba(255, 255, 255, 0.12)' } },
];

export const defaultGroupTheme = groupThemes[0]!;
export const groupThemeById = (id: string) => groupThemes.find((t) => t.id === id) ?? defaultGroupTheme;

/** The design system tokens a theme sets, and their values. */
export function groupThemeTokens(theme: GroupTheme): Record<string, string> {
  const v = theme.vars;
  return {
    '--background': v.bg,
    '--foreground': v.text,
    '--surface': v.surface, '--surface-foreground': v.text,
    '--surface-secondary': v.raised, '--surface-secondary-foreground': v.text,
    '--surface-tertiary': v.raised, '--surface-tertiary-foreground': v.text,
    '--overlay': v.solid, '--overlay-foreground': v.text,
    '--segment': v.solid, '--segment-foreground': v.text,
    '--default': v.raised, '--default-foreground': v.text,
    '--muted': v.muted,
    '--accent': v.accent, '--accent-foreground': v.accentText, '--link': v.accent, '--focus': v.accent,
    '--border': v.border, '--separator': v.border,
    '--field-background': v.solid, '--field-foreground': v.text, '--field-border': v.border, '--field-placeholder': v.muted,
    '--yare-selected': `color-mix(in oklab, ${v.accent} 14%, ${v.solid})`,
    '--backdrop': theme.dark ? 'rgb(0 0 0 / 0.6)' : 'rgb(39 45 57 / 0.45)',
  };
}

/** Puts a theme on the page root, so the shell, drawers and dialogs all wear it. Returns the undo. */
export function applyGroupTheme(theme: GroupTheme): () => void {
  const root = document.documentElement;
  const tokens = groupThemeTokens(theme);
  for (const [k, val] of Object.entries(tokens)) root.style.setProperty(k, val);
  root.style.setProperty('color-scheme', theme.dark ? 'dark' : 'light');
  root.classList.toggle('dark', theme.dark);
  return () => {
    for (const k of Object.keys(tokens)) root.style.removeProperty(k);
    root.style.removeProperty('color-scheme');
    root.classList.remove('dark');
  };
}
