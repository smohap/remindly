-- Remindly — membership needs consent on both sides.
--
-- * Adding someone by email creates an INVITATION they accept or decline.
-- * Joining a group yourself (by its invite code) creates a REQUEST a group
--   admin approves or rejects.
-- Only `active` rows count as membership: the predicates below, the member
-- lists and chat all ignore pending rows.

alter table public.group_members add column if not exists status text not null default 'active'
  check (status in ('active', 'invited', 'requested'));
alter table public.group_members add column if not exists invited_by uuid references public.profiles (id) on delete set null;

-- Short code admins share so people can ask to join.
alter table public.groups add column if not exists join_code text unique;
update public.groups set join_code = upper(substr(md5(id::text || now()::text), 1, 8)) where join_code is null;
alter table public.groups alter column join_code set default upper(substr(md5(gen_random_uuid()::text), 1, 8));

-- ---------------------------------------------------------------------------
-- Predicates now only honour active membership.
-- ---------------------------------------------------------------------------
create or replace function public.is_group_admin(gid uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.group_members
     where group_id = gid and user_id = auth.uid() and member_role = 'admin' and status = 'active'
  ) or public.is_super_admin();
$$;

create or replace function public.is_any_group_admin()
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.group_members
     where user_id = auth.uid() and member_role = 'admin' and status = 'active'
  ) or public.is_super_admin();
$$;

create or replace function public.is_group_member(gid uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.group_members
     where group_id = gid and user_id = auth.uid() and status = 'active'
  );
$$;

-- Invited / requesting users must be able to see the group's name.
drop policy if exists "groups visible to pending" on public.groups;
create policy "groups visible to pending" on public.groups
  for select to authenticated using (
    exists (select 1 from public.group_members where group_id = groups.id and user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- add_group_member now invites (status 'invited') instead of adding outright.
-- ---------------------------------------------------------------------------
create or replace function public.add_group_member(p_group uuid, p_email text)
returns uuid language plpgsql security definer set search_path = public as $$
declare uid uuid; mid uuid;
begin
  if not public.is_group_admin(p_group) then
    raise exception 'Only a group admin can invite members' using errcode = 'insufficient_privilege';
  end if;
  select id into uid from public.profiles where lower(email) = lower(trim(p_email)) limit 1;
  if uid is null then
    raise exception 'No Remindly account with that email yet' using errcode = 'no_data_found';
  end if;
  insert into public.group_members (group_id, user_id, member_role, status, invited_by)
    values (p_group, uid, 'member', 'invited', auth.uid())
    on conflict (group_id, user_id) do update
      -- A pending request from that person is simply approved by the invite.
      set status = case when public.group_members.status = 'requested' then 'active' else public.group_members.status end
    returning id into mid;
  return mid;
end $$;

-- Ask to join a group by its code. Pending until an admin approves.
create or replace function public.request_to_join(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare gid uuid; mid uuid;
begin
  if auth.uid() is null then raise exception 'Sign in first' using errcode = 'insufficient_privilege'; end if;
  select id into gid from public.groups where upper(join_code) = upper(trim(p_code));
  if gid is null then raise exception 'No group has that code' using errcode = 'no_data_found'; end if;
  insert into public.group_members (group_id, user_id, member_role, status)
    values (gid, auth.uid(), 'member', 'requested')
    on conflict (group_id, user_id) do update
      -- If they were already invited, asking to join completes the handshake.
      set status = case when public.group_members.status = 'invited' then 'active' else public.group_members.status end
    returning id into mid;
  return mid;
end $$;

-- Accept/decline your own invitation, or approve/reject a request as admin.
create or replace function public.respond_membership(p_membership uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = public as $$
declare m public.group_members%rowtype;
begin
  select * into m from public.group_members where id = p_membership;
  if m.id is null then raise exception 'Membership not found' using errcode = 'no_data_found'; end if;
  if m.status = 'invited' and m.user_id = auth.uid() then
    null; -- invitee answering
  elsif m.status = 'requested' and public.is_group_admin(m.group_id) then
    null; -- admin answering
  else
    raise exception 'Not yours to answer' using errcode = 'insufficient_privilege';
  end if;
  if p_accept then
    update public.group_members set status = 'active' where id = p_membership;
  else
    delete from public.group_members where id = p_membership;
  end if;
end $$;

grant execute on function public.request_to_join(text) to authenticated;
grant execute on function public.respond_membership(uuid, boolean) to authenticated;
