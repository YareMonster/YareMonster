-- Yare Links · migration 20261018310010 · any colour for the words
--
-- Besides auto, light and dark, a block's words can be any colour, stored as a hex like #ffe91a.

alter table public.yarelinks_blocks drop constraint if exists yarelinks_blocks_text_color_check;
alter table public.yarelinks_blocks add constraint yarelinks_blocks_text_color_check
  check (text_color in ('auto', 'light', 'dark') or text_color ~ '^#[0-9a-f]{6}$');

notify pgrst, 'reload schema';
