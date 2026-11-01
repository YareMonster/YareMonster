import { useLayoutEffect, useRef, type ReactNode } from 'react';

/** Where each phone was scrolled to, by key, so a phone that comes back opens where it was. */
const scrolled = new Map<string, number>();

/**
 * A phone-shaped frame for previewing a public page inside an editor. The content scrolls on its
 * own; the frame keeps the proportions of a phone whatever the column width. Give it a scrollKey
 * and it remembers its scroll position across tabs.
 */
export function PhonePreview({ children, label = 'Preview', className, scrollKey }: { children: ReactNode; label?: string; className?: string; scrollKey?: string }) {
  const screen = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = screen.current;
    if (!el || !scrollKey) return;
    el.scrollTop = scrolled.get(scrollKey) ?? 0;
    const onScroll = () => scrolled.set(scrollKey, el.scrollTop);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [scrollKey]);
  return (
    <div className={['yare-phone', className].filter(Boolean).join(' ')} role="region" aria-label={label}>
      <div className="yare-phone__screen" ref={screen}>{children}</div>
    </div>
  );
}
