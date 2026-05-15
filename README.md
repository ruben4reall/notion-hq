# Manager Dashboard

A full-stack internal dashboard for daily team management. Built with Next.js 15 App Router, Supabase PostgreSQL, and deployed on Vercel.

**Live URL:** https://manager-thenextbigthing.vercel.app

---

## Features

| Feature | Description |
|---|---|
| **Dashboard** | KPIs overview, quick task summary |
| **Kanban** | Drag-and-drop task board with status columns |
| **CRM** | Contact and pipeline management |
| **Calendar** | Monthly view + bidirectional iCal sync (Apple/Google Calendar) |
| **Roadmap** | Project timeline view |
| **Ideas** | Idea board with voting |
| **Time Tracker** | Rize-style live timer, categories, per-user stats |
| **Notes** | Private markdown notes per user |
| **Chat** | Real-time team chat with GIF support |
| **Settings** | Profile, password, calendar feed configuration |

---

## Stack

- **Framework:** Next.js 15 (App Router, TypeScript)
- **Database:** Supabase PostgreSQL via `@supabase/supabase-js`
- **Auth:** NextAuth v4 (JWT strategy, credentials provider)
- **Deployment:** Vercel + GitHub Actions CI/CD
- **Styling:** Tailwind CSS + CSS custom properties (no component library)

---

## Project Structure

```
notion-dashboard/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx          # Root layout (TopNav, BottomNav, Chat, PageTransition)
│   ├── globals.css         # Design tokens + shared styles
│   ├── page.tsx            # Dashboard home
│   ├── kanban/             # Kanban board
│   ├── crm/                # CRM
│   ├── calendar/           # Calendar with iCal sync
│   ├── roadmap/            # Roadmap
│   ├── ideas/              # Ideas board
│   ├── time/               # Time tracker
│   ├── notes/              # Personal notes
│   ├── settings/           # User settings
│   ├── login/              # Auth page
│   └── api/                # API routes
│       ├── tasks/          # CRUD tasks
│       ├── events/         # CRUD calendar events
│       ├── crm/            # CRUD CRM entries
│       ├── ideas/          # CRUD ideas
│       ├── notes/          # CRUD notes (per-user private)
│       ├── time/           # Time sessions
│       ├── chat/           # Chat messages
│       ├── notifications/  # Notifications
│       ├── presence/       # Online presence
│       ├── kpis/           # Dashboard stats
│       ├── gifs/           # Tenor GIF search
│       ├── settings/       # User settings (display name, password, iCal URL)
│       ├── calendar.ics/   # iCal export feed (subscribe from Apple/Google Calendar)
│       └── calendar/
│           └── import/     # iCal import (fetches + parses external .ics feed)
│
├── components/             # Shared React components
│   ├── TopNav.tsx          # Desktop navigation header
│   ├── BottomNav.tsx       # Mobile bottom nav (5 items)
│   ├── Chat.tsx            # Floating chat window
│   ├── PageTransition.tsx  # Route-change animation wrapper
│   ├── TimeWidget.tsx      # Live timer pill in TopNav
│   ├── ThemeToggle.tsx     # Dark/light mode toggle
│   ├── NotificationBell.tsx
│   ├── PresenceIndicator.tsx
│   ├── KanbanBoard.tsx
│   ├── CRMModal.tsx / CRMPipeline.tsx
│   ├── IdeaModal.tsx / IdeasView.tsx
│   ├── TaskModal.tsx
│   └── Modal.tsx
│
├── lib/
│   ├── db.ts               # All Supabase DB functions (source of truth)
│   ├── types.ts            # Shared TypeScript types
│   ├── auth-options.ts     # NextAuth config
│   ├── sounds.ts           # Audio feedback
│   └── notion.ts           # Legacy — kept for reference, no longer used
│
├── migrations/             # SQL migrations (auto-applied on deploy)
│   ├── 001_initial.sql     # All tables: tasks, crm, events, notes, time_sessions, etc.
│   └── 002_ical_feed.sql   # Adds ical_feed_url to presence table
│
├── scripts/
│   └── migrate.js          # Migration runner (reads migrations/, skips applied)
│
├── public/
│   └── favicon.svg         # App icon (4-square grid logo)
│
├── .github/workflows/
│   └── deploy.yml          # CI: migrate → build → deploy to Vercel
│
└── .env.local              # Local environment variables (never commit)
```

---

## Database Schema

All tables live in Supabase PostgreSQL. Migrations are tracked via a `_migrations` table.

| Table | Purpose |
|---|---|
| `tasks` | Kanban/roadmap tasks with status, dates, priority |
| `crm` | CRM contacts and pipeline entries |
| `ideas` | Ideas with vote count |
| `events` | Calendar events (RDV, Réunion, Appel, Deadline) |
| `notifications` | In-app notifications |
| `presence` | User online status + settings (display name, password override, iCal feed URL) |
| `chat_messages` | Team chat messages |
| `notes` | Private markdown notes, per user |
| `time_sessions` | Time tracking sessions with category and duration |

---

## Calendar Sync (bidirectional)

**App → Apple/Google Calendar (export):**
- Subscribe to `https://manager-thenextbigthing.vercel.app/api/calendar.ics` in Apple Calendar or Google Calendar
- Auto-updates with tasks and events from the app

**Apple/Google Calendar → App (import):**
- Go to Settings → Calendrier
- Paste your Apple Calendar or Google Calendar iCal URL
- Your external events appear in the app calendar
- Feed is refreshed every 5 minutes (Next.js `revalidate: 300`)

---

## Local Development

```bash
npm install
npm run dev   # starts on http://localhost:3333
```

Requires `.env.local` with:
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
POSTGRES_URL_NON_POOLING=
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3333
USER1_NAME=
USER1_USERNAME=
USER1_PASSWORD=
USER2_NAME=
USER2_USERNAME=
USER2_PASSWORD=
TENOR_API_KEY=LIVDSRZULELA
```

---

## Deploy

Push to `main` → GitHub Actions automatically:
1. Runs SQL migrations against the production DB
2. Builds the Next.js app via Vercel CLI
3. Deploys to production and aliases to `manager-thenextbigthing.vercel.app`

Secrets required in GitHub: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `POSTGRES_URL_NON_POOLING`

---

## Adding a New Feature

1. **DB change?** Add a new `migrations/00N_description.sql` file — it will run automatically on next deploy.
2. **New page?** Create `app/your-page/page.tsx` and add the route to `TopNav.tsx` (desktop) and `BottomNav.tsx` if it needs mobile access.
3. **New API?** Add `app/api/your-route/route.ts`. Use `getToken()` from `next-auth/jwt` for auth. Use `getClient()` from `lib/db.ts` for DB access.
4. **New DB functions?** Add them to `lib/db.ts` alongside the existing patterns.
