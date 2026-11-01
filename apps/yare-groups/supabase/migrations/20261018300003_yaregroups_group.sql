-- Yare Groups · migration 20261018300003 · the group, its members, channels, messages and invites
--
-- One deployment is one group: channels in categories, posts with pictures
-- and reactions, roles, invite links, a look of its own. Two kinds of accounts share one sign-in:
-- the operators on the deployment's allow list become owner and admins; everybody else joins through
-- an invite link (or freely, when the group is open) and is a member. The yaregroups-join Edge
-- Function creates member accounts; it is the only thing that puts an email on the allow list
-- without the operator.
--
-- Roles: owner (everything), admin (everything but removing the owner or the group), moderator
-- (pins, removes posts, mutes), member. Every channel says who may post: everyone, moderators and
-- up, or admins only (announcements). A private channel is visible to the people added to it and
-- to admins.
--
-- Access in short: members read the group, the directory and the channels they can see; posting
-- follows the channel's rule and the member's standing; admins manage everything through
-- row-level security, with triggers guarding the columns a role may not touch.

-- ---------------------------------------------------------------- the group (one row)
create table if not exists public.yaregroups_group (
  id              uuid primary key default gen_random_uuid(),
  one             boolean not null default true unique check (one),
  name            text not null default 'Our group' check (char_length(name) between 1 and 60),
  tagline         text not null default '' check (char_length(tagline) <= 160),
  -- Shown on the sign-in page under the name.
  welcome         text not null default '' check (char_length(welcome) <= 2000),
  -- Paths inside the public yare-images bucket, folder yare-groups/brand/.
  logo_path       text,
  background_path text,
  theme           text not null default 'paper',
  -- open: anyone may create an account. invite: an invite link is needed. closed: nobody new.
  join_mode       text not null default 'invite' check (join_mode in ('open', 'invite', 'closed')),
  -- The largest picture or file a post may carry, in megabytes. Five at most.
  max_upload_mb   integer not null default 2 check (max_upload_mb between 1 and 5),
  allow_images    boolean not null default true,
  allow_gifs      boolean not null default true,
  allow_files     boolean not null default false,
  allow_reactions boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
comment on table public.yaregroups_group is 'Yare Groups: the one group of this deployment.';

-- ---------------------------------------------------------------- members
create table if not exists public.yaregroups_members (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  display_name  text not null check (char_length(display_name) between 1 and 40),
  -- Path inside the public yare-images bucket, folder yare-groups/avatars/<user id>/.
  avatar_path   text,
  role          text not null default 'member' check (role in ('owner', 'admin', 'moderator', 'member')),
  -- A short word next to the name, and its colour, set by admins.
  flair         text check (flair is null or char_length(flair) <= 24),
  flair_color   text check (flair_color is null or flair_color ~ '^#[0-9a-f]{6}$'),
  status        text not null default 'active' check (status in ('active', 'banned')),
  muted_until   timestamptz,
  joined_at     timestamptz not null default now(),
  last_seen_at  timestamptz not null default now()
);
comment on table public.yaregroups_members is 'Yare Groups: everyone in the group, with their role.';
create unique index if not exists yaregroups_members_one_owner on public.yaregroups_members ((role)) where role = 'owner';

-- ---------------------------------------------------------------- categories and channels
create table if not exists public.yaregroups_categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 40),
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);
comment on table public.yaregroups_categories is 'Yare Groups: headings the channels sit under.';

create table if not exists public.yaregroups_channels (
  id               uuid primary key default gen_random_uuid(),
  category_id      uuid references public.yaregroups_categories (id) on delete set null,
  -- Lowercase, one word or hyphenated: general, announcements, show-and-tell.
  name             text not null unique check (name ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(name) between 1 and 40),
  topic            text not null default '' check (char_length(topic) <= 200),
  position         integer not null default 0,
  post_policy      text not null default 'everyone' check (post_policy in ('everyone', 'moderators', 'admins')),
  is_private       boolean not null default false,
  archived         boolean not null default false,
  last_message_at  timestamptz,
  created_at       timestamptz not null default now()
);
comment on table public.yaregroups_channels is 'Yare Groups: the channels, each with its posting rule.';
create index if not exists yaregroups_channels_order on public.yaregroups_channels (category_id, position);

