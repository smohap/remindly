# Remindly

The intelligent reminder platform — a multi-tenant reminder & event-notification app with three user tiers (Super Admin, Group Admin, User), smart grouping, compliance acknowledgement with escalation, a personal alarm that bypasses DND, and quiet hours.

Built with **Vite + React + TypeScript + Tailwind CSS v4 + Motion**, with **Supabase** (PostgreSQL + Auth) as the backend. Responsive: a glassmorphic three-column dashboard on desktop that becomes a native-feeling mobile app (bottom tab bar, bottom sheets, swipe gestures) on phones.

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
| `/app`     | Reminder dashboard (protected)                  |
| `/contact` | Contact us                                      |
| `/terms`   | Terms & conditions                              |
| `/privacy` | Privacy policy                                  |

## Connecting Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run the schema then the seed:
   - `supabase/migrations/0001_initial_schema.sql`
   - `supabase/seed.sql`  *(creates demo user `demo@remindly.app` / `Password123!`)*
3. Enable **Google** as an auth provider: Supabase Dashboard → Authentication → Providers → Google (add your Google OAuth client ID & secret, and set the authorised redirect to your Supabase callback URL).
4. Add the redirect URLs for your app (e.g. `http://localhost:5173/app` and your Vercel domain `/app`) under Authentication → URL Configuration.
5. Copy `.env.example` to `.env.local` and fill in:

   ```
   VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY
   ```

With these set, the login page uses real Supabase auth (email/password + Google) and the demo banner disappears.

## Database schema

See [`supabase/migrations/0001_initial_schema.sql`](supabase/migrations/0001_initial_schema.sql). Tables: `profiles`, `groups`, `group_members`, `events`, `reminder_status`, `notification_channels`, `user_preferences`, `discover_events`, `event_subscriptions`. Row-Level Security is enabled with owner/member-scoped policies, and a signup trigger auto-provisions each new user's profile, default channels, and preferences.

## Deploying to Vercel

1. Import this repository in Vercel.
2. Framework preset: **Vite** (build `npm run build`, output `dist`).
3. Add the two `VITE_SUPABASE_*` environment variables (Production + Preview).
4. Deploy. `vercel.json` rewrites all routes to `index.html` so client-side routing and deep links work.

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — type-check and build for production
- `npm run preview` — preview the production build locally
