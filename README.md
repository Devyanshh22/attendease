# AttendEase

College attendance calculator built with Next.js 14 (App Router), Tailwind CSS, Supabase, and TypeScript. Deployed on Vercel.

---

## Setup

### 1. Clone and install

```bash
cd attendease
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New project.
2. After creation, go to **Settings → API** and copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3. Run the database migration

In the Supabase dashboard, go to **SQL Editor** and paste the contents of [`supabase/migration.sql`](supabase/migration.sql), then click **Run**.

This creates all six tables with RLS policies.

### 4. Configure environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and fill in your Supabase URL and anon key.

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You will be redirected to `/login`.

---

## Deploy to Vercel

1. Push the repo to GitHub.
2. Import it in [vercel.com/new](https://vercel.com/new).
3. Add the two environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) in the Vercel project settings.
4. Deploy.

In your Supabase project, go to **Authentication → URL Configuration** and add your Vercel deployment URL to the **Site URL** and **Redirect URLs** fields (e.g. `https://your-app.vercel.app`).

---

## Project structure

```
attendease/
├── app/
│   ├── page.tsx                    # Root redirect (-> /login or /dashboard/today)
│   ├── login/page.tsx              # Sign-in page
│   ├── register/page.tsx           # Registration page
│   ├── auth/callback/route.ts      # OAuth / email-confirm callback
│   └── dashboard/
│       ├── layout.tsx              # Sidebar + auth guard
│       ├── LogoutButton.tsx
│       ├── today/
│       │   ├── page.tsx            # Today's schedule + attendance marking
│       │   └── TodaySlotCard.tsx   # Interactive attendance card (client)
│       ├── subjects/page.tsx
│       ├── timetable/page.tsx
│       ├── history/page.tsx
│       └── semesters/page.tsx
├── lib/
│   ├── supabase.ts                 # Browser + server Supabase client helpers
│   ├── types.ts                    # TypeScript types for all tables
│   └── database.types.ts           # Generated-style DB types
├── middleware.ts                   # Route protection for /dashboard
└── supabase/
    └── migration.sql               # Full schema + RLS policies
```

---

## Database schema

| Table | Purpose |
|---|---|
| `semesters` | Academic semesters with start/end dates |
| `subjects` | Subjects per semester with attendance targets |
| `timetable_slots` | Weekly recurring class schedule |
| `special_days` | Holidays, no-college days, extra working days |
| `extra_lectures` | One-off extra classes outside the timetable |
| `attendance_records` | Per-slot attendance — attended / missed / cancelled |

All tables have RLS enabled — users can only access their own rows.
