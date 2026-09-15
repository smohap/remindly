# Plans, Stripe billing, real features, calm redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Gate premium features behind a real Stripe upgrade path, make every visible feature functional, add recurring reminders, drop sample data, bootstrap admin, and calm the dashboard UI.

**Architecture:** Plan tier lives in `billing_subscriptions` (Postgres, written only by the Stripe webhook) and is read by `usePlan()`; every gate goes through one `UpgradeGate` → `UpgradeView` → `/api/create-checkout-session`. Reminders gain `recurrence` and a real `snoozedUntil`; an `activity` synced store feeds Inbox/History. The app shell moves from glass-on-aurora to solid `.card` surfaces with an 8-tab nav and per-tab segments.

**Tech Stack:** Vite 8, React 19, TypeScript 6, Tailwind v4, Supabase JS, Stripe Node SDK, Vercel Node functions, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-16-plans-billing-redesign-design.md`

## Global Constraints

- Local-first: every store applies mutations locally first, then syncs (`makeSyncedStore`). Demo mode (no `VITE_SUPABASE_URL`) must keep working with localStorage only.
- Hiding a button is not access control: server-side RLS is the enforcement layer; the UI only decides what to show.
- No seed data anywhere in `src/`. Empty states instead.
- Marketing pages (`Landing`, `Login`, `Legal`) keep `.glass` + aurora; only `/app` gets the new tokens.
- Prices are NZD, plan names exactly: Free, Personal Plus, Team, Growth.
- Commit after every task with a message describing the user-facing change.

---

## File map

| File | Responsibility |
|---|---|
| `src/lib/plans.ts` (new) | Plan ids, feature → min plan, `PLANS` catalogue, `planAllows`, `planForFeature` |
| `src/lib/usePlan.ts` (new) | Read/refresh current plan (Supabase or localStorage), `can()` |
| `src/lib/recurrence.ts` (new) | `nextOccurrence`, `describeRecurrence` |
| `src/lib/snooze.ts` (new) | Snooze options → ISO timestamps, `isSnoozed` |
| `src/lib/activityStore.ts` (new) | Synced activity log + `logActivity()` |
| `src/lib/usePreferences.ts` (new) | Quiet hours window (Supabase `user_preferences` / localStorage) |
| `src/lib/useDiscover.ts` (new) | Admin-published events + subscriptions that create reminders |
| `src/lib/billingClient.ts` (new) | `startCheckout(plan)`, `openBillingPortal()` |
| `src/components/UpgradeGate.tsx` (new) | The single lock screen |
| `src/views/UpgradeView.tsx` (new) | Plan chooser + checkout |
| `src/views/InboxView.tsx` (new) | Inbox · History |
| `src/views/FinanceView.tsx` (new) | Invoices · Subscriptions · Renewals (segments) |
| `src/components/SegmentBar.tsx` (new) | Shared segmented control with lock glyphs |
| `api/_lib/{env,stripe,supabaseAdmin,auth}.ts`, `api/create-checkout-session.ts`, `api/create-portal-session.ts`, `api/stripe-webhook.ts` (new) | Serverless billing |
| `supabase/migrations/0007_billing_recurrence_admin.sql` (new) | `billing_subscriptions`, `activity`, `events.recurrence`, discover columns, first-user promotion |
| `src/store.tsx` | `segment`, `openTab`, `openUpgrade`, snooze/recurrence/ack logic, activity logging |
| `src/types.ts` | `Tab`, `Segment`, `Reminder.recurrence`, `ToggleKey` |
| `src/index.css` | App tokens, `.card`, `.btn-*` |
| `src/components/{Sidebar,MobileShell,TopBar,RailCards,ReminderCard,Sheets,GreetingHero,SmartChips,DesktopLayout}.tsx` | Redesign + nav |
| `src/views/{Views,PremiumView,PlannerView,BusinessView,InvoicesView,WorkspaceView,GroupsView,CalendarView,ProfileView,AdminView}.tsx` | Gates, segments, `.card`, empty states |
| Deleted: `src/data.ts`, `src/components/{PremiumGate,CalendarSync,AuroraBackground}.tsx`, `src/lib/useCalendarSync.ts` | |

---

### Task 1: Test harness + plans module
- [x] Add `vitest` dev dep, `"test": "vitest run"` script, `vitest.config.ts` (environment `node`, include `src/**/*.test.ts`, `api/**/*.test.ts`).
- [x] `src/lib/plans.test.ts`: free cannot use `vault`; plus can use `vault` but not `group_chat`; team can `group_chat` but not `business`; growth can everything; `planForFeature('business') === 'growth'`.
- [x] Implement `src/lib/plans.ts` per spec §1 (move `PLANS` data out of `Legal.tsx`; `Pricing` imports it).
- [x] Commit: `Add plan catalogue and feature gating matrix`.

### Task 2: Recurrence + snooze modules
- [x] `src/lib/recurrence.test.ts`: weekly from 2026-09-16 → 2026-09-23; fortnightly → 09-30; monthly 01-31 → 02-28; yearly 2024-02-29 → 2025-02-28; weekdays Fri → Mon; daily; `nextOccurrence` always returns a date > `from`.
- [x] `src/lib/snooze.test.ts`: `snoozeUntil('1h', now)` = now+1h; `'evening'` = today 18:00 (tomorrow 18:00 if past); `'tomorrow'` = tomorrow 09:00; `'nextWeek'` = next Monday 09:00; `isSnoozed(iso, now)`.
- [x] Implement both. Commit: `Add recurrence and snooze date logic`.

### Task 3: nlParse recurrence
- [x] `src/lib/nlParse.test.ts`: "pay rent every month" → recurrence `monthly`; "gym every weekday at 6am" → `weekdays`, time `6:00 AM`; "team sync every second Tuesday" → `fortnightly`, first due on next Tuesday; "renew passport every year" → `yearly`; "every Monday" → `weekly` + next Monday.
- [x] Extend `parseReminder` to return `recurrence` and set `dayOffset` for weekday names. Commit: `Parse recurring cadence from natural language`.

### Task 4: Store — recurrence, real snooze, activity log, no seeds
- [x] `src/lib/activityStore.ts` with `logActivity(kind, title, detail?, reminderId?)`, `useActivity()`, `markAllRead()`, `markRead(id)`; table `activity`.
- [x] `types.ts`: `Reminder.recurrence`, drop `daily` (migrate in `remindersStore.fromRow`: `daily → 'daily'`), `snoozedUntil` ISO.
- [x] `store.tsx`: `acknowledge` rolls recurring forward via `nextOccurrence`; `snooze(id, option)` stores ISO; `unsnooze`; `tick` action clears expired snoozes; `derived.active` excludes future-snoozed; `derived.snoozed`; drop `completedBefore`; log activity on add/ack/snooze/remove/roll. `remindersStore` seed `[]`, delete `data.ts`; all other seeds `[]`; one-time `remindly.migrated.v2` cleanup.
- [x] Commit: `Make snooze and recurrence real, add activity log, remove sample data`.

### Task 5: Migration 0007
- [x] `billing_subscriptions`, `activity`, `events.recurrence`, `discover_events.{next_date,time_label,recurrence,created_by}`, RLS, `promote_first_user()` trigger, promote-by-email comment. Trim `seed.sql` to the demo user. Commit: `Add billing, activity and admin bootstrap schema`.

### Task 6: usePlan + UpgradeGate + UpgradeView + billing client
- [x] `usePlan.ts` (spec §1), `billingClient.ts` (POST with Supabase JWT, handles 503 `billing_not_configured`, demo activation), `UpgradeGate.tsx`, `UpgradeView.tsx`, `?checkout=` handling in `Dashboard.tsx` (poll refresh 12 s, banner). Replace all `usePremium`/`setPremium` call sites with `usePlan().can(...)`; delete `PremiumGate`. Commit: `Add upgrade flow with plan chooser and checkout`.

### Task 7: Serverless Stripe functions
- [x] `api/_lib/*`, three routes, `api/stripe-webhook.test.ts` (handler maps `checkout.session.completed` → upsert `{plan:'plus',status:'active'}`; `customer.subscription.deleted` → `{plan:'free',status:'canceled'}`; bad signature → 400). Deps `stripe`, `@vercel/node`. `.env.example` gains the server vars. Commit: `Add Stripe checkout, portal and webhook functions`.

### Task 8: Preferences (quiet hours) + notifications
- [x] `usePreferences.ts` (quiet window; `user_preferences` upsert / localStorage), `useNotifications` reads it, `QuietHoursCard` editable. `ToggleKey` → `'quietHours'` only; remove channel + personal alarm cards. Commit: `Make quiet hours editable and drop non-functional channel toggles`.

### Task 9: Discover from admin-published events
- [x] `useDiscover.ts` (`discover_events` read; `event_subscriptions` + reminder creation), Discover view uses it, `AdminView` gains **Discover events** tab (CRUD, super admin). Commit: `Publish Discover events from admin; subscriptions create reminders`.

### Task 10: Navigation + store segments
- [x] `types.ts` `Tab`/`Segment`; `store.tsx` `segment`, `openTab(tab, segment?)`, `openUpgrade(feature?)`; `SegmentBar.tsx`; `Sidebar`, `MobileShell` (8 tabs, locks), `TopBar` (real badge), `Views.tsx` switch: `FinanceView`, `InboxView`, Calendar+Discover, Workspace+Plans/Diary, Groups+Chat, Settings segments. Delete `PremiumView`, `CalendarSync`, `useCalendarSync`. Commit: `Reorganise navigation into 8 tabs with segments`.

### Task 11: Visual redesign
- [x] `index.css` tokens, `.card`, `.btn-primary/.btn-ghost`, `html[data-app]` background; `Dashboard` sets the attribute and drops `AuroraBackground`; `.glass`→`.card` and gradient buttons → `btn-primary` across `src/components` + `src/views`; `GreetingHero` → one-line header; `SmartChips` → segmented control; `ReminderCard` simplified with ↻ cadence; Snoozed section; empty states. Commit: `Redesign the dashboard: solid surfaces, single accent, calmer layout`.

### Task 12: Docs, build, verify, push
- [x] README: plans/billing setup, env table, migration, admin promotion SQL, Roadmap wording check. `npm test`, `npm run lint`, `npm run build`, browser walkthrough (desktop + mobile), push `main`. Commit: `Document billing setup and admin bootstrap`.
