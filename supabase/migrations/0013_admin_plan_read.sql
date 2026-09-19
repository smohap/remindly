-- Neuroli — Super Admins can see everyone's plan in the admin console.
-- Run after 0012. Writing a plan still goes through /api/admin-set-plan
-- (service role); no client may write billing_subscriptions.

drop policy if exists "billing admin read" on public.billing_subscriptions;
create policy "billing admin read" on public.billing_subscriptions
  for select to authenticated using (public.is_super_admin());
