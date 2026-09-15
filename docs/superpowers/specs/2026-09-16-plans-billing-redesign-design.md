# Remindly — plans, Stripe billing, real features, calm redesign

Date: 2026-09-16. Baseline: `main` @ `f743e25`, deployed at https://remindly-plum.vercel.app.

## Goals

1. Free features are always usable; premium features show an **Upgrade** path that ends in a real Stripe Checkout and a persisted entitlement.
2. Every feature visible in the app does what it says. Anything that can't be real without a third-party service is removed from the app (it stays on the public Roadmap page).
3. The `/app` dashboard is redesigned to be calm: solid surfaces, one accent, fewer navigation items. Marketing pages are untouched.
4. Recurring reminders, no seeded sample data, admin bootstrap.

Out of scope: email/SMS/Slack delivery, calendar OAuth, gift marketplace, personal alarm (DND bypass), mobile push beyond web notifications.

---

## 1. Plans and entitlements

`src/lib/plans.ts`

```ts
export type PlanId = 'free' | 'plus' | 'team' | 'growth'
export const PLAN_ORDER: PlanId[] = ['free', 'plus', 'team', 'growth']
export type Feature =
  | 'vault' | 'subscriptions' | 'planner' | 'invoices' | 'diary'
  | 'unlimited_workspace' | 'list_sharing'
  | 'group_chat' | 'admin_console'
  | 'business' | 'analytics'
export const FEATURE_MIN_PLAN: Record<Feature, PlanId>   // plus / team / growth per Pricing page
export const PLANS: { id, name, priceLabel, unit, who, features: string[] }[]  // moved from Legal.tsx so /pricing and the in-app chooser share one source
export function planAllows(plan: PlanId, feature: Feature): boolean
export function planForFeature(feature: Feature): PlanId
```

`src/lib/usePlan.ts` replaces `usePremium` in `useWorkspace.ts`.

- `usePlan()` → `{ plan, can(feature), status, loading, refresh() }`.
- Source: table `billing_subscriptions` (below) via `supabase` when signed in; localStorage `remindly.plan.v1` in demo mode.
- `isPremium` is exported as `plan !== 'free'` for the transition; each call site is migrated to `can('<feature>')` and the alias is deleted at the end.
- `setPremium` and every "Unlock Premium" / "Preview Premium" toggle are removed.

Free limits (`FREE_LIMITS`) stay as they are and apply when `!can('unlimited_workspace')`.

## 2. Stripe checkout path

### UI

- `components/UpgradeGate.tsx` — the single locked-state component. Props: `feature`, `title`, `description`, optional `preview`. Shows which plan unlocks it and an **Upgrade** button. Replaces `PremiumGate` and the four hand-rolled lock screens (Planner, Business, Invoices, Workspace diary/plans).
- `views/UpgradeView.tsx` — full-screen plan chooser (tab `upgrade`, opened with `actions.openUpgrade(feature?)`). Cards for Plus / Team / Growth from `PLANS`; the plan that unlocks the requested feature is pre-selected; current plan is marked. **Continue to checkout** calls `POST /api/create-checkout-session` and redirects to the returned URL. Monthly only (no annual toggle — YAGNI).
- Return: Stripe sends the user to `/app?checkout=success` or `/app?checkout=cancelled`. On success the app polls `usePlan().refresh()` every 1.5 s for up to 12 s, then shows a confirmation banner ("You're on Personal Plus") and clears the query string. On cancel, nothing changes; a small toast says the checkout was cancelled.
- Settings → **Plan & billing** row: current plan, renewal date, **Manage billing** (→ `POST /api/create-portal-session`) when subscribed, **Upgrade** otherwise.
- Demo mode (no Supabase): checkout button activates the selected plan locally and is labelled "Activate (demo — no charge)". Supabase configured but Stripe env missing: the API returns 503 `{ error: 'billing_not_configured' }` and the UI shows "Billing isn't configured on this deployment yet."

### Serverless (`remindly-app/api/`, Vercel Node functions)

Dependencies: `stripe`, `@vercel/node` (dev). `api/_lib/` holds shared helpers (env, Stripe client, Supabase service client, JWT → user).

| Route | Method | Behaviour |
|---|---|---|
| `create-checkout-session` | POST `{ plan }` | Verify `Authorization: Bearer <supabase jwt>` with `supabase.auth.getUser`. Find/create Stripe customer (stored on `billing_subscriptions.stripe_customer_id`). Create Checkout Session (`mode: subscription`, price from `STRIPE_PRICE_<PLAN>`, `client_reference_id = user id`, `metadata.plan`), success/cancel URLs from `origin`. Return `{ url }`. |
| `create-portal-session` | POST | Same auth; returns Customer Portal `{ url }`. 404 if no customer. |
| `stripe-webhook` | POST (raw body) | Verify signature with `STRIPE_WEBHOOK_SECRET`. Handle `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted` → upsert `billing_subscriptions` (plan from price id → env lookup, status, period end). Idempotent: keyed on user id. Returns 200 on unknown events. |

