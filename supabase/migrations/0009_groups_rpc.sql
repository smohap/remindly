-- Remindly — groups created from the app.
--
-- Until now the Groups tab only wrote to localStorage. These functions let a
-- signed-in user create a group and become its admin in one step (RLS alone
-- can't: you must already be an admin to insert the first membership), and
-- let group admins manage members by email.

create or replace function public.create_group(p_name text, p_color text default '#7C6FFF', p_description text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare gid uuid;
begin
  if auth.uid() is null then raise exception 'Sign in to create a group' using errcode = 'insufficient_privilege'; end if;
  insert into public.groups (name, color, description, created_by)
    values (trim(p_name), coalesce(p_color, '#7C6FFF'), nullif(trim(coalesce(p_description, '')), ''), auth.uid())
    returning id into gid;
  -- The creator is the group's admin by default.
  insert into public.group_members (group_id, user_id, member_role) values (gid, auth.uid(), 'admin');
  return gid;
end $$;

create or replace function public.add_group_member(p_group uuid, p_email text)
returns uuid language plpgsql security definer set search_path = public as $$
declare uid uuid; mid uuid;
begin
  if not public.is_group_admin(p_group) then
    raise exception 'Only a group admin can add members' using errcode = 'insufficient_privilege';
  end if;
  select id into uid from public.profiles where lower(email) = lower(trim(p_email)) limit 1;
  if uid is null then
    raise exception 'No Remindly account with that email yet' using errcode = 'no_data_found';
  end if;
  insert into public.group_members (group_id, user_id, member_role) values (p_group, uid, 'member')
    on conflict (group_id, user_id) do update set member_role = public.group_members.member_role
    returning id into mid;
  return mid;
end $$;

-- Members need to see who else is in their groups (0001 only exposed own rows).
drop policy if exists "members see co-members" on public.group_members;
create policy "members see co-members" on public.group_members
  for select to authenticated using (public.is_group_member(group_id));

-- Members may leave a group they belong to.
drop policy if exists "members may leave" on public.group_members;
create policy "members may leave" on public.group_members
  for delete to authenticated using (user_id = auth.uid());

-- Names of co-members must be readable to render the member list.
drop policy if exists "profiles visible to co-members" on public.profiles;
create policy "profiles visible to co-members" on public.profiles
  for select to authenticated using (
    id = auth.uid()
    or exists (
      select 1 from public.group_members a
      join public.group_members b on a.group_id = b.group_id
      where a.user_id = auth.uid() and b.user_id = profiles.id
    )
  );

grant execute on function public.create_group(text, text, text) to authenticated;
grant execute on function public.add_group_member(uuid, text) to authenticated;
