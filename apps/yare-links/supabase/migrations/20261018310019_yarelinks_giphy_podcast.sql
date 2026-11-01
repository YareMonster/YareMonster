-- Yare Links · migration 20261018310019 · a GIF block and a podcast feed block
--
-- Two more things a block can be: a GIF from Giphy as its background, and the latest episodes of
-- a podcast read from its RSS feed. (Spotify was already a type.)

alter table public.yarelinks_blocks drop constraint if exists yarelinks_blocks_type_check;
alter table public.yarelinks_blocks add constraint yarelinks_blocks_type_check
  check (type in ('link', 'text', 'image', 'youtube', 'spotify', 'soundcloud', 'video', 'form', 'signup', 'contact', 'map', 'header', 'embed', 'product', 'youtube_feed', 'substack_feed', 'qr', 'giphy', 'podcast_feed'));

notify pgrst, 'reload schema';
