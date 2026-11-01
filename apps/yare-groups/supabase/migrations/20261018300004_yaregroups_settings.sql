-- Yare Groups · migration 20261018300004 · landing channel, rules, invite links, what members may do
--
-- Five settings on the group, each held by the database as well as the app:
--   landing_channel_id    where people land when they open the group
--   rules                 text members accept once before they post; accepting again after a change
--   invite_policy         admins only, or moderators too, make invite links (moderators invite members)
--   members_edit_posts    members may edit their own posts
--   members_remove_posts  members may remove their own posts
--   members_edit_profile  members may change their own name and picture
-- Admins and moderators are never held by the last three, and admins never need to accept the rules.

alter table public.yaregroups_group
  add column if not exists landing_channel_id   uuid references public.yaregroups_channels (id) on delete set null,
  add column if not exists rules                text not null default '' check (char_length(rules) <= 4000),
  add column if not exists rules_updated_at     timestamptz,
  add column if not exists invite_policy        text not null default 'admins' check (invite_policy in ('admins', 'moderators')),
  add column if not exists members_edit_posts   boolean not null default true,
  add column if not exists members_remove_posts boolean not null default true,
  add column if not exists members_edit_profile boolean not null default true;

alter table public.yaregroups_members
  add column if not exists rules_accepted_at timestamptz;

-- When the rules change, everyone accepts them again.
create or replace function public.yaregroups_touch_rules()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.rules is distinct from old.rules then new.rules_updated_at = now(); end if;
  return new;
end; $$;
drop trigger if exists yaregroups_group_touch_rules on public.yaregroups_group;
create trigger yaregroups_group_touch_rules before update on public.yaregroups_group
  for each row execute function public.yaregroups_touch_rules();

-- Has the signed-in person accepted the current rules? Admins never need to; no rules, nothing to accept.
create or replace function public.yaregroups_rules_ok()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.yaregroups_is_staff()
      or exists (select 1 from public.yaregroups_group g
                  where g.rules = ''
                     or exists (select 1 from public.yaregroups_members m
                                 where m.user_id = auth.uid() and m.rules_accepted_at is not null
                                   and m.rules_accepted_at >= coalesce(g.rules_updated_at, g.created_at)));
$$;

