-- Yare Pages · migration 20261018180004 · the website's own description
--
-- The description the site declares for search engines and social cards, read by the sync and
-- shown under the name on the website's card.

alter table public.yarepages_sites
  add column if not exists page_description text not null default '' check (char_length(page_description) <= 400);
