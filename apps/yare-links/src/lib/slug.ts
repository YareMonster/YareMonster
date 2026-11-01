/** Turns a title into a public address: lowercase letters, digits and hyphens. */
export function slugFromTitle(title: string): string {
  return title.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'links';
}

export const RESERVED = ['pages', 'connections', 'reset', 'login', 'signin', 'api', 'assets', 'yare', 'admin', 'manage', 'settings', 'new'];
export const isValidSlug = (s: string) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s) && s.length >= 2 && s.length <= 40 && !RESERVED.includes(s);
