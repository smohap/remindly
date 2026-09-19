-- Neuroli — group workspace: shared lists, notes and documents per group.
-- Run after 0011.
--
-- Group admins always have full access. Active members may read; they may
-- write only when the group's `members_can_edit` switch is on. Which members
-- may *see* the workspace at all is a plan question (Personal Plus, Team,
-- Growth) and is enforced in the app, since Postgres doesn't know Stripe.

alter table public.groups add column if not exists members_can_edit boolean not null default false;

-- ---------------------------------------------------------------------------
create table if not exists public.group_lists (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.groups (id) on delete cascade,
  name       text not null,
  items      jsonb not null default '[]'::jsonb,   -- [{ id, text, done }]
  created_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);
create index if not exists group_lists_group_idx on public.group_lists (group_id);

create table if not exists public.group_notes (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.groups (id) on delete cascade,
  title      text not null,
  body       text not null default '',
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);
create index if not exists group_notes_group_idx on public.group_notes (group_id);

create table if not exists public.group_docs (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references public.groups (id) on delete cascade,
  name        text not null,
  path        text not null,                      -- object path in the group-docs bucket: <group_id>/<uuid>-<name>
  size        bigint not null default 0,
  mime        text,
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists group_docs_group_idx on public.group_docs (group_id);

-- ---------------------------------------------------------------------------
-- Who may write: the group's admins, or any active member when the admin
-- has switched on "members can edit".
-- ---------------------------------------------------------------------------
create or replace function public.can_edit_group_workspace(gid uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select public.is_group_admin(gid)
      or (public.is_group_member(gid) and coalesce((select members_can_edit from public.groups where id = gid), false));
$$;

alter table public.group_lists enable row level security;
alter table public.group_notes enable row level security;
alter table public.group_docs  enable row level security;

drop policy if exists "group lists read" on public.group_lists;
create policy "group lists read" on public.group_lists
  for select to authenticated using (public.is_group_member(group_id) or public.is_group_admin(group_id));
drop policy if exists "group lists write" on public.group_lists;
create policy "group lists write" on public.group_lists
  for all to authenticated using (public.can_edit_group_workspace(group_id)) with check (public.can_edit_group_workspace(group_id));

drop policy if exists "group notes read" on public.group_notes;
create policy "group notes read" on public.group_notes
  for select to authenticated using (public.is_group_member(group_id) or public.is_group_admin(group_id));
drop policy if exists "group notes write" on public.group_notes;
create policy "group notes write" on public.group_notes
  for all to authenticated using (public.can_edit_group_workspace(group_id)) with check (public.can_edit_group_workspace(group_id));

drop policy if exists "group docs read" on public.group_docs;
create policy "group docs read" on public.group_docs
  for select to authenticated using (public.is_group_member(group_id) or public.is_group_admin(group_id));
drop policy if exists "group docs write" on public.group_docs;
create policy "group docs write" on public.group_docs
  for all to authenticated using (public.can_edit_group_workspace(group_id)) with check (public.can_edit_group_workspace(group_id));

-- ---------------------------------------------------------------------------
-- Files live in a private bucket; the object path starts with the group id.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
  values ('group-docs', 'group-docs', false, 20971520)
  on conflict (id) do nothing;

drop policy if exists "group docs objects read" on storage.objects;
create policy "group docs objects read" on storage.objects
  for select to authenticated
  using (bucket_id = 'group-docs' and public.is_group_member((storage.foldername(name))[1]::uuid));

drop policy if exists "group docs objects write" on storage.objects;
create policy "group docs objects write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'group-docs' and public.can_edit_group_workspace((storage.foldername(name))[1]::uuid));

drop policy if exists "group docs objects delete" on storage.objects;
create policy "group docs objects delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'group-docs' and public.can_edit_group_workspace((storage.foldername(name))[1]::uuid));
