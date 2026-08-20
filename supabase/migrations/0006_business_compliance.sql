-- Remindly — compliance, delegated authority and the business track.
--
-- Covers slices 2, 3 and 5:
--   2. Compliance mode + escalation chain (group_policies, escalations)
--   3. Group Admin authority over reminders (reminder_assignments, approval_state)
--   5. Business track: certifications, contracts, finance filing deadlines
-- Slice 4 (analytics) is derived from these tables and needs no schema of its own.

-- ---------------------------------------------------------------------------
-- 2. Escalation policy, set per group by its admin
-- ---------------------------------------------------------------------------
create table if not exists public.group_policies (
  group_id             uuid primary key references public.groups (id) on delete cascade,
  compliance_enabled   boolean not null default false,
  escalate_after_hours int not null default 2 check (escalate_after_hours between 1 and 168),
  -- Second hop: still unresolved escalations reach a Super Admin after this long
  second_hop_hours     int not null default 24 check (second_hop_hours between 1 and 336),
  default_lead_minutes int not null default 60,
  members_may_create   boolean not null default true,
  updated_at           timestamptz not null default now()
);

do $$ begin
  create type escalation_stage as enum ('group_admin', 'super_admin', 'resolved');
exception when duplicate_object then null; end $$;

create table if not exists public.escalations (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events (id) on delete cascade,
  group_id    uuid references public.groups (id) on delete set null,
  subject_id  uuid references public.profiles (id) on delete set null, -- who failed to acknowledge
  stage       escalation_stage not null default 'group_admin',
  raised_at   timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id) on delete set null,
  note        text
);

create index if not exists escalations_group_idx on public.escalations (group_id, stage);
create index if not exists escalations_event_idx on public.escalations (event_id);

-- ---------------------------------------------------------------------------
-- 3. Group Admins assigning reminders to members
-- ---------------------------------------------------------------------------
create table if not exists public.reminder_assignments (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid not null references public.events (id) on delete cascade,
  assignee_id     uuid not null references public.profiles (id) on delete cascade,
  assigned_by     uuid references public.profiles (id) on delete set null,
  lead_minutes    int not null default 60,
  acknowledged_at timestamptz,
  created_at      timestamptz not null default now(),
  unique (event_id, assignee_id)
);

create index if not exists assignments_assignee_idx on public.reminder_assignments (assignee_id);

-- Approval queue for member-created reminders when a group requires review
alter table public.events add column if not exists approval_state text
  not null default 'approved' check (approval_state in ('pending', 'approved', 'blocked'));
alter table public.events add column if not exists reviewed_by uuid references public.profiles (id) on delete set null;

-- ---------------------------------------------------------------------------
-- 5. Business track
-- ---------------------------------------------------------------------------
create table if not exists public.staff_certifications (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid references public.groups (id) on delete cascade,
  user_id      uuid references public.profiles (id) on delete cascade,
  owner_id     uuid not null references public.profiles (id) on delete cascade, -- who maintains the record
  staff_name   text not null,
  cert_type    text not null,          -- forklift, first aid, food safety…
  issued_date  date,
  expiry_date  date not null,
  document_url text,
  created_at   timestamptz not null default now()
);

create index if not exists certs_expiry_idx on public.staff_certifications (owner_id, expiry_date);

create table if not exists public.contracts (
  id                 uuid primary key default gen_random_uuid(),
  owner_id           uuid not null references public.profiles (id) on delete cascade,
  group_id           uuid references public.groups (id) on delete set null,
  counterparty_name  text not null,
  contract_type      text,
  start_date         date,
  end_date           date not null,
  notice_period_days int not null default 30,
  auto_renew         boolean not null default false,
  document_url       text,
  created_at         timestamptz not null default now()
);

create index if not exists contracts_end_idx on public.contracts (owner_id, end_date);

do $$ begin
  create type filing_type as enum ('invoice_due', 'gst_filing', 'paye_filing', 'custom');
