-- Yare Launcher · migration 0007 · Yare Groups joins the collection
--
-- A tile may point at any app of the collection. This widens the slug check to include Yare Groups.
-- Safe to re-run.

alter table public.launcher_apps drop constraint if exists launcher_apps_slug_check;
alter table public.launcher_apps add constraint launcher_apps_slug_check
  check (slug in ('forms', 'sign', 'pages', 'contacts', 'meet', 'transfer', 'bill', 'book', 'looks',
                  'analytics', 'blocks', 'canvas', 'coms', 'crypto', 'dash', 'fit', 'flash', 'fonts', 'lingo', 'persona',
                  'groups', 'custom'));
