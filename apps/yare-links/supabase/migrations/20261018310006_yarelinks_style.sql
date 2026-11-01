-- Yare Links · migration 20261018310006 · fonts and block style
--
-- A page picks its font from a set the app knows by name. A block can go without a background,
-- wear a thin border, and set the size and alignment of its words.

alter table public.yarelinks_pages drop constraint if exists yarelinks_pages_font_check;
update public.yarelinks_pages set font = case font when 'serif' then 'lora' when 'mono' then 'jetbrains-mono' else 'nunito' end
  where font in ('sans', 'display', 'serif', 'mono');
alter table public.yarelinks_pages alter column font set default 'nunito';
alter table public.yarelinks_pages add constraint yarelinks_pages_font_check check (font ~ '^[a-z0-9-]{1,40}$');

-- Until now an empty colour meant white; from now on it means no background. Keep what people had.
update public.yarelinks_blocks set bg_color = '#ffffff' where bg_color = '';
alter table public.yarelinks_blocks alter column bg_color set default '#ffffff';

alter table public.yarelinks_blocks
  add column if not exists border     boolean not null default false,
  add column if not exists text_size  text not null default 'm' check (text_size in ('s', 'm', 'l')),
  add column if not exists text_align text not null default 'left' check (text_align in ('left', 'center'));

create or replace function public.yarelinks_block_json(b public.yarelinks_blocks)
returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_build_object(
    'id', b.id, 'type', b.type, 'title', b.title, 'description', b.description, 'thumbnail_path', b.thumbnail_path,
    'featured', b.featured, 'highlight', b.highlight, 'lock_kind', b.lock_kind, 'min_age', b.min_age,
    'x', b.x, 'y', b.y, 'w', b.w, 'h', b.h, 'icon', b.icon, 'bg_color', b.bg_color, 'bg_path', b.bg_path, 'text_color', b.text_color,
    'border', b.border, 'text_size', b.text_size, 'text_align', b.text_align,
    'url', case when b.lock_kind = 'code' then '' else b.url end,
    'options', case when b.lock_kind = 'code' then '{}'::jsonb else b.options end);
$$;

notify pgrst, 'reload schema';
