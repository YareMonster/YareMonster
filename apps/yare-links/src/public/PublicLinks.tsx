import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router';
import { Spinner } from '@heroui/react';
import { XIcon } from '@phosphor-icons/react';
import { PoweredByYare, YareMark, publicThemeById, publicThemeStyle } from '../yare';
import type { BlockOptions, Client, PublicBlock, PublicPage } from '../lib/supabase';
import { imageUrl, mediaUrl } from '../lib/supabase';
import { describeVisit, fetchFeed, openPage, submit, track, unlock } from '../lib/links-api';
import { videoEmbed } from '../lib/grid';
import { GridScreen } from '../grid/GridScreen';

/** A visitor's page: loaded by its address, counted once, every tap counted. */
export function PublicLinks({ db }: { db: Client }) {
  const { slug = '' } = useParams();
  const [page, setPage] = useState<PublicPage | null | undefined>(undefined);
  const [unlocked, setUnlocked] = useState<Record<string, { url: string; options: BlockOptions }>>({});
  const [video, setVideo] = useState<string | null>(null);
  const visit = useRef<{ ref: string | null; country: string | null; device: string | null }>({ ref: null, country: null, device: null });

  useEffect(() => {
    let gone = false;
    openPage(db, slug).then(async (p) => {
      if (gone) return;
      if (p.redirect_url) { window.location.replace(p.redirect_url); return; }
      setPage(p);
      document.title = p.seo_title || p.title;
      setMeta('description', p.seo_description || p.bio);
      setMeta('og:title', p.seo_title || p.title, 'property');
      setMeta('og:description', p.seo_description || p.bio, 'property');
      const share = imageUrl(db, p.share_image_path);
      if (share) setMeta('og:image', share, 'property');
      const icon = imageUrl(db, p.icon_path);
      if (icon) for (const l of document.head.querySelectorAll<HTMLLinkElement>('link[rel="icon"], link[rel="apple-touch-icon"]')) { l.href = icon; l.removeAttribute('type'); }
      visit.current = await describeVisit();
      void track(db, p.id, 'view', null, visit.current);
    }).catch(() => { if (!gone) setPage(null); });
    return () => { gone = true; };
  }, [db, slug]);

  // The document itself wears the page colour, so nothing else shows past the page's end or while scrolling.
  useEffect(() => {
    if (!page) return;
    const root = document.documentElement; const before = root.style.background;
    root.style.background = page.bg_color || '#f7f8fb';
    return () => { root.style.background = before; };
  }, [page]);

  useEffect(() => {
    if (!video) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setVideo(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [video]);

  if (page === undefined) return <div className="grid min-h-dvh place-items-center" aria-busy="true"><Spinner aria-label="Loading" /></div>;
  if (page === null) {
    return (
      <div className="yp" style={publicThemeStyle(publicThemeById('paper')) as React.CSSProperties}>
        <main className="yp__main"><div className="yp__screen items-center text-center"><YareMark size={64} /><h1 className="yp__title">This page is not open</h1><p className="yp__desc">The address may be wrong, or the page is not published.</p></div></main>
        <PoweredByYare />
      </div>
    );
  }

  const onOpen = (b: PublicBlock, url: string) => {
    void track(db, page.id, 'click', b.id, visit.current);
    const embed = videoEmbed(url);
    if (embed) { setVideo(embed); return; }
    window.open(url, '_blank', 'noopener,noreferrer');
  };
  const onUnlock = async (b: PublicBlock, code: string) => {
    try { const got = await unlock(db, b.id, code); setUnlocked((u) => ({ ...u, [b.id]: got })); return true; }
    catch { return false; }
  };

  const onSubmit = async (b: PublicBlock, entry: Record<string, string>) => {
    await submit(db, b.id, entry);
    void track(db, page.id, 'click', b.id, visit.current);
  };

  return (
    <>
      <GridScreen page={page} ctx={{ imageUrl: (p) => imageUrl(db, p), mediaUrl: (p) => mediaUrl(db, p), unlocked, onOpen, onUnlock, onSubmit, feed: (k, u, n) => fetchFeed(db, k, u, n) }} />
      {video && (
        <div className="yg-overlay" role="dialog" aria-label="Video" onClick={() => setVideo(null)}>
          <div className="yg-overlay__frame" onClick={(e) => e.stopPropagation()}><iframe src={video} title="Video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div>
          <button type="button" className="yg-overlay__close" aria-label="Close" onClick={() => setVideo(null)}><XIcon weight="bold" className="size-5" /></button>
        </div>
      )}
    </>
  );
}

function setMeta(name: string, content: string, attr: 'name' | 'property' = 'name') {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
  el.content = content;
}
