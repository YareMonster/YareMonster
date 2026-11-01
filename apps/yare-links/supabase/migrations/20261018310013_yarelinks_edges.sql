-- Yare Links · migration 20261018310013 · space at the edges, or none
--
-- With the edge space off, blocks touch the sides, the top and the bottom of the screen; a six-wide
-- block becomes a full-bleed picture.

alter table public.yarelinks_pages add column if not exists grid_pad boolean not null default true;

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
    'grid_gap', p.grid_gap, 'grid_radius', p.grid_radius, 'bg_color', p.bg_color, 'grid_pad', p.grid_pad,
    'redirect_url', v_redirect,
    'blocks', coalesce((select jsonb_agg(public.yarelinks_block_json(b) order by b.y, b.x, b.position)
                          from public.yarelinks_blocks b
                         where b.page_id = p.id and not b.archived
                           and (b.starts_at is null or b.starts_at <= now()) and (b.ends_at is null or b.ends_at > now())), '[]'::jsonb));
end; $$;

notify pgrst, 'reload schema';
