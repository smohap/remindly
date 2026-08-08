-- Remindly — premium feature tables
-- Adds server-side persistence for everything built after the initial schema:
-- invoices (+ audit events), lists, notes, bookmarks, diary, creative writing,
-- group chat, calendar connections, renewal vault, tracked subscriptions and
-- premium entitlements. Safe to run whole in the Supabase SQL editor.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Profile extensions
-- `email` is needed so users can be looked up when addressing an invoice.
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists email      text;
alter table public.profiles add column if not exists bio        text;
alter table public.profiles add column if not exists phone      text;
alter table public.profiles add column if not exists job_title  text;
alter table public.profiles add column if not exists company    text;
alter table public.profiles add column if not exists website    text;
alter table public.profiles add column if not exists birthday   date;
alter table public.profiles add column if not exists language   text default 'English (NZ)';
alter table public.profiles add column if not exists week_start text default 'monday'
  check (week_start in ('monday', 'sunday'));

create unique index if not exists profiles_email_key on public.profiles (lower(email));

-- Backfill emails for existing users, then keep them in sync on signup.
update public.profiles p
   set email = u.email
  from auth.users u
 where u.id = p.id and p.email is null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, initials, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    upper(left(coalesce(new.raw_user_meta_data ->> 'full_name', new.email), 2)),
    new.email
  )
  on conflict (id) do update set email = excluded.email;

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

-- ---------------------------------------------------------------------------
-- Entitlements (premium access)
-- ---------------------------------------------------------------------------
do $$ begin
  create type entitlement_source as enum ('subscription', 'trial', 'admin_grant');
exception when duplicate_object then null; end $$;

create table if not exists public.entitlements (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  feature_key text not null,
  source      entitlement_source not null default 'subscription',
  expires_at  timestamptz,
  created_at  timestamptz not null default now(),
  unique (user_id, feature_key)
);

