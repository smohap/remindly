-- Remindly — demo user only
-- Creates a demo user (demo@remindly.app / Password123!). No sample data:
-- the app starts empty and Discover events are published from the admin console.
-- Safe to re-run: guarded with ON CONFLICT.

-- ---------------------------------------------------------------------------
-- Demo auth user. Inserting into auth.users fires handle_new_user(), which
-- creates the profile, default preferences and notification channels.
-- ---------------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated', 'authenticated',
  'demo@remindly.app',
  crypt('Password123!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Priya Nair"}',
  now(), now()
) on conflict (id) do nothing;

insert into auth.identities (
  id, user_id, provider_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
) values (
  gen_random_uuid(),
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  '{"sub":"11111111-1111-1111-1111-111111111111","email":"demo@remindly.app"}',
  'email',
  now(), now(), now()
) on conflict do nothing;

-- Flesh out the demo profile
update public.profiles set
  full_name = 'Priya Nair',
  role      = 'user',
  timezone  = 'Pacific/Auckland',
  location  = 'Auckland, NZ',
  initials  = 'PN'
where id = '11111111-1111-1111-1111-111111111111';
