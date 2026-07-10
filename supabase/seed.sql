-- Remindly — dummy data
-- Creates a demo user (demo@remindly.app / Password123!) and seeds the same
-- groups, reminders, channels and discover feed the app UI shows.
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

-- Ensure channel toggles match the app (SMS off, the rest on)
update public.notification_channels set enabled = false
  where user_id = '11111111-1111-1111-1111-111111111111' and channel = 'sms';

-- ---------------------------------------------------------------------------
-- Groups + membership
-- ---------------------------------------------------------------------------
insert into public.groups (id, name, color, description, created_by) values
  ('22222222-0000-0000-0000-000000000001', 'Acme · Site A crew', '#FF6B6B', 'Compliance and safety coordination for Site A', '11111111-1111-1111-1111-111111111111'),
  ('22222222-0000-0000-0000-000000000002', 'Wellington Rugby',   '#2DD4BF', 'Training schedule and match-day reminders',   '11111111-1111-1111-1111-111111111111'),
  ('22222222-0000-0000-0000-000000000003', 'Personal',           '#7C6FFF', 'Priya''s personal reminders',                 '11111111-1111-1111-1111-111111111111')
on conflict (id) do nothing;

insert into public.group_members (group_id, user_id, member_role) values
  ('22222222-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'member'),
  ('22222222-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'member'),
  ('22222222-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'admin')
on conflict (group_id, user_id) do nothing;

-- ---------------------------------------------------------------------------
-- Events / reminders (times are relative to now so they stay "current")
-- ---------------------------------------------------------------------------
insert into public.events
  (id, title, description, category, group_id, owner_id, due_at, all_day, lead_time_label, tag, is_compliance, escalation_note, icon)
values
  ('33333333-0000-0000-0000-000000000001', 'Submit weekly safety checklist', 'Complete and submit the Site A weekly safety checklist.', 'compliance',
     '22222222-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
     (now()::date + time '17:00'), false, 'Due 5:00 PM', 'Compliance · Ack required', true,
     'Escalates to Group Admin in 2h if unacknowledged', '📋'),
  ('33333333-0000-0000-0000-000000000002', 'Rugby practice — bring boots', 'Weekly training session.', 'group',
     '22222222-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
     (now()::date + time '18:30'), false, 'Lead time 1 hour', null, false, null, '🏉'),
  ('33333333-0000-0000-0000-000000000003', 'Mum''s birthday — call her', 'Give Mum a call for her birthday.', 'personal',
     '22222222-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111',
     now()::date, true, 'Personal alarm on', null, false, null, '🎂'),
  ('33333333-0000-0000-0000-000000000004', 'Client contract renewal — sign by 5pm', 'Sign the renewal before end of day.', 'compliance',
     '22222222-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
     ((now()::date - 1) + time '17:00'), false, 'Was due yesterday, 5:00 PM', 'Escalated to Super Admin', true,
     'Escalated to Super Admin', '⚠️'),
  ('33333333-0000-0000-0000-000000000005', 'Team stand-up', 'Daily Site A crew stand-up.', 'group',
     '22222222-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
     ((now()::date + 1) + time '09:00'), false, 'Lead time 15 min', null, false, null, '👥'),
  ('33333333-0000-0000-0000-000000000006', 'Physio appointment', 'Follow-up physio for knee.', 'personal',
     '22222222-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111',
     ((now()::date + 1) + time '14:30'), false, 'Lead time 1 hour', null, false, null, '🩺'),
  ('33333333-0000-0000-0000-000000000007', 'Match day vs North Shore', 'Home game — arrive 1 hour early.', 'group',
     '22222222-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
     ((now()::date + 3) + time '15:00'), false, 'Lead time 2 hours', null, false, null, '🏉')
on conflict (id) do nothing;

-- Per-user reminder state (today's + overdue are pending; two earlier ones acknowledged)
insert into public.reminder_status (event_id, user_id, state, acknowledged_at) values
  ('33333333-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'pending', null),
  ('33333333-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'pending', null),
  ('33333333-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'pending', null),
  ('33333333-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'pending', null),
  ('33333333-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'acknowledged', now()),
  ('33333333-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'acknowledged', now())
on conflict (event_id, user_id) do nothing;

-- ---------------------------------------------------------------------------
-- Discover feed (subscribable events)
-- ---------------------------------------------------------------------------
insert into public.discover_events (id, title, scope, meta, icon, category) values
  ('44444444-0000-0000-0000-000000000001', 'All-hands quarterly briefing', 'Platform', 'Every quarter · next 30 Sep, 10:00 AM', '📣', 'group'),
  ('44444444-0000-0000-0000-000000000002', 'Fire drill & evacuation', 'Acme · Site A crew', 'Monthly · first Tuesday, 11:00 AM', '🧯', 'compliance'),
  ('44444444-0000-0000-0000-000000000003', 'Rugby club AGM', 'Wellington Rugby', 'Annual · 12 Aug, 6:30 PM', '🏉', 'group'),
  ('44444444-0000-0000-0000-000000000004', 'Payroll cut-off reminder', 'Platform', 'Fortnightly · every second Wednesday', '💰', 'group'),
  ('44444444-0000-0000-0000-000000000005', 'First-aid certification renewal', 'Acme · Site A crew', 'Yearly · expires 5 Nov', '🩹', 'compliance'),
  ('44444444-0000-0000-0000-000000000006', 'Community beach clean-up', 'Personal', 'One-off · 20 Jul, 9:00 AM', '🏖️', 'personal')
on conflict (id) do nothing;
