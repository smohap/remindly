-- Remindly — persist reminders themselves.
--
-- 0001 created `events` for the platform model, but the app's reminder cards
-- carry a few display/state fields that had no home, so reminders were never
-- written to the database at all. These columns let a reminder round-trip
-- exactly as the UI holds it.
--
-- `due_date` is stored as an absolute DATE. The UI works in "days from today",
-- which must never be persisted — a reminder saved as "tomorrow" would stay
-- tomorrow forever.

alter table public.events add column if not exists meta          text;
alter table public.events add column if not exists time_label    text;          -- e.g. '5:00 PM'; null = all day
alter table public.events add column if not exists acknowledged  boolean not null default false;
alter table public.events add column if not exists snoozed_until text;
alter table public.events add column if not exists daily         boolean not null default false;
alter table public.events add column if not exists due_date      date;
alter table public.events add column if not exists resolve_label text;

-- Backfill due_date for any rows created from the original due_at timestamp.
update public.events
   set due_date = (due_at at time zone 'UTC')::date
 where due_date is null and due_at is not null;

create index if not exists events_owner_due_idx on public.events (owner_id, due_date);