create table if not exists public.yaregroups_channel_members (
  channel_id  uuid not null references public.yaregroups_channels (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  added_by    uuid references auth.users (id) on delete set null,
  added_at    timestamptz not null default now(),
  primary key (channel_id, user_id)
);
comment on table public.yaregroups_channel_members is 'Yare Groups: who is in a private channel.';

-- ---------------------------------------------------------------- messages and reactions
create table if not exists public.yaregroups_messages (
  id               uuid primary key default gen_random_uuid(),
  channel_id       uuid not null references public.yaregroups_channels (id) on delete cascade,
  author_id        uuid references auth.users (id) on delete set null,
  body             text not null default '' check (char_length(body) <= 4000),
  -- <channel id>/<message id>-<name> inside the private yare-groups bucket, folder channels/.
  attachment_path  text,
  attachment_name  text check (attachment_name is null or char_length(attachment_name) <= 255),
  attachment_type  text,
  attachment_size  bigint,
  edited_at        timestamptz,
  deleted_at       timestamptz,
  pinned_at        timestamptz,
  pinned_by        uuid references auth.users (id) on delete set null,
  created_at       timestamptz not null default now(),
  check (char_length(body) > 0 or attachment_path is not null)
);
comment on table public.yaregroups_messages is 'Yare Groups: the posts in the channels. Removed posts keep their row with deleted_at set.';
create index if not exists yaregroups_messages_channel_idx on public.yaregroups_messages (channel_id, created_at desc);
create index if not exists yaregroups_messages_pinned_idx on public.yaregroups_messages (channel_id, pinned_at desc) where pinned_at is not null;

create table if not exists public.yaregroups_reactions (
  message_id  uuid not null references public.yaregroups_messages (id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  emoji       text not null check (char_length(emoji) between 1 and 16),
  created_at  timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);
comment on table public.yaregroups_reactions is 'Yare Groups: one row per person, post and emoji.';

-- ---------------------------------------------------------------- invites and read markers
create table if not exists public.yaregroups_invites (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 10),
  created_by  uuid default auth.uid() references auth.users (id) on delete set null,
  role        text not null default 'member' check (role in ('member', 'moderator')),
  note        text not null default '' check (char_length(note) <= 120),
  max_uses    integer check (max_uses is null or max_uses between 1 and 10000),
  uses        integer not null default 0,
  expires_at  timestamptz,
  revoked_at  timestamptz,
  created_at  timestamptz not null default now()
);
comment on table public.yaregroups_invites is 'Yare Groups: invite links. The code is the link''s last part.';

create table if not exists public.yaregroups_reads (
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  channel_id    uuid not null references public.yaregroups_channels (id) on delete cascade,
  last_read_at  timestamptz not null default now(),
  primary key (user_id, channel_id)
);
comment on table public.yaregroups_reads is 'Yare Groups: when each person last opened each channel, for the unread marks.';

-- ---------------------------------------------------------------- who am I (security definer: policies on members would otherwise look at themselves)
create or replace function public.yaregroups_role()
returns text language sql stable security definer set search_path = '' as $$
  select m.role from public.yaregroups_members m where m.user_id = auth.uid() and m.status = 'active';
$$;
create or replace function public.yaregroups_is_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(public.yaregroups_role() in ('owner', 'admin'), false);
$$;
create or replace function public.yaregroups_is_mod()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(public.yaregroups_role() in ('owner', 'admin', 'moderator'), false);
$$;
create or replace function public.yaregroups_can_see(p_channel uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.yaregroups_role() is not null and exists (
    select 1 from public.yaregroups_channels c
     where c.id = p_channel
       and (not c.is_private or public.yaregroups_is_staff()
            or exists (select 1 from public.yaregroups_channel_members cm where cm.channel_id = c.id and cm.user_id = auth.uid())));
$$;
create or replace function public.yaregroups_can_post(p_channel uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.yaregroups_can_see(p_channel)
     and exists (select 1 from public.yaregroups_members m where m.user_id = auth.uid() and m.status = 'active' and (m.muted_until is null or m.muted_until < now()))
     and exists (select 1 from public.yaregroups_channels c where c.id = p_channel and not c.archived
                   and (c.post_policy = 'everyone'
                        or (c.post_policy = 'moderators' and public.yaregroups_is_mod())
                        or (c.post_policy = 'admins' and public.yaregroups_is_staff())));
$$;
revoke all on function public.yaregroups_role(), public.yaregroups_is_staff(), public.yaregroups_is_mod(), public.yaregroups_can_see(uuid), public.yaregroups_can_post(uuid) from public;
grant execute on function public.yaregroups_role(), public.yaregroups_is_staff(), public.yaregroups_is_mod(), public.yaregroups_can_see(uuid), public.yaregroups_can_post(uuid) to authenticated;

-- ---------------------------------------------------------------- triggers: bookkeeping and column guards
create or replace function public.yaregroups_set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists yaregroups_group_set_updated_at on public.yaregroups_group;
create trigger yaregroups_group_set_updated_at before update on public.yaregroups_group
  for each row execute function public.yaregroups_set_updated_at();

-- Members: what each role may change about a row.
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
drop trigger if exists yaregroups_members_guard on public.yaregroups_members;
create trigger yaregroups_members_guard before update on public.yaregroups_members
  for each row execute function public.yaregroups_guard_member();

-- Messages: size and kind of the attachment follow the group's settings; a post needs words or a file.
create or replace function public.yaregroups_check_message()
returns trigger language plpgsql security definer set search_path = '' as $$
declare g public.yaregroups_group%rowtype;
begin
  select * into g from public.yaregroups_group limit 1;
  if new.attachment_path is not null then
    if coalesce(new.attachment_size, 0) > g.max_upload_mb * 1048576 then
      raise exception 'That file is over the group''s limit of % MB.', g.max_upload_mb using errcode = 'P0001';
    end if;
    if new.attachment_type = 'image/gif' then
      if not g.allow_gifs then raise exception 'GIFs are off in this group.' using errcode = 'P0001'; end if;
    elsif new.attachment_type like 'image/%' then
      if not g.allow_images then raise exception 'Pictures are off in this group.' using errcode = 'P0001'; end if;
    elsif not g.allow_files then
      raise exception 'Files are off in this group.' using errcode = 'P0001';
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists yaregroups_messages_check on public.yaregroups_messages;
create trigger yaregroups_messages_check before insert on public.yaregroups_messages
  for each row execute function public.yaregroups_check_message();

create or replace function public.yaregroups_after_message()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.yaregroups_channels set last_message_at = new.created_at where id = new.channel_id;
  return new;
end; $$;
drop trigger if exists yaregroups_messages_after on public.yaregroups_messages;
create trigger yaregroups_messages_after after insert on public.yaregroups_messages
  for each row execute function public.yaregroups_after_message();

-- Messages: the author edits the words and may remove the post; moderators pin and remove.
create or replace function public.yaregroups_guard_message()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_mod boolean := public.yaregroups_is_mod(); v_author boolean := old.author_id = auth.uid();
begin
  if auth.uid() is null then return new; end if;
  if new.channel_id <> old.channel_id or new.author_id is distinct from old.author_id or new.created_at <> old.created_at
     or new.attachment_path is distinct from old.attachment_path or new.attachment_name is distinct from old.attachment_name
     or new.attachment_type is distinct from old.attachment_type or new.attachment_size is distinct from old.attachment_size then
    raise exception 'That part of a post cannot change.' using errcode = 'P0001';
  end if;
  if new.body <> old.body then
    if not v_author or old.deleted_at is not null then raise exception 'Only the author edits a post.' using errcode = 'P0001'; end if;
    new.edited_at = now();
  end if;
  if new.pinned_at is distinct from old.pinned_at or new.pinned_by is distinct from old.pinned_by then
    if not v_mod then raise exception 'Only moderators pin.' using errcode = 'P0001'; end if;
    new.pinned_by = case when new.pinned_at is null then null else auth.uid() end;
  end if;
  if new.deleted_at is distinct from old.deleted_at and not (v_mod or v_author) then
    raise exception 'Only the author or a moderator removes a post.' using errcode = 'P0001';
  end if;
  return new;
end; $$;
drop trigger if exists yaregroups_messages_guard on public.yaregroups_messages;
create trigger yaregroups_messages_guard before update on public.yaregroups_messages
  for each row execute function public.yaregroups_guard_message();

-- ---------------------------------------------------------------- row-level security
alter table public.yaregroups_group enable row level security;
alter table public.yaregroups_members enable row level security;
alter table public.yaregroups_categories enable row level security;
alter table public.yaregroups_channels enable row level security;
alter table public.yaregroups_channel_members enable row level security;
alter table public.yaregroups_messages enable row level security;
alter table public.yaregroups_reactions enable row level security;
alter table public.yaregroups_invites enable row level security;
alter table public.yaregroups_reads enable row level security;
revoke all on public.yaregroups_group, public.yaregroups_members, public.yaregroups_categories, public.yaregroups_channels, public.yaregroups_channel_members,
  public.yaregroups_messages, public.yaregroups_reactions, public.yaregroups_invites, public.yaregroups_reads from anon;
grant select, update on public.yaregroups_group to authenticated;
grant select, update, delete on public.yaregroups_members to authenticated;
grant select, insert, update, delete on public.yaregroups_categories, public.yaregroups_channels, public.yaregroups_channel_members,
  public.yaregroups_invites, public.yaregroups_reads to authenticated;
grant select, insert, update on public.yaregroups_messages to authenticated;
grant select, insert, delete on public.yaregroups_reactions to authenticated;

drop policy if exists "yaregroups_group: members read" on public.yaregroups_group;
create policy "yaregroups_group: members read" on public.yaregroups_group for select to authenticated using (public.yaregroups_role() is not null);
drop policy if exists "yaregroups_group: staff update" on public.yaregroups_group;
create policy "yaregroups_group: staff update" on public.yaregroups_group for update to authenticated using (public.yaregroups_is_staff()) with check (public.yaregroups_is_staff());

drop policy if exists "yaregroups_members: members read" on public.yaregroups_members;
create policy "yaregroups_members: members read" on public.yaregroups_members for select to authenticated using (public.yaregroups_role() is not null or user_id = (select auth.uid()));
drop policy if exists "yaregroups_members: self or staff update" on public.yaregroups_members;
create policy "yaregroups_members: self or staff update" on public.yaregroups_members for update to authenticated
  using (user_id = (select auth.uid()) or public.yaregroups_is_staff()) with check (user_id = (select auth.uid()) or public.yaregroups_is_staff());
drop policy if exists "yaregroups_members: leave or staff remove" on public.yaregroups_members;
create policy "yaregroups_members: leave or staff remove" on public.yaregroups_members for delete to authenticated
  using (role <> 'owner' and (user_id = (select auth.uid()) or (public.yaregroups_is_staff() and (role <> 'admin' or public.yaregroups_role() = 'owner'))));

drop policy if exists "yaregroups_categories: members read" on public.yaregroups_categories;
create policy "yaregroups_categories: members read" on public.yaregroups_categories for select to authenticated using (public.yaregroups_role() is not null);
drop policy if exists "yaregroups_categories: staff write" on public.yaregroups_categories;
create policy "yaregroups_categories: staff write" on public.yaregroups_categories for all to authenticated using (public.yaregroups_is_staff()) with check (public.yaregroups_is_staff());

drop policy if exists "yaregroups_channels: visible" on public.yaregroups_channels;
create policy "yaregroups_channels: visible" on public.yaregroups_channels for select to authenticated using (public.yaregroups_can_see(id));
drop policy if exists "yaregroups_channels: staff write" on public.yaregroups_channels;
create policy "yaregroups_channels: staff write" on public.yaregroups_channels for all to authenticated using (public.yaregroups_is_staff()) with check (public.yaregroups_is_staff());

drop policy if exists "yaregroups_channel_members: visible" on public.yaregroups_channel_members;
create policy "yaregroups_channel_members: visible" on public.yaregroups_channel_members for select to authenticated using (public.yaregroups_can_see(channel_id));
drop policy if exists "yaregroups_channel_members: staff write" on public.yaregroups_channel_members;
create policy "yaregroups_channel_members: staff write" on public.yaregroups_channel_members for all to authenticated using (public.yaregroups_is_staff()) with check (public.yaregroups_is_staff());

drop policy if exists "yaregroups_messages: visible" on public.yaregroups_messages;
create policy "yaregroups_messages: visible" on public.yaregroups_messages for select to authenticated using (public.yaregroups_can_see(channel_id));
drop policy if exists "yaregroups_messages: post" on public.yaregroups_messages;
create policy "yaregroups_messages: post" on public.yaregroups_messages for insert to authenticated with check (author_id = (select auth.uid()) and public.yaregroups_can_post(channel_id));
drop policy if exists "yaregroups_messages: author or moderator update" on public.yaregroups_messages;
create policy "yaregroups_messages: author or moderator update" on public.yaregroups_messages for update to authenticated
  using (public.yaregroups_can_see(channel_id) and (author_id = (select auth.uid()) or public.yaregroups_is_mod()))
  with check (public.yaregroups_can_see(channel_id) and (author_id = (select auth.uid()) or public.yaregroups_is_mod()));

drop policy if exists "yaregroups_reactions: visible" on public.yaregroups_reactions;
create policy "yaregroups_reactions: visible" on public.yaregroups_reactions for select to authenticated
  using (exists (select 1 from public.yaregroups_messages m where m.id = message_id and public.yaregroups_can_see(m.channel_id)));
drop policy if exists "yaregroups_reactions: react" on public.yaregroups_reactions;
create policy "yaregroups_reactions: react" on public.yaregroups_reactions for insert to authenticated
  with check (user_id = (select auth.uid()) and (select g.allow_reactions from public.yaregroups_group g limit 1)
              and exists (select 1 from public.yaregroups_messages m where m.id = message_id and m.deleted_at is null and public.yaregroups_can_post(m.channel_id)));
drop policy if exists "yaregroups_reactions: own or moderator delete" on public.yaregroups_reactions;
create policy "yaregroups_reactions: own or moderator delete" on public.yaregroups_reactions for delete to authenticated using (user_id = (select auth.uid()) or public.yaregroups_is_mod());

drop policy if exists "yaregroups_invites: staff all" on public.yaregroups_invites;
create policy "yaregroups_invites: staff all" on public.yaregroups_invites for all to authenticated using (public.yaregroups_is_staff()) with check (public.yaregroups_is_staff());

drop policy if exists "yaregroups_reads: own" on public.yaregroups_reads;
create policy "yaregroups_reads: own" on public.yaregroups_reads for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------- public function: what the sign-in page shows
create or replace function public.yaregroups_public()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('name', g.name, 'tagline', g.tagline, 'welcome', g.welcome, 'logo_path', g.logo_path, 'background_path', g.background_path,
                            'theme', g.theme, 'join_mode', g.join_mode, 'members', (select count(*) from public.yaregroups_members m where m.status = 'active'))
    from public.yaregroups_group g limit 1;
$$;

-- What an invite link is worth, before signing in. Never the code's row itself.
create or replace function public.yaregroups_invite_peek(p_code text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('valid', i.revoked_at is null and (i.expires_at is null or i.expires_at > now()) and (i.max_uses is null or i.uses < i.max_uses), 'role', i.role)
    from public.yaregroups_invites i where i.code = p_code;
$$;

-- ---------------------------------------------------------------- entering: operators become owner and admins, members need an invite
create or replace function public.yaregroups_display_name(p_user uuid)
returns text language sql stable security definer set search_path = '' as $$
  select coalesce(nullif(trim(u.raw_user_meta_data->>'full_name'), ''), split_part(u.email, '@', 1), 'Someone') from auth.users u where u.id = p_user;
$$;
revoke all on function public.yaregroups_display_name(uuid) from public;

create or replace function public.yaregroups_enter()
returns public.yaregroups_members
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); m public.yaregroups_members%rowtype; v_email text; v_operator boolean; v_role text; v_cat uuid;
begin
  if v_uid is null then raise exception 'Sign in first.' using errcode = 'P0001'; end if;
  select * into m from public.yaregroups_members where user_id = v_uid;
  if found then
    if m.status = 'banned' then raise exception 'You were removed from this group.' using errcode = 'YG403'; end if;
    update public.yaregroups_members set last_seen_at = now() where user_id = v_uid returning * into m;
    return m;
  end if;
  -- Accounts the join function created are members, never operators, whatever the allow list says.
  select u.email into v_email from auth.users u where u.id = v_uid;
  v_operator := coalesce((select (u.raw_app_meta_data->>'yare_groups') is distinct from 'member' from auth.users u where u.id = v_uid), true)
                and exists (select 1 from public.yare_allowed_emails a where a.email = lower(v_email));
  if not v_operator then raise exception 'You are not in this group yet. Ask for an invite link.' using errcode = 'YG404'; end if;
  if not exists (select 1 from public.yaregroups_group) then
    insert into public.yaregroups_group default values;
    insert into public.yaregroups_categories (name, position) values ('Channels', 0) returning id into v_cat;
    insert into public.yaregroups_channels (category_id, name, topic, position, post_policy) values
      (v_cat, 'welcome', 'Announcements. Only admins post here.', 0, 'admins'),
      (v_cat, 'general', 'Talk about anything.', 1, 'everyone');
  end if;
  v_role := case when exists (select 1 from public.yaregroups_members where role = 'owner') then 'admin' else 'owner' end;
  insert into public.yaregroups_members (user_id, display_name, role) values (v_uid, public.yaregroups_display_name(v_uid), v_role) returning * into m;
  return m;
end; $$;

-- A signed-in account joins with an invite code (someone who already had an account from another app, or a member who left).
create or replace function public.yaregroups_join(p_code text)
returns public.yaregroups_members
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); m public.yaregroups_members%rowtype; i public.yaregroups_invites%rowtype; g public.yaregroups_group%rowtype;
begin
  if v_uid is null then raise exception 'Sign in first.' using errcode = 'P0001'; end if;
  select * into m from public.yaregroups_members where user_id = v_uid;
  if found then
    if m.status = 'banned' then raise exception 'You were removed from this group.' using errcode = 'YG403'; end if;
    return m;
  end if;
  select * into g from public.yaregroups_group limit 1;
  if g.id is null or g.join_mode = 'closed' then raise exception 'This group is not taking new people.' using errcode = 'YG403'; end if;
  if p_code is not null and p_code <> '' then
    select * into i from public.yaregroups_invites where code = p_code for update;
    if i.id is null or i.revoked_at is not null or (i.expires_at is not null and i.expires_at <= now()) or (i.max_uses is not null and i.uses >= i.max_uses) then
      raise exception 'This invite link is not valid any more.' using errcode = 'YG410';
    end if;
    update public.yaregroups_invites set uses = uses + 1 where id = i.id;
  elsif g.join_mode <> 'open' then
    raise exception 'This group needs an invite link.' using errcode = 'YG403';
  end if;
  insert into public.yaregroups_members (user_id, display_name, role) values (v_uid, public.yaregroups_display_name(v_uid), coalesce(i.role, 'member')) returning * into m;
  return m;
end; $$;

-- The owner hands the group to another admin.
create or replace function public.yaregroups_make_owner(p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if public.yaregroups_role() <> 'owner' then raise exception 'Only the owner hands the group over.' using errcode = 'P0001'; end if;
  if not exists (select 1 from public.yaregroups_members where user_id = p_user and status = 'active') then raise exception 'That person is not in the group.' using errcode = 'P0002'; end if;
  update public.yaregroups_members set role = 'admin' where user_id = auth.uid();
  update public.yaregroups_members set role = 'owner' where user_id = p_user;
end; $$;

revoke all on function public.yaregroups_public(), public.yaregroups_invite_peek(text), public.yaregroups_enter(), public.yaregroups_join(text), public.yaregroups_make_owner(uuid) from public;
grant execute on function public.yaregroups_public(), public.yaregroups_invite_peek(text) to anon, authenticated;
grant execute on function public.yaregroups_enter(), public.yaregroups_join(text), public.yaregroups_make_owner(uuid) to authenticated;

-- ---------------------------------------------------------------- live updates
alter table public.yaregroups_messages replica identity full;
alter table public.yaregroups_reactions replica identity full;
alter table public.yaregroups_members replica identity full;
alter table public.yaregroups_channels replica identity full;
do $$
declare t text;
begin
  foreach t in array array['yaregroups_messages', 'yaregroups_reactions', 'yaregroups_members', 'yaregroups_channels', 'yaregroups_categories', 'yaregroups_group'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------- the files bucket (private; 5 MB per file at most, the group sets its own lower limit)
insert into storage.buckets (id, name, public, file_size_limit)
values ('yare-groups', 'yare-groups', false, 5242880)
on conflict (id) do nothing;

drop policy if exists "yare-groups: visible channel reads" on storage.objects;
create policy "yare-groups: visible channel reads" on storage.objects
  for select to authenticated
  using (bucket_id = 'yare-groups' and (storage.foldername(name))[1] = 'channels' and public.yaregroups_can_see(((storage.foldername(name))[2])::uuid));
drop policy if exists "yare-groups: posters write" on storage.objects;
create policy "yare-groups: posters write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'yare-groups' and (storage.foldername(name))[1] = 'channels' and public.yaregroups_can_post(((storage.foldername(name))[2])::uuid));
drop policy if exists "yare-groups: own or moderator deletes" on storage.objects;
create policy "yare-groups: own or moderator deletes" on storage.objects
  for delete to authenticated
  using (bucket_id = 'yare-groups' and (owner_id = (select auth.uid())::text or public.yaregroups_is_mod()));

-- ---------------------------------------------------------------- pictures (shared public bucket, own folder): the brand by admins, avatars by each person
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('yare-images', 'yare-images', true, 2097152, array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'])
on conflict (id) do nothing;
drop policy if exists "yare-images: public reads" on storage.objects;
create policy "yare-images: public reads" on storage.objects
  for select to anon, authenticated using (bucket_id = 'yare-images');
drop policy if exists "yare-images: yare-groups writes" on storage.objects;
create policy "yare-images: yare-groups writes" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'yare-images' and (storage.foldername(name))[1] = 'yare-groups'
              and (((storage.foldername(name))[2] = 'brand' and public.yaregroups_is_staff())
                   or ((storage.foldername(name))[2] = 'avatars' and (storage.foldername(name))[3] = (select auth.uid())::text)));
drop policy if exists "yare-images: yare-groups deletes" on storage.objects;
create policy "yare-images: yare-groups deletes" on storage.objects
  for delete to authenticated
  using (bucket_id = 'yare-images' and (storage.foldername(name))[1] = 'yare-groups'
         and (((storage.foldername(name))[2] = 'brand' and public.yaregroups_is_staff())
              or ((storage.foldername(name))[2] = 'avatars' and (storage.foldername(name))[3] = (select auth.uid())::text)));

-- ---------------------------------------------------------------- for the join function only (service role; nobody signed in may call these)
create or replace function public.yaregroups_user_id_for_email(p_email text)
returns uuid language sql stable security definer set search_path = '' as $$
  select u.id from auth.users u where lower(u.email) = lower(p_email) limit 1;
$$;
create or replace function public.yaregroups_count_invite(p_id uuid)
returns void language sql security definer set search_path = '' as $$
  update public.yaregroups_invites set uses = uses + 1 where id = p_id;
$$;
revoke all on function public.yaregroups_user_id_for_email(text), public.yaregroups_count_invite(uuid) from public, anon, authenticated;