exception when duplicate_object then null; end $$;

create table if not exists public.finance_deadlines (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null references public.profiles (id) on delete cascade,
  group_id          uuid references public.groups (id) on delete set null,
  deadline_type     filing_type not null default 'custom',
  label             text not null,
  amount_cents      bigint,
  currency          text not null default 'NZD',
  due_date          date not null,
  -- NZ IRD defaults: GST every 2 months, PAYE monthly, 0 = one-off
  recurrence_months int not null default 0 check (recurrence_months between 0 and 12),
  created_at        timestamptz not null default now()
);

create index if not exists finance_due_idx on public.finance_deadlines (owner_id, due_date);

-- ===========================================================================
-- Row Level Security
-- ===========================================================================
alter table public.group_policies       enable row level security;
alter table public.escalations          enable row level security;
alter table public.reminder_assignments enable row level security;
alter table public.staff_certifications enable row level security;
alter table public.contracts            enable row level security;
alter table public.finance_deadlines    enable row level security;

-- Policies: members read, admins write.
drop policy if exists "policies readable by members" on public.group_policies;
create policy "policies readable by members" on public.group_policies
  for select to authenticated using (public.is_group_member(group_id) or public.is_group_admin(group_id));

drop policy if exists "policies written by admins" on public.group_policies;
create policy "policies written by admins" on public.group_policies
  for all to authenticated using (public.is_group_admin(group_id)) with check (public.is_group_admin(group_id));

-- Escalations: visible to the person escalated about, and to admins of the group.
drop policy if exists "escalations visible" on public.escalations;
create policy "escalations visible" on public.escalations
  for select to authenticated
  using (subject_id = auth.uid() or (group_id is not null and public.is_group_admin(group_id)) or public.is_super_admin());

drop policy if exists "escalations managed by admins" on public.escalations;
create policy "escalations managed by admins" on public.escalations
  for all to authenticated
  using ((group_id is not null and public.is_group_admin(group_id)) or public.is_super_admin())
  with check ((group_id is not null and public.is_group_admin(group_id)) or public.is_super_admin());

-- Assignments: the assignee sees and acknowledges their own; admins manage all.
drop policy if exists "assignments visible" on public.reminder_assignments;
create policy "assignments visible" on public.reminder_assignments
  for select to authenticated using (assignee_id = auth.uid() or assigned_by = auth.uid() or public.is_any_group_admin());

drop policy if exists "assignments acked by assignee" on public.reminder_assignments;
create policy "assignments acked by assignee" on public.reminder_assignments
  for update to authenticated using (assignee_id = auth.uid()) with check (assignee_id = auth.uid());

drop policy if exists "assignments managed by admins" on public.reminder_assignments;
create policy "assignments managed by admins" on public.reminder_assignments
  for all to authenticated using (public.is_any_group_admin()) with check (public.is_any_group_admin());

-- Business records: owner-scoped, with group admins able to see their group's.
drop policy if exists "certs owner or group admin" on public.staff_certifications;
create policy "certs owner or group admin" on public.staff_certifications
  for all to authenticated
  using (owner_id = auth.uid() or user_id = auth.uid() or (group_id is not null and public.is_group_admin(group_id)))
  with check (owner_id = auth.uid() or (group_id is not null and public.is_group_admin(group_id)));

drop policy if exists "contracts owner or group admin" on public.contracts;
create policy "contracts owner or group admin" on public.contracts
  for all to authenticated
  using (owner_id = auth.uid() or (group_id is not null and public.is_group_admin(group_id)))
  with check (owner_id = auth.uid() or (group_id is not null and public.is_group_admin(group_id)));

drop policy if exists "finance owner or group admin" on public.finance_deadlines;
create policy "finance owner or group admin" on public.finance_deadlines
  for all to authenticated
  using (owner_id = auth.uid() or (group_id is not null and public.is_group_admin(group_id)))
  with check (owner_id = auth.uid() or (group_id is not null and public.is_group_admin(group_id)));
