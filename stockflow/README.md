# StockFlow Inventory Suite

A Next.js + Supabase rebuild of the original StockFlow prototype. Two workspaces —
Coffee Shop and Bus Fleet — sharing one inventory engine, backed by a real Postgres
database with authentication, row-level security, and live updates.

## Stack

- **Next.js 15** (App Router, TypeScript)
- **Supabase** — Postgres database, Auth, and Realtime
- **Tailwind CSS** for styling
- **Vercel** as the recommended host

## What's included

- Email/password login (single shared admin/staff account — see [Auth model](#auth-model))
- Dashboard with live low-stock/critical KPIs and recent activity
- Inventory CRUD with search and location filters
- Physical counts with opening/closing variance calculation, which reconciles
  on-hand quantity automatically
- Full audit history, written automatically by every action in the app
- CSV/XLSX import (bulk update or add items) and CSV export
- Bus Fleet-only tools: spare parts/asset tracking, preventive maintenance
  scheduling, fuel & mileage logging with efficiency flags

## 1. Create your Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project (the free
   tier is enough to start).
2. In the Supabase dashboard, open **SQL Editor** → **New query**.
3. Paste the contents of `supabase/schema.sql` and run it. This creates every
   table, index, and the row-level security policies.
4. Optionally, run `supabase/seed.sql` the same way to load sample data so the
   app isn't empty on first login.
5. Go to **Authentication → Users → Add user** and create the one account
   you'll sign in with (email + password). Since this app uses a single shared
   login, you don't need to create more than one.
6. Go to **Settings → API** and copy your **Project URL** and **anon public
   key** — you'll need both next.

## 2. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in the two values from step 1.6:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

## 3. Run it locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with the user
you created in step 1.5.

## 4. Deploy

**Vercel (recommended):**

1. Push this project to a GitHub repo.
2. In [vercel.com](https://vercel.com), click **New Project** and import the repo.
3. Add the same two environment variables from `.env.local` in the Vercel
   project settings (**Settings → Environment Variables**).
4. Deploy. Vercel builds and hosts the Next.js app automatically on every push.

Any other Node-compatible host (Netlify, Render, your own server) works too —
the app is a standard Next.js build (`npm run build && npm run start`).

## Auth model

You told us you want one shared admin/staff login rather than separate team
roles, so the app is wired accordingly:

- Every table's row-level security policy simply checks that the request is
  **authenticated** — any signed-in user has full read/write access.
- There's no roles table or permission tiers to manage.
- To add real multi-user support later (e.g. separate owner/staff logins with
  different permissions), you'd add a `profiles` table with a `role` column
  and tighten the RLS policies in `supabase/schema.sql` to check that role.

## Project structure

```
app/
  login/              Sign-in page
  (app)/              Authenticated routes (guarded by middleware.ts)
    dashboard/
    inventory/
    counts/
    history/
    imports/
    parts/            Bus Fleet only
    maintenance/      Bus Fleet only
    fuel/             Bus Fleet only
  auth/signout/       Sign-out route handler
components/           Sidebar, topbar, dialogs, UI primitives
lib/
  supabase/           Browser, server, and middleware Supabase clients
  types.ts            Shared TypeScript types matching the DB schema
  utils.ts            Formatting, CSV, and stock-status helpers
supabase/
  schema.sql          Tables, indexes, triggers, RLS policies
  seed.sql            Optional sample data
```

## Notes

- Workspace selection (Coffee Shop / Bus Fleet) is stored in the browser
  (`localStorage`) per device, not in the database — it's a UI preference, not
  business data.
- Stock status (Healthy / Low Stock / Critical) is always derived from
  `quantity` vs. `reorder_point` rather than stored, so it can never drift out
  of sync with the numbers.
- CSV/XLSX import matches rows to existing items by name + location within the
  current workspace; anything that doesn't match is added as a new item.