Env (Vercel): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PLUS`, `STRIPE_PRICE_TEAM`, `STRIPE_PRICE_GROWTH`, `SUPABASE_URL` (or reuse `VITE_SUPABASE_URL`), `SUPABASE_SERVICE_ROLE_KEY`.

`vercel.json` already excludes `/api/` from the SPA rewrite. Body parsing is disabled for the webhook route (`export const config = { api: { bodyParser: false } }`).

### Schema (`supabase/migrations/0007_billing_recurrence_admin.sql`)

```sql
create table public.billing_subscriptions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free','plus','team','growth')),
  status text not null default 'none',            -- stripe status or 'none'
  stripe_customer_id text unique,
  stripe_subscription_id text,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);
-- RLS: owner select only; writes are service-role (webhook) only.
```

`entitlements` (0002) stays but is unused; the plan row is the entitlement.

## 3. Features made real

### 3.1 Snooze
- `Reminder.snoozedUntil` becomes an ISO timestamp. Options: **1 hour**, **This evening (6 pm)**, **Tomorrow morning (9 am)**, **Next week (Mon 9 am)**.
- `derived.active` excludes reminders whose `snoozedUntil` is in the future; a 30 s tick (reuse the notification tick) clears expired snoozes so they reappear.
- Today view gets a collapsible **Snoozed** section ("Snoozed until 6:00 PM · Unsnooze").

### 3.2 Activity log → Inbox and History
- `lib/activityStore.ts` — synced store over new table `activity` (`id, owner_id, kind, title, detail, reminder_id, read boolean, at timestamptz`). Kinds: `reminder.added | reminder.due | reminder.acknowledged | reminder.snoozed | reminder.rolled | reminder.escalated | subscription.added | plan.changed | invoice.*` (invoices already emit audit events; they are mirrored here).
- Entries are appended by the store reducer (add/ack/snooze/remove), by the notification loop when a reminder first becomes due, by Discover, and by the checkout-success handler.
- **Inbox** view: unread first, grouped Today / Earlier; "Mark all read"; tapping opens the reminder's edit sheet. Bell badge = unread count (the hardcoded `5` goes).
- **History** segment: `reminder.acknowledged | rolled | snoozed` plus overdue reminders, filter chips (All · Done · Overdue · Snoozed), text search.

### 3.3 Quiet hours
- Editable start/end (`<input type="time">`) persisted to `user_preferences.quiet_start/quiet_end/quiet_hours_enabled` (columns already exist) via a small synced preference hook; localStorage in demo mode.
- `useNotifications` reads the window from preferences instead of the fixed 22:00–07:00.

### 3.4 Discover
- Catalogue comes from `discover_events` (admin-published, see §7); empty in demo mode until an admin adds one. Schema gain: `next_date date`, `time_label text`, `recurrence text` columns so a subscription knows when to remind.
- Subscribing writes `event_subscriptions` **and** creates a real reminder (category `group`, `sourceEventId` link, recurrence copied). Unsubscribing removes the reminder. Subscription state survives refresh.

### 3.5 Removed from the app
Email / SMS / Slack channel toggles, Personal alarm toggle and card, `CalendarSync` component and `useCalendarSync`, Gift Concierge mock, the "Business" segment inside Premium, `PremiumGate`. `ToggleKey` shrinks to `quietHours`. The Roadmap page already lists these; wording is checked so nothing claims they exist.

## 4. Redesign

### Tokens (`index.css`)
```
--bg: #0f1119   --surface: #171a26   --surface-2: #1e2233   --border: rgba(255,255,255,0.08)
--accent: #7c6fff   --accent-ink: #ffffff   --ink: #f3f4f8   --ink-dim: rgba(243,244,248,0.66)   --ink-faint: rgba(243,244,248,0.42)
--ok: #34d399   --warn: #fbbf24   --danger: #f87171
```
- New `.card` (solid `--surface`, 1px `--border`, 16px radius, no blur, no inner highlight). Every `/app` component switches `.glass` → `.card`. `.glass` and the aurora body background remain for Landing / Login / Legal; `Dashboard` sets `data-app` on `<html>` which swaps the body background to `--bg`.
- Buttons: `btn-primary` (solid accent), `btn-ghost` (border only), `btn-danger-ghost`. The cyan→violet gradient is retired inside the app.
- Typography: Sora only for the page title; everything else Inter. Chips lose uppercase tracking except status badges.

### Navigation
Sidebar (desktop) and More sheet (mobile) — 8 items + Admin:

| Tab | Segments | Free? |
|---|---|---|
| Today | — | ✓ |
| Calendar | Calendar · Discover | ✓ |
| Workspace | Lists · Notes · Bookmarks · Diary 🔒 · Plans 🔒 | ✓ (limits) |
| Groups | Members · Chat 🔒 | ✓ |
| Finance | Invoices 🔒 · Subscriptions 🔒 · Renewals 🔒 | gate |
| Business | Certifications · Contracts · Filings | gate (Growth) |
| Inbox | Inbox · History | ✓ |
| Settings | Profile · Plan & billing · Notifications · Quiet hours | ✓ |
| Admin | People · Groups · Discover events · Audit log | role-gated |

Locked segments render a lock glyph and open `UpgradeGate` when selected. `Tab` type becomes `today | calendar | workspace | groups | finance | business | inbox | settings | admin | upgrade`; segment is a second field in store state (`state.segment`), so deep links like `openTab('workspace','plans')` work. Mobile bottom bar: Today · Calendar · Workspace · Inbox · More.

### Today
Header row: "Good morning, Priya · Wednesday 16 September" left, "4 of 7 done" progress ring right (one line, no hero card). Filter as a segmented control (Today 3 · Tomorrow 2 · Week 5 · Overdue 1). Sections: Overdue (if any) → Today → Snoozed (collapsed). Right rail (xl only): This week strip, Quiet hours. Reminder card: icon, title, one meta line, ↻ cadence glyph if recurring, actions Snooze / Done (ghost / primary); compliance keeps its red left border and "Ack required" badge.

## 5. Recurring reminders

- `Reminder.recurrence?: 'daily' | 'weekdays' | 'weekly' | 'fortnightly' | 'monthly' | 'yearly'` (undefined = once). `daily` boolean is migrated to `recurrence: 'daily'`. Column `events.recurrence text`.
- `lib/recurrence.ts`: `nextOccurrence(dateISO, recurrence, from = today)` (monthly clamps to month end; weekdays skips Sat/Sun), `describe(recurrence)`.
- Acknowledge on a recurring reminder: log `reminder.acknowledged`, then set `dayOffset` to the next occurrence, `acknowledged: false`, clear snooze; log `reminder.rolled`. Delete removes the series (single series row, no exceptions — YAGNI).
- Edit/add sheet gains a **Repeat** select. `nlParse` maps: "every day/daily", "every weekday", "every week/weekly/every Monday", "every fortnight/2 weeks/second Tuesday", "every month/monthly", "every year/yearly/annually". A weekday name also sets the first due date to the next such weekday.
- Notification loop treats recurring like today's `daily` (nudges from the start of its due day when all-day).

## 6. Sample data

All in-code seeds become `[]`: reminders, groups, invoices, vault, subscriptions, lists, notes, bookmarks, chat, discover events, calendar sync (deleted). `data.ts` is deleted; `seed.sql` keeps only the demo user and its profile. Every list view has an empty state with a single primary action ("Add your first reminder"). The `completedBefore: 4` fake progress offset goes; progress is computed from today's reminders only.

Existing local browsers still holding old seed data: on first load after deploy a one-time migration (`remindly.migrated.v2` flag) drops any item whose id matches the old seed id pattern (`r1…r7`, `g1…`, `v1…`, `s1…`, `l1…`, `n1…`, `b1…`, `inv-…` seeds) so users don't keep ghosts.

## 7. Admin

- Console exists (`AdminView`: People · Groups · Audit log). Adds **Discover events** tab: list/create/edit/delete `discover_events` (title, scope, icon, next date, time, recurrence, public). RLS: insert/update/delete require `is_super_admin()`; select remains public.
- Bootstrap: trigger `promote_first_user()` on `profiles` insert — if no `super_admin` exists, the new profile gets `role = 'super_admin'`. Documented in README with the promote-by-email SQL.
- Demo mode keeps the `super_admin` fallback (unchanged) so the console is explorable locally.

## 8. Testing

- Add `vitest`; tests are on pure modules: `plans.test.ts` (gating matrix), `recurrence.test.ts` (next occurrence incl. month-end, weekdays, fortnight), `snooze.test.ts` (option → timestamp, expiry), `nlParse.test.ts` (recurrence phrases), `activity.test.ts` (reducer appends), `api/stripe-webhook.test.ts` (event → upsert with mocked Stripe/Supabase).
- Manual: local demo-mode walkthrough in the browser pane for every tab, mobile viewport, `npm run build` clean, then commit + push.

## 9. Delivery checklist for you (after push)

1. Supabase SQL editor: run `0007_billing_recurrence_admin.sql`.
2. Stripe (test mode): create 3 recurring Prices; copy their ids.
3. Vercel env: the seven variables in §2; redeploy.
4. Stripe → Developers → Webhooks: endpoint `https://remindly-plum.vercel.app/api/stripe-webhook`, events `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`; copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
5. Sign in on the live site; if you are not Super Admin (you signed up before the trigger), run the promote SQL from the README.