-- ---------------------------------------------------------------------------
-- Invoices + audit trail
-- ---------------------------------------------------------------------------
do $$ begin
  create type invoice_status as enum ('draft', 'sent', 'paid', 'rejected', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type invoice_action as enum ('created', 'sent', 'viewed', 'paid', 'rejected', 'cancelled', 'commented');
exception when duplicate_object then null; end $$;

create table if not exists public.invoices (
  id                 uuid primary key default gen_random_uuid(),
  number             text not null,
  sender_id          uuid not null references public.profiles (id) on delete cascade,
  recipient_id       uuid not null references public.profiles (id) on delete cascade,
  amount_cents       bigint not null check (amount_cents > 0),
  currency           text not null default 'NZD',
  description        text not null,
  line_items         jsonb not null default '[]'::jsonb,
  due_date           date not null,
  status             invoice_status not null default 'sent',
  created_at         timestamptz not null default now(),
  sent_at            timestamptz,
  resolved_at        timestamptz,
  resolution_comment text,
  constraint invoice_no_self check (sender_id <> recipient_id),
  -- A rejected invoice must carry a reason (spec 5.4)
  constraint invoice_reject_needs_reason
    check (status <> 'rejected' or coalesce(btrim(resolution_comment), '') <> '')
);

create index if not exists invoices_sender_idx on public.invoices (sender_id);
create index if not exists invoices_recipient_idx on public.invoices (recipient_id);
create index if not exists invoices_status_idx on public.invoices (status, due_date);

create table if not exists public.invoice_events (
  id         uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  actor_id   uuid references public.profiles (id) on delete set null,
  action     invoice_action not null,
  comment    text check (comment is null or length(comment) <= 1000),
  created_at timestamptz not null default now()
);

create index if not exists invoice_events_invoice_idx on public.invoice_events (invoice_id, created_at);

-- ---------------------------------------------------------------------------
-- Workspace: lists, notes, bookmarks, diary, creative writing
-- ---------------------------------------------------------------------------
create table if not exists public.lists (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references public.profiles (id) on delete cascade,
  name       text not null,
  color      text not null default '#7C6FFF',
  shared     boolean not null default false,
  group_id   uuid references public.groups (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.list_items (
  id         uuid primary key default gen_random_uuid(),
  list_id    uuid not null references public.lists (id) on delete cascade,
  text       text not null,
  done       boolean not null default false,
  position   int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists list_items_list_idx on public.list_items (list_id, position);

create table if not exists public.notes (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references public.profiles (id) on delete cascade,
  title      text not null default 'Untitled note',
  body       text not null default '',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.note_shares (
  id                uuid primary key default gen_random_uuid(),
  note_id           uuid not null references public.notes (id) on delete cascade,
  shared_with_email text not null,
  created_at        timestamptz not null default now(),
  unique (note_id, shared_with_email)
);

create table if not exists public.bookmarks (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references public.profiles (id) on delete cascade,
  title      text not null,
  url        text not null,
  tag        text not null default 'General',
  created_at timestamptz not null default now()
);

create table if not exists public.diary_entries (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references public.profiles (id) on delete cascade,
  entry_date date not null default current_date,
  mood       text,
  body       text not null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists diary_owner_date_idx on public.diary_entries (owner_id, entry_date desc);

do $$ begin
  create type creative_type as enum ('story', 'poem', 'other');
exception when duplicate_object then null; end $$;

create table if not exists public.creative_pieces (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references public.profiles (id) on delete cascade,
  title      text not null default 'Untitled',
  piece_type creative_type not null default 'story',
  body       text not null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Group chat
-- ---------------------------------------------------------------------------
create table if not exists public.group_messages (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.groups (id) on delete cascade,
  author_id  uuid not null references public.profiles (id) on delete cascade,
  body       text not null check (length(body) <= 4000),
  created_at timestamptz not null default now()
);

create index if not exists group_messages_group_idx on public.group_messages (group_id, created_at);

-- ---------------------------------------------------------------------------
-- Calendar connections
-- ---------------------------------------------------------------------------
do $$ begin
  create type calendar_provider as enum ('google', 'outlook', 'apple');
exception when duplicate_object then null; end $$;

do $$ begin
  create type sync_direction as enum ('two_way', 'import', 'export');
exception when duplicate_object then null; end $$;

create table if not exists public.calendar_connections (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles (id) on delete cascade,
  provider       calendar_provider not null,
  account_email  text,
  direction      sync_direction not null default 'two_way',
  connected      boolean not null default false,
  last_synced_at timestamptz,
  -- OAuth tokens are never exposed to the browser; server-side functions only.
  access_token   text,
  refresh_token  text,
  created_at     timestamptz not null default now(),
  unique (user_id, provider)
);

-- ---------------------------------------------------------------------------
-- Renewal vault + tracked subscriptions
-- ---------------------------------------------------------------------------
do $$ begin
  create type renewal_type as enum ('passport', 'drivers_licence', 'vehicle_rego_wof', 'insurance_policy', 'warranty', 'other');
exception when duplicate_object then null; end $$;

create table if not exists public.renewal_items (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references public.profiles (id) on delete cascade,
  item_type      renewal_type not null default 'other',
  label          text not null,
  expiry_date    date not null,
  lead_time_days int not null default 30,
  document_url   text,
  created_at     timestamptz not null default now()
);

do $$ begin
  create type billing_cycle as enum ('weekly', 'monthly', 'yearly');
exception when duplicate_object then null; end $$;

create table if not exists public.tracked_subscriptions (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null references public.profiles (id) on delete cascade,
  merchant_name    text not null,
  amount_cents     bigint not null check (amount_cents >= 0),
  currency         text not null default 'NZD',
  cycle            billing_cycle not null default 'monthly',
  next_charge_date date not null,
  lead_time_days   int not null default 3,
  status           text not null default 'active' check (status in ('active', 'cancelled', 'watching')),
  created_at       timestamptz not null default now()
);

-- ===========================================================================
-- Row Level Security
-- ===========================================================================
alter table public.entitlements          enable row level security;
alter table public.invoices              enable row level security;
alter table public.invoice_events        enable row level security;
alter table public.lists                 enable row level security;
alter table public.list_items            enable row level security;
alter table public.notes                 enable row level security;
alter table public.note_shares           enable row level security;
alter table public.bookmarks             enable row level security;
alter table public.diary_entries         enable row level security;
alter table public.creative_pieces       enable row level security;
alter table public.group_messages        enable row level security;
alter table public.calendar_connections  enable row level security;
alter table public.renewal_items         enable row level security;
alter table public.tracked_subscriptions enable row level security;

-- Entitlements: readable by the owner; only the service role may grant them.
drop policy if exists "entitlements self read" on public.entitlements;
create policy "entitlements self read" on public.entitlements
  for select to authenticated using (user_id = auth.uid());

-- --- Invoices -------------------------------------------------------------
-- Visible to both parties only (spec section 6).
drop policy if exists "invoices visible to parties" on public.invoices;
create policy "invoices visible to parties" on public.invoices
  for select to authenticated
  using (sender_id = auth.uid() or recipient_id = auth.uid());

-- Only the sender creates, and only as themselves.
drop policy if exists "invoices sender creates" on public.invoices;
create policy "invoices sender creates" on public.invoices
  for insert to authenticated with check (sender_id = auth.uid());

-- Either party may update; the trigger below decides which transitions are
-- legal and who may perform them.
drop policy if exists "invoices parties update" on public.invoices;
create policy "invoices parties update" on public.invoices
  for update to authenticated
  using (sender_id = auth.uid() or recipient_id = auth.uid())
  with check (sender_id = auth.uid() or recipient_id = auth.uid());

-- Enforce the lifecycle and role permissions (spec sections 3 and 6).
create or replace function public.enforce_invoice_transition()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.status = old.status then
    return new;
  end if;

  -- Terminal states never change again (handles the pay/reject race).
  if old.status in ('paid', 'rejected', 'cancelled') then
    raise exception 'This invoice was already %', old.status
      using errcode = 'check_violation';
  end if;

  if new.status in ('paid', 'rejected') and auth.uid() <> old.recipient_id then
    raise exception 'Only the recipient can settle or reject this invoice'
      using errcode = 'insufficient_privilege';
  end if;

  if new.status = 'cancelled' and auth.uid() <> old.sender_id then
    raise exception 'Only the sender can cancel this invoice'
      using errcode = 'insufficient_privilege';
  end if;

  new.resolved_at := now();
  return new;
end;
$$;

drop trigger if exists invoice_transition_guard on public.invoices;
create trigger invoice_transition_guard
  before update on public.invoices
  for each row execute function public.enforce_invoice_transition();

-- Audit events: readable by either party, append-only, actor must be the caller.
drop policy if exists "invoice events visible to parties" on public.invoice_events;
create policy "invoice events visible to parties" on public.invoice_events
  for select to authenticated
  using (exists (
    select 1 from public.invoices i
     where i.id = invoice_id and (i.sender_id = auth.uid() or i.recipient_id = auth.uid())
  ));

drop policy if exists "invoice events append" on public.invoice_events;
create policy "invoice events append" on public.invoice_events
  for insert to authenticated
  with check (
    actor_id = auth.uid()
    and exists (
      select 1 from public.invoices i
       where i.id = invoice_id and (i.sender_id = auth.uid() or i.recipient_id = auth.uid())
    )
  );

-- --- Owner-scoped workspace tables ---------------------------------------
drop policy if exists "notes owner" on public.notes;
create policy "notes owner" on public.notes
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "bookmarks owner" on public.bookmarks;
create policy "bookmarks owner" on public.bookmarks
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "diary owner" on public.diary_entries;
create policy "diary owner" on public.diary_entries
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "creative owner" on public.creative_pieces;
create policy "creative owner" on public.creative_pieces
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "vault owner" on public.renewal_items;
create policy "vault owner" on public.renewal_items
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "subscriptions owner" on public.tracked_subscriptions;
create policy "subscriptions owner" on public.tracked_subscriptions
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "calendar connections owner" on public.calendar_connections;
create policy "calendar connections owner" on public.calendar_connections
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "note shares owner" on public.note_shares;
create policy "note shares owner" on public.note_shares
  for all to authenticated
  using (exists (select 1 from public.notes n where n.id = note_id and n.owner_id = auth.uid()))
  with check (exists (select 1 from public.notes n where n.id = note_id and n.owner_id = auth.uid()));

-- Lists: owner always; shared lists are visible to members of the linked group.
drop policy if exists "lists owner or shared group" on public.lists;
create policy "lists owner or shared group" on public.lists
  for select to authenticated
  using (owner_id = auth.uid() or (shared and group_id is not null and public.is_group_member(group_id)));

drop policy if exists "lists owner writes" on public.lists;
create policy "lists owner writes" on public.lists
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "list items follow list" on public.list_items;
create policy "list items follow list" on public.list_items
  for all to authenticated
  using (exists (
    select 1 from public.lists l
     where l.id = list_id
       and (l.owner_id = auth.uid() or (l.shared and l.group_id is not null and public.is_group_member(l.group_id)))
  ))
  with check (exists (select 1 from public.lists l where l.id = list_id and l.owner_id = auth.uid()));

-- Group chat: members of the group only; you may only post as yourself.
drop policy if exists "group messages members read" on public.group_messages;
create policy "group messages members read" on public.group_messages
  for select to authenticated using (public.is_group_member(group_id));

drop policy if exists "group messages members post" on public.group_messages;
create policy "group messages members post" on public.group_messages
  for insert to authenticated
  with check (author_id = auth.uid() and public.is_group_member(group_id));

drop policy if exists "group messages author deletes" on public.group_messages;
create policy "group messages author deletes" on public.group_messages
  for delete to authenticated using (author_id = auth.uid());
