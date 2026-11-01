/** Turns a title into a public slug and adds a short random tail so two forms never clash. */
export function slugFromTitle(title: string): string {
  const base = title.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'form';
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}

export const isValidSlug = (s: string) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s) && s.length >= 3 && s.length <= 60;
