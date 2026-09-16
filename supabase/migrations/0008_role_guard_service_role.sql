-- Remindly — let the SQL editor / service role manage roles.
--
-- guard_role_change() (0005) raised "Only a Super Admin can change roles" for
-- every role update, including ones run from the Supabase SQL editor, where
-- there is no signed-in user (auth.uid() is null). That made it impossible to
-- promote the first admin by hand. Server-side contexts (SQL editor, service
-- role, migrations) are trusted; the guard now only applies to app users.

create or replace function public.guard_role_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role then
    -- No JWT: SQL editor, migrations or the service role. Allowed.
    if auth.uid() is null then
      return new;
    end if;
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

-- Then promote yourself (replace the email):
--   update public.profiles set role = 'super_admin' where email = 'you@example.com';
