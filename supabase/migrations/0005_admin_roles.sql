-- Remindly — make the three-tier role system real.
--
-- 0001 declared a user_role enum but nothing ever read it, so Super Admin and
-- Group Admin were labels with no power. This migration gives them teeth on the
-- server: helper predicates, admin-scoped RLS, an append-only audit log and a
-- real invite table. Hiding buttons in the UI is not access control — these
-- policies are what actually enforce it.

-- ---------------------------------------------------------------------------
-- Role predicates. SECURITY DEFINER so they can read profiles without
-- recursing through the policies that call them.
-- ---------------------------------------------------------------------------
create or replace function public.is_super_admin()
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.profiles
     where id = auth.uid() and role = 'super_admin'
  );
$$;

/** True when the caller is an admin of that specific group. */
create or replace function public.is_group_admin(gid uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.group_members
     where group_id = gid and user_id = auth.uid() and member_role = 'admin'
  ) or public.is_super_admin();
$$;

/** True when the caller administers any group at all. */
create or replace function public.is_any_group_admin()
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.group_members
     where user_id = auth.uid() and member_role = 'admin'
  ) or public.is_super_admin();
$$;

-- ---------------------------------------------------------------------------
-- Audit log — append only, per the PRD's compliance requirement.
-- ---------------------------------------------------------------------------
create table if not exists public.audit_log (
  id         uuid primary key default gen_random_uuid(),
  actor_id   uuid references public.profiles (id) on delete set null,
  actor_name text,
  action     text not null,           -- e.g. 'role.changed', 'member.removed'
  entity     text not null,           -- e.g. 'profile', 'group'
  entity_id  uuid,
  detail     jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_created_idx on public.audit_log (created_at desc);
create index if not exists audit_log_entity_idx on public.audit_log (entity, entity_id);

alter table public.audit_log enable row level security;

-- Super Admins see everything; group admins see entries for their own groups.
drop policy if exists "audit readable by admins" on public.audit_log;
create policy "audit readable by admins" on public.audit_log
  for select to authenticated
  using (
    public.is_super_admin()
    or (entity = 'group' and entity_id is not null and public.is_group_admin(entity_id))
  );

-- Anyone may append their own entries; nobody may edit or delete them, which is
-- what makes the trail trustworthy.
drop policy if exists "audit append own" on public.audit_log;
create policy "audit append own" on public.audit_log
  for insert to authenticated with check (actor_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Group invites
-- ---------------------------------------------------------------------------
create table if not exists public.group_invites (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references public.groups (id) on delete cascade,
  email       text not null,
  invited_by  uuid references public.profiles (id) on delete set null,
  member_role text not null default 'member' check (member_role in ('admin', 'member')),
  token       uuid not null default gen_random_uuid(),
  expires_at  timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz,
  created_at  timestamptz not null default now(),
  unique (group_id, email)
);

create index if not exists group_invites_email_idx on public.group_invites (lower(email));

alter table public.group_invites enable row level security;

-- Group admins manage invites for their own groups.
drop policy if exists "invites managed by group admins" on public.group_invites;
create policy "invites managed by group admins" on public.group_invites
  for all to authenticated
  using (public.is_group_admin(group_id))
  with check (public.is_group_admin(group_id));

-- An invitee can see the invite addressed to them, so they can accept it.
drop policy if exists "invites visible to invitee" on public.group_invites;
create policy "invites visible to invitee" on public.group_invites
  for select to authenticated
  using (lower(email) = lower(coalesce((select email from public.profiles where id = auth.uid()), '')));

-- ---------------------------------------------------------------------------
-- Admin reach over existing tables
-- ---------------------------------------------------------------------------

-- Super Admins may update any profile (role changes are further guarded below).
drop policy if exists "profiles admin update" on public.profiles;
create policy "profiles admin update" on public.profiles
  for update to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- Guard rail: only a Super Admin can change the `role` column, and never their
-- own — so nobody can self-promote, and the last Super Admin can't accidentally
-- demote themselves and lock everyone out.
create or replace function public.guard_role_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role then
    if not public.is_super_admin() then
      raise exception 'Only a Super Admin can change roles'
        using errcode = 'insufficient_privilege';
    end if;
    if new.id = auth.uid() then
      raise exception 'You cannot change your own role'
        using errcode = 'insufficient_privilege';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_role_guard on public.profiles;
create trigger profiles_role_guard
  before update on public.profiles
  for each row execute function public.guard_role_change();

-- Group admins manage their membership list; Super Admins manage all.
drop policy if exists "group members managed by admins" on public.group_members;
create policy "group members managed by admins" on public.group_members
  for all to authenticated
  using (public.is_group_admin(group_id))
  with check (public.is_group_admin(group_id));

-- Super Admins can see and administer every group.
drop policy if exists "groups admin all" on public.groups;
create policy "groups admin all" on public.groups
  for all to authenticated
  using (public.is_super_admin() or public.is_group_admin(id))
  with check (public.is_super_admin() or public.is_group_admin(id));
