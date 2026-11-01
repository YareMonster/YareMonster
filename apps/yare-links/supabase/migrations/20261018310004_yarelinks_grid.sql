-- Yare Links · migration 20261018310004 · the page is a grid
--
-- A page is a grid six cells wide; twelve rows make one phone screen and the grid grows down when
-- needed. Every block has a place (x, y) and a size (w, h) in cells, an optional icon, a title, a
-- line under it, a link, and its own background. The page keeps a background of its own, the gap
-- between blocks and how round their corners are.

alter table public.yarelinks_blocks
  add column if not exists x          integer not null default 0 check (x between 0 and 5),
  add column if not exists y          integer not null default 0 check (y >= 0),
  add column if not exists w          integer not null default 1 check (w between 1 and 6),
  add column if not exists h          integer not null default 1 check (h between 1 and 48),
  -- The name of an icon from the app's set, or empty.
  add column if not exists icon       text not null default '' check (char_length(icon) <= 40),
  -- A colour like #ffe91a, or empty for the theme's block colour.
  add column if not exists bg_color   text not null default '' check (bg_color = '' or bg_color ~ '^#[0-9a-f]{6}$'),
  -- A picture inside the public yare-images bucket, folder yare-links/<page id>/, shown as the block's background.
  add column if not exists bg_path    text,
  -- light or dark words over the background; auto picks from the colour.
  add column if not exists text_color text not null default 'auto' check (text_color in ('auto', 'light', 'dark'));
alter table public.yarelinks_blocks drop constraint if exists yarelinks_blocks_type_check;
alter table public.yarelinks_blocks add constraint yarelinks_blocks_type_check
  check (type in ('link', 'text', 'image', 'youtube', 'spotify', 'soundcloud', 'video', 'form', 'signup', 'contact', 'map', 'header'));
alter table public.yarelinks_blocks alter column w set default 2;
alter table public.yarelinks_blocks alter column h set default 2;

alter table public.yarelinks_pages
  add column if not exists grid_gap    integer not null default 4 check (grid_gap between 0 and 12),
  add column if not exists grid_radius integer not null default 12 check (grid_radius between 0 and 48),
  add column if not exists bg_color    text not null default '' check (bg_color = '' or bg_color ~ '^#[0-9a-f]{6}$');

-- What a block shows a visitor, with its place and size.
create or replace function public.yarelinks_block_json(b public.yarelinks_blocks)
returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_build_object(
    'id', b.id, 'type', b.type, 'title', b.title, 'description', b.description, 'thumbnail_path', b.thumbnail_path,
    'featured', b.featured, 'highlight', b.highlight, 'lock_kind', b.lock_kind, 'min_age', b.min_age,
    'x', b.x, 'y', b.y, 'w', b.w, 'h', b.h, 'icon', b.icon, 'bg_color', b.bg_color, 'bg_path', b.bg_path, 'text_color', b.text_color,
    'url', case when b.lock_kind = 'code' then '' else b.url end,
    'options', case when b.lock_kind = 'code' then '{}'::jsonb else b.options end);
$$;

create or replace function public.yarelinks_open(p_slug text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare p public.yarelinks_pages%rowtype; v_redirect text;
begin
  select * into p from public.yarelinks_pages where slug = p_slug;
  if p.id is null or p.status <> 'published' then raise exception 'This page is not open.' using errcode = 'P0002'; end if;
  if p.redirect_block_id is not null and (p.redirect_until is null or p.redirect_until > now()) then
    select b.url into v_redirect from public.yarelinks_blocks b where b.id = p.redirect_block_id and b.type = 'link' and not b.archived and b.lock_kind = 'none';
  end if;
  return jsonb_build_object(
    'id', p.id, 'title', p.title, 'bio', p.bio, 'theme', p.theme, 'avatar_path', p.avatar_path, 'logo_path', p.logo_path,
    'wallpaper_path', p.wallpaper_path, 'wallpaper_kind', p.wallpaper_kind, 'layout', p.layout, 'button_shape', p.button_shape,
    'button_fill', p.button_fill, 'font', p.font, 'socials', p.socials, 'socials_position', p.socials_position,
    'seo_title', p.seo_title, 'seo_description', p.seo_description, 'share_image_path', p.share_image_path,
    'grid_gap', p.grid_gap, 'grid_radius', p.grid_radius, 'bg_color', p.bg_color,
    'redirect_url', v_redirect,
    'blocks', coalesce((select jsonb_agg(public.yarelinks_block_json(b) order by b.y, b.x, b.position)
                          from public.yarelinks_blocks b
                         where b.page_id = p.id and not b.archived
                           and (b.starts_at is null or b.starts_at <= now()) and (b.ends_at is null or b.ends_at > now())), '[]'::jsonb));
end; $$;

notify pgrst, 'reload schema';
