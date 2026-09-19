-- Neuroli — per-member workspace access, managed by group admins.
-- Run after 0013.
--
-- Replaces the single group-wide "members can edit" switch with an access
-- level on each membership:
--   none   the member sees no lists or notes at all
--   read   the member can read lists and notes (default for new members)
--   write  the member can tick / add list items, write notes, upload docs
-- Group admins always have full access. Creating, renaming and deleting
-- lists, and deleting notes, stay with admins. Whether a member may open
-- Docs at all is a plan question (Personal Plus, Team, Growth) that the
-- app enforces; Postgres does not know Stripe.

alter table public.group_members
  add column if not exists workspace_access text not null default 'read'
  check (workspace_access in ('none', 'read', 'write'));

-- Carry over the old switch: groups that had "members can edit" on keep it.
update public.group_members m
   set workspace_access = 'write'
  from public.groups g
 where g.id = m.group_id and coalesce(g.members_can_edit, false) and m.workspace_access = 'read';

alter table public.groups drop column if exists members_can_edit;

-- ---------------------------------------------------------------------------
create or replace function public.can_read_group_workspace(gid uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select public.is_group_admin(gid)
      or exists (
        select 1 from public.group_members
         where group_id = gid and user_id = auth.uid() and status = 'active' and workspace_access in ('read', 'write')
      );
$$;

create or replace function public.can_edit_group_workspace(gid uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select public.is_group_admin(gid)
      or exists (
        select 1 from public.group_members
         where group_id = gid and user_id = auth.uid() and status = 'active' and workspace_access = 'write'
      );
$$;

-- ---------------------------------------------------------------------------
-- Lists: read needs access; item edits need write; create and delete are
-- admin only (rename is an update, so the app keeps that to admins).
-- ---------------------------------------------------------------------------
drop policy if exists "group lists read" on public.group_lists;
create policy "group lists read" on public.group_lists
  for select to authenticated using (public.can_read_group_workspace(group_id));
drop policy if exists "group lists write" on public.group_lists;
drop policy if exists "group lists insert" on public.group_lists;
create policy "group lists insert" on public.group_lists
  for insert to authenticated with check (public.is_group_admin(group_id));
drop policy if exists "group lists update" on public.group_lists;
create policy "group lists update" on public.group_lists
  for update to authenticated using (public.can_edit_group_workspace(group_id)) with check (public.can_edit_group_workspace(group_id));
drop policy if exists "group lists delete" on public.group_lists;
create policy "group lists delete" on public.group_lists
  for delete to authenticated using (public.is_group_admin(group_id));

-- Notes: read needs access; create and edit need write; delete is admin only.
drop policy if exists "group notes read" on public.group_notes;
create policy "group notes read" on public.group_notes
  for select to authenticated using (public.can_read_group_workspace(group_id));
drop policy if exists "group notes write" on public.group_notes;
drop policy if exists "group notes insert" on public.group_notes;
create policy "group notes insert" on public.group_notes
  for insert to authenticated with check (public.can_edit_group_workspace(group_id));
drop policy if exists "group notes update" on public.group_notes;
create policy "group notes update" on public.group_notes
  for update to authenticated using (public.can_edit_group_workspace(group_id)) with check (public.can_edit_group_workspace(group_id));
drop policy if exists "group notes delete" on public.group_notes;
create policy "group notes delete" on public.group_notes
  for delete to authenticated using (public.is_group_admin(group_id));

-- Docs: read needs access; upload and remove need write.
drop policy if exists "group docs read" on public.group_docs;
create policy "group docs read" on public.group_docs
  for select to authenticated using (public.can_read_group_workspace(group_id));
drop policy if exists "group docs write" on public.group_docs;
create policy "group docs write" on public.group_docs
  for all to authenticated using (public.can_edit_group_workspace(group_id)) with check (public.can_edit_group_workspace(group_id));

drop policy if exists "group docs objects read" on storage.objects;
create policy "group docs objects read" on storage.objects
  for select to authenticated
  using (bucket_id = 'group-docs' and public.can_read_group_workspace((storage.foldername(name))[1]::uuid));
