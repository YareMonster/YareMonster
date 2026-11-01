-- Yare Links · migration 20261018310012 · the subtext has a size of its own

alter table public.yarelinks_blocks add column if not exists sub_size text not null default 'm' check (sub_size in ('s', 'm', 'l'));

create or replace function public.yarelinks_block_json(b public.yarelinks_blocks)
returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_build_object(
    'id', b.id, 'type', b.type, 'title', b.title, 'description', b.description, 'thumbnail_path', b.thumbnail_path,
    'featured', b.featured, 'highlight', b.highlight, 'lock_kind', b.lock_kind, 'min_age', b.min_age,
    'x', b.x, 'y', b.y, 'w', b.w, 'h', b.h, 'icon', b.icon, 'bg_color', b.bg_color, 'bg_path', b.bg_path, 'text_color', b.text_color,
    'border', b.border, 'text_size', b.text_size, 'text_align', b.text_align, 'effect', b.effect, 'font', b.font, 'price', b.price, 'sub_size', b.sub_size,
    'url', case when b.lock_kind = 'code' then '' else b.url end,
    'options', case when b.lock_kind = 'code' then '{}'::jsonb else b.options end);
$$;

notify pgrst, 'reload schema';
