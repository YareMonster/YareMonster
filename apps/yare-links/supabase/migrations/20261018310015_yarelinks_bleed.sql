-- Yare Links · migration 20261018310015 · a block that runs to the edge
--
-- A block at the edge of the grid can run over the page's edge space and touch the screen on
-- that side: a six-wide block at the top becomes a full-bleed picture.

alter table public.yarelinks_blocks add column if not exists bleed boolean not null default false;

create or replace function public.yarelinks_block_json(b public.yarelinks_blocks)
returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_build_object(
    'id', b.id, 'type', b.type, 'title', b.title, 'description', b.description, 'thumbnail_path', b.thumbnail_path,
    'featured', b.featured, 'highlight', b.highlight, 'lock_kind', b.lock_kind, 'min_age', b.min_age,
    'x', b.x, 'y', b.y, 'w', b.w, 'h', b.h, 'icon', b.icon, 'bg_color', b.bg_color, 'bg_path', b.bg_path, 'text_color', b.text_color,
    'border', b.border, 'text_size', b.text_size, 'text_align', b.text_align, 'text_valign', b.text_valign, 'effect', b.effect, 'font', b.font, 'price', b.price, 'sub_size', b.sub_size, 'bleed', b.bleed,
    'url', case when b.lock_kind = 'code' then '' else b.url end,
    'options', case when b.lock_kind = 'code' then '{}'::jsonb else b.options end);
$$;

notify pgrst, 'reload schema';