-- Posting now also needs the rules accepted.
create or replace function public.yaregroups_can_post(p_channel uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.yaregroups_can_see(p_channel)
     and public.yaregroups_rules_ok()
     and exists (select 1 from public.yaregroups_members m where m.user_id = auth.uid() and m.status = 'active' and (m.muted_until is null or m.muted_until < now()))
     and exists (select 1 from public.yaregroups_channels c where c.id = p_channel and not c.archived
                   and (c.post_policy = 'everyone'
                        or (c.post_policy = 'moderators' and public.yaregroups_is_mod())
                        or (c.post_policy = 'admins' and public.yaregroups_is_staff())));
$$;

-- Who may make invite links.
create or replace function public.yaregroups_can_invite()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.yaregroups_is_staff()
      or (public.yaregroups_role() = 'moderator' and exists (select 1 from public.yaregroups_group g where g.invite_policy = 'moderators'));
$$;

revoke all on function public.yaregroups_rules_ok(), public.yaregroups_can_invite() from public;
grant execute on function public.yaregroups_rules_ok(), public.yaregroups_can_invite(), public.yaregroups_can_post(uuid) to authenticated;

drop policy if exists "yaregroups_invites: staff all" on public.yaregroups_invites;
drop policy if exists "yaregroups_invites: read" on public.yaregroups_invites;
create policy "yaregroups_invites: read" on public.yaregroups_invites for select to authenticated
  using (public.yaregroups_is_staff() or (created_by = (select auth.uid()) and public.yaregroups_can_invite()));
drop policy if exists "yaregroups_invites: make" on public.yaregroups_invites;
create policy "yaregroups_invites: make" on public.yaregroups_invites for insert to authenticated
  with check (public.yaregroups_is_staff() or (public.yaregroups_can_invite() and role = 'member' and created_by = (select auth.uid())));
drop policy if exists "yaregroups_invites: revoke" on public.yaregroups_invites;
create policy "yaregroups_invites: revoke" on public.yaregroups_invites for update to authenticated
  using (public.yaregroups_is_staff() or (created_by = (select auth.uid()) and public.yaregroups_can_invite()))
  with check (public.yaregroups_is_staff() or (created_by = (select auth.uid()) and public.yaregroups_can_invite()));
drop policy if exists "yaregroups_invites: staff delete" on public.yaregroups_invites;
create policy "yaregroups_invites: staff delete" on public.yaregroups_invites for delete to authenticated
  using (public.yaregroups_is_staff());

-- Members: name and picture follow the setting; accepting the rules is always allowed.
create or replace function public.yaregroups_guard_member()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_actor text := public.yaregroups_role(); v_self boolean := new.user_id = auth.uid();
begin
  if auth.uid() is null then return new; end if; -- service role and functions
  if new.user_id <> old.user_id or new.joined_at <> old.joined_at then raise exception 'That cannot change.' using errcode = 'P0001'; end if;
  if v_actor not in ('owner', 'admin') then
    if not v_self then raise exception 'Only admins change other people.' using errcode = 'P0001'; end if;
    if new.role <> old.role or new.status <> old.status or new.flair is distinct from old.flair or new.flair_color is distinct from old.flair_color or new.muted_until is distinct from old.muted_until then
      raise exception 'Only admins change roles, flairs and standing.' using errcode = 'P0001';
    end if;
    if (new.display_name <> old.display_name or new.avatar_path is distinct from old.avatar_path) and v_actor = 'member'
       and not exists (select 1 from public.yaregroups_group g where g.members_edit_profile) then
      raise exception 'In this group, names and pictures are set by the admins.' using errcode = 'P0001';
    end if;
    if new.rules_accepted_at is distinct from old.rules_accepted_at then new.rules_accepted_at = now(); end if;
    return new;
  end if;
  if old.role = 'owner' and not v_self then raise exception 'The owner is out of reach.' using errcode = 'P0001'; end if;
  if old.role = 'owner' and new.role <> 'owner' then raise exception 'Hand the group over first (Members → Make owner).' using errcode = 'P0001'; end if;
  if new.role = 'owner' and old.role <> 'owner' then raise exception 'Ownership moves with Make owner, not here.' using errcode = 'P0001'; end if;
  if v_actor = 'admin' and old.role = 'admin' and not v_self and (new.role <> old.role or new.status <> old.status or new.muted_until is distinct from old.muted_until) then
    raise exception 'Only the owner changes an admin.' using errcode = 'P0001';
  end if;
  if v_actor = 'admin' and new.role = 'admin' and old.role <> 'admin' then raise exception 'Only the owner names admins.' using errcode = 'P0001'; end if;
  return new;
end; $$;

-- Posts: members edit and remove their own only when the group allows it.
create or replace function public.yaregroups_guard_message()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_mod boolean := public.yaregroups_is_mod(); v_author boolean := old.author_id = auth.uid(); g public.yaregroups_group%rowtype;
begin
  if auth.uid() is null then return new; end if;
  select * into g from public.yaregroups_group limit 1;
  if new.channel_id <> old.channel_id or new.author_id is distinct from old.author_id or new.created_at <> old.created_at
     or new.attachment_path is distinct from old.attachment_path or new.attachment_name is distinct from old.attachment_name
     or new.attachment_type is distinct from old.attachment_type or new.attachment_size is distinct from old.attachment_size then
    raise exception 'That part of a post cannot change.' using errcode = 'P0001';
  end if;
  if new.body <> old.body then
    if not v_author or old.deleted_at is not null then raise exception 'Only the author edits a post.' using errcode = 'P0001'; end if;
    if not v_mod and not g.members_edit_posts then raise exception 'In this group, posts cannot be edited.' using errcode = 'P0001'; end if;
    new.edited_at = now();
  end if;
  if new.pinned_at is distinct from old.pinned_at or new.pinned_by is distinct from old.pinned_by then
    if not v_mod then raise exception 'Only moderators pin.' using errcode = 'P0001'; end if;
    new.pinned_by = case when new.pinned_at is null then null else auth.uid() end;
  end if;
  if new.deleted_at is distinct from old.deleted_at then
    if not (v_mod or v_author) then raise exception 'Only the author or a moderator removes a post.' using errcode = 'P0001'; end if;
    if not v_mod and not g.members_remove_posts then raise exception 'In this group, only moderators remove posts.' using errcode = 'P0001'; end if;
  end if;
  return new;
end; $$;

notify pgrst, 'reload schema';
