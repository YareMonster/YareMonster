-- Yare Links · migration 20261018310008 · a font by name
--
-- Besides the app's set, a page or a block can name any family from Google Fonts: the value is
-- stored as custom:<Family Name>.

alter table public.yarelinks_pages drop constraint if exists yarelinks_pages_font_check;
alter table public.yarelinks_pages add constraint yarelinks_pages_font_check check (font ~ '^([a-z0-9-]{1,40}|custom:[A-Za-z0-9 ]{1,50})$');
alter table public.yarelinks_blocks drop constraint if exists yarelinks_blocks_font_check;
alter table public.yarelinks_blocks add constraint yarelinks_blocks_font_check check (font = '' or font ~ '^([a-z0-9-]{1,40}|custom:[A-Za-z0-9 ]{1,50})$');

notify pgrst, 'reload schema';
