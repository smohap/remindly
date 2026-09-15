# Remindly

The intelligent reminder platform — a multi-tenant reminder & event-notification app with three user tiers (Super Admin, Group Admin, User), recurring reminders, smart grouping, compliance acknowledgement with escalation, quiet hours, and paid plans (Personal Plus, Team, Growth) billed through Stripe.

Built with **Vite + React + TypeScript + Tailwind CSS v4 + Motion**, with **Supabase** (PostgreSQL + Auth) as the backend and **Stripe** (via Vercel functions in `api/`) for billing. Responsive: a three-column dashboard on desktop that becomes a native-feeling mobile app (bottom tab bar, bottom sheets, swipe gestures) on phones.

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
```

The app runs out of the box in **demo mode** (simulated auth, no backend). To enable real authentication and data, connect Supabase (below).

## Routes

| Path       | Page                                            |
|------------|-------------------------------------------------|
| `/`        | Marketing landing page                          |
| `/login`   | Sign in / sign up (email + password, or Google) |
| `/app`     | Dashboard (protected): Today · Calendar · Workspace · Groups · Finance · Business · Inbox · Settings · Admin |
| `/pricing` | Plans                                           |
| `/contact` | Contact us                                      |
| `/terms`   | Terms & conditions                              |
| `/privacy` | Privacy policy                                  |

## Connecting Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run the schema then the seed:
   - `supabase/migrations/0001_initial_schema.sql`
   - `supabase/migrations/0002_premium_features.sql` … `0006_business_compliance.sql`
   - `supabase/migrations/0007_billing_recurrence_admin.sql`  *(billing, activity log, recurring reminders, admin bootstrap)*
   - `supabase/seed.sql`  *(optional — creates demo user `demo@remindly.app` / `Password123!`; no sample data)*
3. Enable **Google** as an auth provider: Supabase Dashboard → Authentication → Providers → Google (add your Google OAuth client ID & secret, and set the authorised redirect to your Supabase callback URL).
4. Add the redirect URLs for your app (e.g. `http://localhost:5173/app` and your Vercel domain `/app`) under Authentication → URL Configuration.
5. Copy `.env.example` to `.env.local` and fill in:

   ```
   VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY
   ```

With these set, the login page uses real Supabase auth (email/password + Google) and the demo banner disappears.

## Who is admin?

Roles live in `profiles.role` (`user`, `group_admin`, `super_admin`) and are enforced by RLS — the UI only decides what to show. After migration 0007, **the first account to sign up becomes Super Admin** automatically. To promote any existing account, run in the SQL editor:

```sql
update public.profiles set role = 'super_admin' where email = 'you@example.com';
```

Super Admins see the **Admin** tab: people and roles, groups, the **Discover events** catalogue (public events anyone can subscribe to), compliance policy, analytics and the audit log. In local demo mode (no Supabase) everyone is treated as Super Admin so the console is explorable.

## Plans and billing (Stripe)

Feature gating is defined once in `src/lib/plans.ts` and read by every gate. The user's plan comes from `billing_subscriptions`, a row written only by the Stripe webhook. Locked features show an **Upgrade** button → plan chooser → Stripe Checkout → back to `/app?checkout=success`.

1. In Stripe (test mode) create three recurring monthly Prices: Personal Plus, Team, Growth. Copy their `price_…` ids.
2. Add these environment variables to the Vercel project (Production + Preview) — they are server-side only, never `VITE_`-prefixed:

   | Variable | Value |
   |---|---|
   | `STRIPE_SECRET_KEY` | Stripe secret key |
   | `STRIPE_WEBHOOK_SECRET` | Signing secret of the webhook endpoint (step 4) |
   | `STRIPE_PRICE_PLUS` / `STRIPE_PRICE_TEAM` / `STRIPE_PRICE_GROWTH` | The three Price ids |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role (lets the webhook write `billing_subscriptions`) |
   | `SUPABASE_URL` | Optional; falls back to `VITE_SUPABASE_URL` |

3. Redeploy.
4. Stripe → Developers → Webhooks → add endpoint `https://<your-domain>/api/stripe-webhook` with events `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`. Paste its signing secret into `STRIPE_WEBHOOK_SECRET` and redeploy once more.

Until the keys are present, the checkout button reports "Billing isn't configured on this deployment yet". In local demo mode (no Supabase) the chooser activates the plan on-device so the whole flow can be exercised without a card.

## Database schema

See `supabase/migrations/`. Core tables: `profiles`, `groups`, `group_members`, `events` (reminders, with `recurrence`), `user_preferences` (quiet hours), `discover_events`, `event_subscriptions`, `activity` (Inbox/History), `billing_subscriptions` (plan), plus the premium and business tables from 0002–0006. Row-Level Security is enabled with owner/member-scoped policies, and a signup trigger auto-provisions each new user's profile and preferences.

## Deploying to Vercel

1. Import this repository in Vercel.
2. Framework preset: **Vite** (build `npm run build`, output `dist`).
3. Add the two `VITE_SUPABASE_*` environment variables (Production + Preview), plus the Stripe variables above when you're ready to bill.
4. Deploy. `vercel.json` rewrites all routes to `index.html` so client-side routing and deep links work.

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — type-check and build for production
- `npm test` — unit tests (plan gating, recurrence, snooze, parsing, Stripe webhook)
- `npm run preview` — preview the production build locally
