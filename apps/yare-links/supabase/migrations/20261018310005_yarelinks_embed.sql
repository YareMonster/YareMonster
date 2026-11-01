-- Yare Links · migration 20261018310005 · a block can show a form from Yare Forms
--
-- A block of type 'embed' shows the page at its link inside the block when the block is big
-- enough; smaller, a tap opens it. Made for Yare Forms, works for any page that allows framing.

alter table public.yarelinks_blocks drop constraint if exists yarelinks_blocks_type_check;
alter table public.yarelinks_blocks add constraint yarelinks_blocks_type_check
  check (type in ('link', 'text', 'image', 'youtube', 'spotify', 'soundcloud', 'video', 'form', 'signup', 'contact', 'map', 'header', 'embed'));

notify pgrst, 'reload schema';
