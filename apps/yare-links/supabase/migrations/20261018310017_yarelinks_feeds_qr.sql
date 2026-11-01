-- Yare Links · migration 20261018310017 · feed blocks and a QR code block
--
-- Three more things a block can be: the latest videos of a YouTube channel, the latest posts of a
-- Substack, and a QR code of the block's link.

alter table public.yarelinks_blocks drop constraint if exists yarelinks_blocks_type_check;
alter table public.yarelinks_blocks add constraint yarelinks_blocks_type_check
  check (type in ('link', 'text', 'image', 'youtube', 'spotify', 'soundcloud', 'video', 'form', 'signup', 'contact', 'map', 'header', 'embed', 'product', 'youtube_feed', 'substack_feed', 'qr'));

notify pgrst, 'reload schema';
