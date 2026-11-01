-- Yare Links · migration 20261018310007 · effect, font and alignment per block
--
-- A block has a colour and an effect. Fill paints the colour; no fill leaves the block open with
-- a line in the colour; glass is the colour frosted and see-through over whatever the page shows
-- behind it. A block can also pick its own font (empty means the page's) and align its words
-- left, centre or right.

alter table public.yarelinks_blocks
  add column if not exists effect text not null default 'fill' check (effect in ('fill', 'none', 'glass')),
  add column if not exists font   text not null default '' check (font = '' or font ~ '^[a-z0-9-]{1,40}$');
alter table public.yarelinks_blocks drop constraint if exists yarelinks_blocks_text_align_check;
alter table public.yarelinks_blocks add constraint yarelinks_blocks_text_align_check check (text_align in ('left', 'center', 'right'));

create or replace function public.yarelinks_block_json(b public.yarelinks_blocks)
returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_build_object(
    'id', b.id, 'type', b.type, 'title', b.title, 'description', b.description, 'thumbnail_path', b.thumbnail_path,
    'featured', b.featured, 'highlight', b.highlight, 'lock_kind', b.lock_kind, 'min_age', b.min_age,
    'x', b.x, 'y', b.y, 'w', b.w, 'h', b.h, 'icon', b.icon, 'bg_color', b.bg_color, 'bg_path', b.bg_path, 'text_color', b.text_color,
    'border', b.border, 'text_size', b.text_size, 'text_align', b.text_align, 'effect', b.effect, 'font', b.font,
    'url', case when b.lock_kind = 'code' then '' else b.url end,
    'options', case when b.lock_kind = 'code' then '{}'::jsonb else b.options end);
$$;

notify pgrst, 'reload schema';
