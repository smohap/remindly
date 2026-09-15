-- Remindly — billing, activity log, recurring reminders, admin bootstrap.
-- Run whole in the Supabase SQL editor after 0001–0006.

-- ---------------------------------------------------------------------------
-- Billing: one row per user, written ONLY by the Stripe webhook (service role).
-- The app reads it to decide which plan the user is on.
-- ---------------------------------------------------------------------------
create table if not exists public.billing_subscriptions (
  user_id                uuid primary key references public.profiles (id) on delete cascade,
  plan                   text not null default 'free' check (plan in ('free', 'plus', 'team', 'growth')),
  status                 text not null default 'none',   -- Stripe subscription status, or 'none'
  stripe_customer_id     text unique,
  stripe_subscription_id text,
  current_period_end     timestamptz,
  updated_at             timestamptz not null default now()
);

alter table public.billing_subscriptions enable row level security;

drop policy if exists "billing self read" on public.billing_subscriptions;
create policy "billing self read" on public.billing_subscriptions
  for select to authenticated using (user_id = auth.uid());
-- No insert/update/delete policies: only the service role (webhook) writes.

-- ---------------------------------------------------------------------------
-- Activity log behind the Inbox and History views (owner-scoped).
-- ---------------------------------------------------------------------------
create table if not exists public.activity (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles (id) on delete cascade,
  kind        text not null,
  title       text not null,
  detail      text,
  reminder_id uuid,
  read        boolean not null default false,
  at          timestamptz not null default now()
);
create index if not exists activity_owner_at on public.activity (owner_id, at desc);

alter table public.activity enable row level security;
drop policy if exists "activity self" on public.activity;
create policy "activity self" on public.activity
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Recurring reminders + Discover-sourced reminders
-- ---------------------------------------------------------------------------
alter table public.events add column if not exists recurrence      text
  check (recurrence is null or recurrence in ('daily', 'weekdays', 'weekly', 'fortnightly', 'monthly', 'yearly'));
alter table public.events add column if not exists source_event_id uuid references public.discover_events (id) on delete set null;

-- Rows saved before this column existed used the boolean.
update public.events set recurrence = 'daily' where recurrence is null and daily = true;

-- ---------------------------------------------------------------------------
-- Discover events are published by Super Admins from the admin console and
-- carry enough scheduling detail to become a real reminder when subscribed.
-- ---------------------------------------------------------------------------
alter table public.discover_events add column if not exists next_date  date;
alter table public.discover_events add column if not exists time_label text;
alter table public.discover_events add column if not exists recurrence text
  check (recurrence is null or recurrence in ('daily', 'weekdays', 'weekly', 'fortnightly', 'monthly', 'yearly'));
alter table public.discover_events add column if not exists created_by uuid references public.profiles (id) on delete set null;

drop policy if exists "discover admin write" on public.discover_events;
create policy "discover admin write" on public.discover_events
  for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

-- ---------------------------------------------------------------------------
-- Admin bootstrap: the first account to sign up becomes Super Admin. Later
-- accounts are plain users until a Super Admin promotes them.
--
-- To promote an existing account by hand:
--   update public.profiles set role = 'super_admin' where email = 'you@example.com';
-- ---------------------------------------------------------------------------
create or replace function public.promote_first_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.profiles where role = 'super_admin') then
    new.role := 'super_admin';
  end if;
  return new;
end $$;

drop trigger if exists promote_first_user on public.profiles;
create trigger promote_first_user
  before insert on public.profiles
  for each row execute function public.promote_first_user();

-- ---------------------------------------------------------------------------
-- Remove sample rows that earlier builds pushed into real accounts.
-- ---------------------------------------------------------------------------
delete from public.events where title in (
  'Submit weekly safety checklist', 'Rugby practice — bring boots', 'Mum''s birthday — call her',
  'Client contract renewal — sign by 5pm', 'Toolbox talk — Site A briefing', 'Pay car registration',
  'Acme all-hands — quarterly briefing'
);
delete from public.discover_events where title in (
  'GST return due dates (NZ)', 'School term 3 key dates', 'Wellington City Marathon — training plan',
  'Wellington Rugby — season fixtures'
);
delete from public.renewal_items where label in ('NZ Passport', 'Toyota Corolla — WOF', 'Contents insurance');
delete from public.tracked_subscriptions where merchant_name in ('Netflix', 'iCloud+ 200GB', 'Les Mills gym');
delete from public.lists where name = 'Groceries';
delete from public.notes where title = 'Site A induction notes';
delete from public.bookmarks where title in ('IRD — GST filing dates', 'NZTA — rego renewal');
delete from public.invoices where number in ('INV-1001', 'INV-1002', 'INV-1003', 'INV-1004');
