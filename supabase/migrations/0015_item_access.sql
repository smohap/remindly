-- Neuroli — access is set per list and per note, not per membership.
-- Run after 0014.
--
-- Every list and note carries a default for the group's members
-- (`default_access`: none / read / write) and admins may override it for
-- individual members. Group admins always have full access and are the only
-- ones who create, rename and delete lists and notes. Documents are simpler:
-- any active member with a qualifying plan (checked in the app) may view and
-- upload; admins, or the person who uploaded a file, may remove it.

-- ---------------------------------------------------------------------------
-- Per-item defaults and per-member overrides
-- ---------------------------------------------------------------------------
alter table public.group_lists add column if not exists default_access text not null default 'read'
  check (default_access in ('none', 'read', 'write'));
alter table public.group_notes add column if not exists default_access text not null default 'read'
  check (default_access in ('none', 'read', 'write'));

create table if not exists public.group_list_access (
  list_id uuid not null references public.group_lists (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  access  text not null check (access in ('none', 'read', 'write')),
  primary key (list_id, user_id)
);
create table if not exists public.group_note_access (
  note_id uuid not null references public.group_notes (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  access  text not null check (access in ('none', 'read', 'write')),
  primary key (note_id, user_id)
);

-- Carry over 0014: members who had "write" on the whole group keep write on
-- every list and note that exists today.
insert into public.group_list_access (list_id, user_id, access)
select l.id, m.user_id, 'write'
  from public.group_lists l
  join public.group_members m on m.group_id = l.group_id and m.status = 'active' and m.member_role <> 'admin'
 where m.workspace_access = 'write'
on conflict do nothing;
insert into public.group_note_access (note_id, user_id, access)
select n.id, m.user_id, 'write'
  from public.group_notes n
  join public.group_members m on m.group_id = n.group_id and m.status = 'active' and m.member_role <> 'admin'
 where m.workspace_access = 'write'
on conflict do nothing;

alter table public.group_members drop column if exists workspace_access;
drop function if exists public.can_read_group_workspace(uuid);
drop function if exists public.can_edit_group_workspace(uuid);

-- ---------------------------------------------------------------------------
-- What may the caller do with one list / note?  'none' | 'read' | 'write'
-- ---------------------------------------------------------------------------
create or replace function public.list_access(lid uuid)
returns text language sql security definer set search_path = public stable as $$
  select case
    when public.is_group_admin(l.group_id) then 'write'
    when not public.is_group_member(l.group_id) then 'none'
    else coalesce((select a.access from public.group_list_access a where a.list_id = l.id and a.user_id = auth.uid()), l.default_access)
  end
  from public.group_lists l where l.id = lid;
$$;

create or replace function public.note_access(nid uuid)
returns text language sql security definer set search_path = public stable as $$
  select case
    when public.is_group_admin(n.group_id) then 'write'
    when not public.is_group_member(n.group_id) then 'none'
    else coalesce((select a.access from public.group_note_access a where a.note_id = n.id and a.user_id = auth.uid()), n.default_access)
  end
  from public.group_notes n where n.id = nid;
$$;

-- ---------------------------------------------------------------------------
-- Lists
-- ---------------------------------------------------------------------------
drop policy if exists "group lists read" on public.group_lists;
create policy "group lists read" on public.group_lists
  for select to authenticated using (public.list_access(id) in ('read', 'write'));
drop policy if exists "group lists insert" on public.group_lists;
create policy "group lists insert" on public.group_lists
  for insert to authenticated with check (public.is_group_admin(group_id));
drop policy if exists "group lists update" on public.group_lists;
create policy "group lists update" on public.group_lists
  for update to authenticated using (public.list_access(id) = 'write') with check (public.list_access(id) = 'write');
drop policy if exists "group lists delete" on public.group_lists;
create policy "group lists delete" on public.group_lists
  for delete to authenticated using (public.is_group_admin(group_id));

alter table public.group_list_access enable row level security;
drop policy if exists "list access read" on public.group_list_access;
create policy "list access read" on public.group_list_access
  for select to authenticated using (user_id = auth.uid() or exists (select 1 from public.group_lists l where l.id = list_id and public.is_group_admin(l.group_id)));
drop policy if exists "list access admin" on public.group_list_access;
create policy "list access admin" on public.group_list_access
  for all to authenticated
  using (exists (select 1 from public.group_lists l where l.id = list_id and public.is_group_admin(l.group_id)))
  with check (exists (select 1 from public.group_lists l where l.id = list_id and public.is_group_admin(l.group_id)));

-- ---------------------------------------------------------------------------
-- Notes
-- ---------------------------------------------------------------------------
drop policy if exists "group notes read" on public.group_notes;
create policy "group notes read" on public.group_notes
  for select to authenticated using (public.note_access(id) in ('read', 'write'));
drop policy if exists "group notes insert" on public.group_notes;
create policy "group notes insert" on public.group_notes
  for insert to authenticated with check (public.is_group_admin(group_id));
drop policy if exists "group notes update" on public.group_notes;
create policy "group notes update" on public.group_notes
  for update to authenticated using (public.note_access(id) = 'write') with check (public.note_access(id) = 'write');
drop policy if exists "group notes delete" on public.group_notes;
create policy "group notes delete" on public.group_notes
  for delete to authenticated using (public.is_group_admin(group_id));

alter table public.group_note_access enable row level security;
drop policy if exists "note access read" on public.group_note_access;
create policy "note access read" on public.group_note_access
  for select to authenticated using (user_id = auth.uid() or exists (select 1 from public.group_notes n where n.id = note_id and public.is_group_admin(n.group_id)));
drop policy if exists "note access admin" on public.group_note_access;
create policy "note access admin" on public.group_note_access
  for all to authenticated
  using (exists (select 1 from public.group_notes n where n.id = note_id and public.is_group_admin(n.group_id)))
  with check (exists (select 1 from public.group_notes n where n.id = note_id and public.is_group_admin(n.group_id)));

-- ---------------------------------------------------------------------------
-- Docs: members view and upload; admins or the uploader remove.
-- ---------------------------------------------------------------------------
drop policy if exists "group docs read" on public.group_docs;
create policy "group docs read" on public.group_docs
  for select to authenticated using (public.is_group_member(group_id) or public.is_group_admin(group_id));
drop policy if exists "group docs write" on public.group_docs;
drop policy if exists "group docs insert" on public.group_docs;
create policy "group docs insert" on public.group_docs
  for insert to authenticated with check ((public.is_group_member(group_id) or public.is_group_admin(group_id)) and uploaded_by = auth.uid());
drop policy if exists "group docs delete" on public.group_docs;
create policy "group docs delete" on public.group_docs
  for delete to authenticated using (public.is_group_admin(group_id) or uploaded_by = auth.uid());

drop policy if exists "group docs objects read" on storage.objects;
create policy "group docs objects read" on storage.objects
  for select to authenticated
  using (bucket_id = 'group-docs' and (public.is_group_member((storage.foldername(name))[1]::uuid) or public.is_group_admin((storage.foldername(name))[1]::uuid)));
drop policy if exists "group docs objects write" on storage.objects;
create policy "group docs objects write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'group-docs' and (public.is_group_member((storage.foldername(name))[1]::uuid) or public.is_group_admin((storage.foldername(name))[1]::uuid)));
drop policy if exists "group docs objects delete" on storage.objects;
create policy "group docs objects delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'group-docs' and (public.is_group_admin((storage.foldername(name))[1]::uuid) or owner = auth.uid()));
