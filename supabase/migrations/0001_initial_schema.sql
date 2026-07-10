-- Remindly — initial database schema
-- Multi-tenant reminder platform: profiles, groups, events/reminders,
-- per-user reminder status, notification channels, preferences, discover feed.
-- Designed for Supabase (PostgreSQL). Enable RLS with owner-scoped policies.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type user_role as enum ('super_admin', 'group_admin', 'user');
exception when duplicate_object then null; end $$;

do $$ begin
  create type event_category as enum ('compliance', 'group', 'personal');
exception when duplicate_object then null; end $$;

do $$ begin
  create type reminder_state as enum ('pending', 'acknowledged', 'snoozed', 'dismissed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type notify_channel as enum ('push', 'email', 'sms', 'slack');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- profiles — one row per auth user
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default 'New User',
  role        user_role not null default 'user',
  timezone    text not null default 'Pacific/Auckland',
  location    text,
  initials    text,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- groups + membership
-- ---------------------------------------------------------------------------
create table if not exists public.groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  color       text not null default '#7C6FFF',
  description text,
  timezone    text not null default 'Pacific/Auckland',
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

create table if not exists public.group_members (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references public.groups (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  member_role text not null default 'member' check (member_role in ('admin', 'member')),
  created_at  timestamptz not null default now(),
  unique (group_id, user_id)
);

-- ---------------------------------------------------------------------------
-- events — the reminders themselves
-- ---------------------------------------------------------------------------
create table if not exists public.events (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  description     text,
  category        event_category not null default 'personal',
  group_id        uuid references public.groups (id) on delete set null,
  owner_id        uuid references public.profiles (id) on delete set null,
  due_at          timestamptz,
  all_day         boolean not null default false,
  lead_time_label text,
  tag             text,
  is_compliance   boolean not null default false,
  escalation_note text,
  icon            text default '🔔',
  created_at      timestamptz not null default now()
);

create index if not exists events_group_idx on public.events (group_id);
create index if not exists events_due_idx on public.events (due_at);

-- ---------------------------------------------------------------------------
-- reminder_status — per-user acknowledge / snooze state for an event
-- ---------------------------------------------------------------------------
create table if not exists public.reminder_status (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid not null references public.events (id) on delete cascade,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  state           reminder_state not null default 'pending',
  snoozed_until   timestamptz,
  acknowledged_at timestamptz,
  updated_at      timestamptz not null default now(),
  unique (event_id, user_id)
);

-- ---------------------------------------------------------------------------
-- notification_channels — per-user channel toggles
-- ---------------------------------------------------------------------------
create table if not exists public.notification_channels (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null references public.profiles (id) on delete cascade,
  channel  notify_channel not null,
  enabled  boolean not null default true,
  unique (user_id, channel)
);

-- ---------------------------------------------------------------------------
-- user_preferences — personal alarm + quiet hours
-- ---------------------------------------------------------------------------
create table if not exists public.user_preferences (
  user_id             uuid primary key references public.profiles (id) on delete cascade,
  personal_alarm      boolean not null default true,
  quiet_hours_enabled boolean not null default true,
  quiet_start         time not null default '22:00',
  quiet_end           time not null default '07:00',
  updated_at          timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- discover_events — public / group events available for self-subscription
-- ---------------------------------------------------------------------------
create table if not exists public.discover_events (
  id        uuid primary key default gen_random_uuid(),
  title     text not null,
  scope     text not null,
  meta      text,
  icon      text default '📅',
  category  event_category not null default 'group',
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.event_subscriptions (
  id                uuid primary key default gen_random_uuid(),
  discover_event_id uuid not null references public.discover_events (id) on delete cascade,
  user_id           uuid not null references public.profiles (id) on delete cascade,
  created_at        timestamptz not null default now(),
  unique (discover_event_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Auto-create a profile + default prefs/channels when a new auth user signs up
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, initials)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    upper(left(coalesce(new.raw_user_meta_data ->> 'full_name', new.email), 2))
  )
  on conflict (id) do nothing;

  insert into public.user_preferences (user_id) values (new.id)
  on conflict (user_id) do nothing;

  insert into public.notification_channels (user_id, channel, enabled) values
    (new.id, 'push', true),
    (new.id, 'email', true),
    (new.id, 'sms', false),
    (new.id, 'slack', true)
  on conflict (user_id, channel) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles              enable row level security;
alter table public.groups                enable row level security;
alter table public.group_members         enable row level security;
alter table public.events                enable row level security;
alter table public.reminder_status       enable row level security;
alter table public.notification_channels enable row level security;
alter table public.user_preferences      enable row level security;
alter table public.discover_events       enable row level security;
alter table public.event_subscriptions   enable row level security;

-- profiles: readable by any authenticated user; writable only by self
create policy "profiles readable" on public.profiles
  for select to authenticated using (true);
create policy "profiles self update" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles self insert" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

-- helper: is the current user a member of a given group
create or replace function public.is_group_member(gid uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.group_members
    where group_id = gid and user_id = auth.uid()
  );
$$;

-- groups + membership: visible to members
create policy "groups visible to members" on public.groups
  for select to authenticated using (public.is_group_member(id) or created_by = auth.uid());
create policy "members see their memberships" on public.group_members
  for select to authenticated using (user_id = auth.uid() or public.is_group_member(group_id));

-- events: visible to the owner or members of the event's group
create policy "events visible" on public.events
  for select to authenticated
  using (owner_id = auth.uid() or (group_id is not null and public.is_group_member(group_id)));
create policy "events owner writes" on public.events
  for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- reminder_status: strictly per-user
create policy "reminder_status self" on public.reminder_status
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- channels + prefs: strictly per-user
create policy "channels self" on public.notification_channels
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "prefs self" on public.user_preferences
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- discover feed: readable by all authenticated users
create policy "discover readable" on public.discover_events
  for select to authenticated using (true);
create policy "subscriptions self" on public.event_subscriptions
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
