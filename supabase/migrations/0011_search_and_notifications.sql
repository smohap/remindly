-- Remindly — find people and groups, and notify about membership changes.
-- Run after 0010.
--
-- Callers: src/lib/useGroups.ts (search_profiles, search_groups,
-- request_to_join_group); the trigger writes into public.activity, which
-- src/lib/activityStore.ts reads for the Inbox.

-- ---------------------------------------------------------------------------
-- Find a person to invite (name or email, at least two characters).
-- ---------------------------------------------------------------------------
create or replace function public.search_profiles(q text)
returns table (id uuid, full_name text, email text)
language sql security definer set search_path = public stable as $$
  select p.id, p.full_name, p.email
    from public.profiles p
   where auth.uid() is not null
     and p.id <> auth.uid()
     and length(trim(q)) >= 2
     and (p.full_name ilike '%' || trim(q) || '%' or p.email ilike '%' || trim(q) || '%')
   order by p.full_name
   limit 8;
$$;

-- Find a group to ask to join. Returns the caller's current status with it.
create or replace function public.search_groups(q text)
returns table (id uuid, name text, color text, description text, member_count bigint, my_status text)
language sql security definer set search_path = public stable as $$
  select g.id, g.name, g.color, g.description,
         (select count(*) from public.group_members m where m.group_id = g.id and m.status = 'active') as member_count,
         (select m.status from public.group_members m where m.group_id = g.id and m.user_id = auth.uid()) as my_status
    from public.groups g
   where auth.uid() is not null
     and length(trim(q)) >= 2
     and g.name ilike '%' || trim(q) || '%'
   order by g.name
   limit 10;
$$;

-- Ask to join a group found by search (same rules as joining by code).
create or replace function public.request_to_join_group(p_group uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare mid uuid;
begin
  if auth.uid() is null then raise exception 'Sign in first' using errcode = 'insufficient_privilege'; end if;
  if not exists (select 1 from public.groups where id = p_group) then
    raise exception 'Group not found' using errcode = 'no_data_found';
  end if;
  insert into public.group_members (group_id, user_id, member_role, status)
    values (p_group, auth.uid(), 'member', 'requested')
    on conflict (group_id, user_id) do update
      set status = case when public.group_members.status = 'invited' then 'active' else public.group_members.status end
    returning id into mid;
  return mid;
end $$;

grant execute on function public.search_profiles(text) to authenticated;
grant execute on function public.search_groups(text) to authenticated;
grant execute on function public.request_to_join_group(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Notifications: membership events land in the activity log (the Inbox) of
-- whoever needs to act or know. Runs as definer so it can write other
-- people's activity rows.
-- ---------------------------------------------------------------------------
create or replace function public.notify_membership()
returns trigger language plpgsql security definer set search_path = public as $$
declare gname text; actor text;
begin
  select name into gname from public.groups where id = new.group_id;
  select coalesce(full_name, email, 'Someone') into actor from public.profiles where id = auth.uid();

  if tg_op = 'INSERT' and new.status = 'invited' then
    insert into public.activity (owner_id, kind, title, detail, read)
      values (new.user_id, 'group.invited', gname, actor || ' invited you to join — open Groups to accept or decline', false);
  elsif tg_op = 'INSERT' and new.status = 'requested' then
    insert into public.activity (owner_id, kind, title, detail, read)
      select m.user_id, 'group.requested', gname, actor || ' asked to join — open Groups to approve or reject', false
        from public.group_members m
       where m.group_id = new.group_id and m.member_role = 'admin' and m.status = 'active';
  elsif tg_op = 'UPDATE' and old.status <> 'active' and new.status = 'active' then
    if old.status = 'requested' then
      insert into public.activity (owner_id, kind, title, detail, read)
        values (new.user_id, 'group.approved', gname, 'Your request to join was approved', false);
    else
      insert into public.activity (owner_id, kind, title, detail, read)
        select m.user_id, 'group.approved', gname, actor || ' accepted the invitation', false
          from public.group_members m
         where m.group_id = new.group_id and m.member_role = 'admin' and m.status = 'active' and m.user_id <> new.user_id;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists notify_membership on public.group_members;
create trigger notify_membership
  after insert or update of status on public.group_members
  for each row execute function public.notify_membership();
