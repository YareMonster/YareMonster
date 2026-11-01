import { useEffect } from 'react';

/** What the browser tab shows by default: Yare Groups, with the Yare Monster mark. */
const ours = { title: 'Yare Groups', icon: '/yare/favicon/favicon.svg', iconPng: '/yare/favicon/favicon-32.png' };

/**
 * Inside the group, the tab is the group's: its name as the title and its logo as the icon when it
 * has one. Ours by default, and back to ours when the group is left.
 */
export function useGroupIdentity(name: string | null | undefined, logoUrl: string | null | undefined): void {
  useEffect(() => {
    if (!name) return;
    const before = document.title;
    document.title = name;
    const links = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="icon"]'));
    const prior = links.map((l) => ({ l, href: l.href, type: l.type }));
    if (logoUrl) for (const l of links) { l.href = logoUrl; l.removeAttribute('type'); }
    return () => {
      document.title = before || ours.title;
      for (const { l, href, type } of prior) { l.href = href; if (type) l.type = type; }
    };
  }, [name, logoUrl]);
}
