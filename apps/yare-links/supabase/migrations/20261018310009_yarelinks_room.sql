-- Yare Links · migration 20261018310009 · more room
--
-- A gap of 16px between blocks, and a fourth size of words: huge, for a headline over a photo.

alter table public.yarelinks_pages drop constraint if exists yarelinks_pages_grid_gap_check;
alter table public.yarelinks_pages add constraint yarelinks_pages_grid_gap_check check (grid_gap between 0 and 16);
alter table public.yarelinks_blocks drop constraint if exists yarelinks_blocks_text_size_check;
alter table public.yarelinks_blocks add constraint yarelinks_blocks_text_size_check check (text_size in ('s', 'm', 'l', 'xl'));

notify pgrst, 'reload schema';
