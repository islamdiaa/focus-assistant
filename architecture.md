# FocusAssist — Architecture

## Overview

FocusAssist is a full-stack productivity web application designed for ADHD-friendly task management, Pomodoro timing, and Eisenhower Matrix prioritization. It runs as a single Docker container with an Express backend serving both the React frontend and a tRPC API layer. Data is persisted to a local Markdown file by default, with an optional Google Sheets backend for cloud sync. The app also supports Obsidian vault sync, a read-later pocket, reminders, task templates, weekly review, and a distraction-free focus mode.

## System Diagram

```
┌──────────────────────────────────────────────────────┐
│                  Docker Container                     │
│                  (Port 1992)                          │
│                                                      │
│  ┌─────────────────┐     ┌────────────────────────┐  │
│  │   React 19 SPA  │     │    Express 4 Server    │  │
│  │   (Vite build)  │◄───►│    (tRPC 11 API)       │  │
│  │                 │     │                        │  │
│  │  • Today        │     │  ┌──────────────────┐  │  │
│  │  • Tasks        │     │  │   Data Router    │  │  │
│  │  • Focus Timer  │     │  │  (load / save)   │  │  │
│  │  • Matrix       │     │  └────────┬─────────┘  │  │
│  │  • Stats        │     │           │            │  │
│  │  • Read Later   │     │     ┌─────▼─────┐     │  │
│  │  • Reminders    │     │     │  Storage   │     │  │
│  │  • Templates    │     │     │  Router    │     │  │
│  │  • Weekly Review│     │     └──┬─────┬──┘     │  │
│  │  • Settings     │     │        │     │        │  │
│  │  • Focus Mode   │     │   ┌────▼┐  ┌─▼─────┐  │  │
│  └─────────────────┘     │   │ MD  │  │Google │  │  │
│                          │   │File │  │Sheets │  │  │
│                          │   └──┬──┘  └───────┘  │  │
│                          │      │                │  │
│                          │   ┌──▼──────────┐     │  │
│                          │   │ Obsidian    │     │  │
│                          │   │ Vault Sync  │     │  │
│                          │   └─────────────┘     │  │
│                          └───────────────────────┘  │
│                                 │                    │
│                          ┌──────▼──────┐             │
│                          │  /app/data  │             │
│                          │  (volume)   │             │
│                          └─────────────┘             │
└──────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 19, TypeScript, Tailwind CSS 4 | SPA with warm Scandinavian design |
| UI Components | shadcn/ui (Radix primitives) | Accessible, composable components |
| Animations | Framer Motion | Page transitions, card animations, layout animations |
| State Management | React Context + useReducer | Client-side state with server sync |
| API Layer | tRPC 11 | End-to-end type-safe RPC |
| Server | Express 4, Node.js 22 | HTTP server, static file serving |
| Serialization | superjson | Preserves Date, Map, Set over the wire |
| Type System | Zod → TypeScript (inferred) | Single source of truth: Zod schemas define runtime validation, TS types are auto-derived |
| Primary Storage | Local Markdown file | Human-readable, git-friendly persistence |
| Cloud Storage | Google Sheets API v4 | Optional cloud sync backend |
| Build | Vite 7 (client), esbuild (server) | Fast builds, HMR in dev |
| Testing | Vitest (172+ tests) | Unit tests, schema integrity, persistence round-trips |
| Container | Docker (Alpine-based) | Single container deployment |
| CI/CD | GitHub Actions | Test → Docker build → push to Docker Hub + GHCR |
| Auth | Manus OAuth (optional) | Session-based authentication |
| Database | MySQL/TiDB via Drizzle ORM | User table for auth (not used for app data) |

## Directory Structure

```
focus-assist/
├── client/                    # Frontend (React SPA)
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   │   ├── Sidebar.tsx    # Navigation sidebar with context switcher and daily tips
│   │   │   └── ui/            # shadcn/ui primitives
│   │   ├── contexts/
│   │   │   └── AppContext.tsx  # Global state (tasks, pomodoros, settings, stats, reminders, reading list)
│   │   ├── lib/
│   │   │   ├── sheets.ts      # Client → server API bridge
│   │   │   ├── types.ts       # Re-exports from shared/appTypes.ts (single source of truth)
│   │   │   ├── contextFilter.ts # Context filter utility (Work/Personal/All)
│   │   │   └── md-storage.ts  # (Legacy) File System Access API
│   │   └── pages/
│   │       ├── Home.tsx            # Main layout shell (sidebar + content + header)
│   │       ├── DailyPlannerPage.tsx # Today view: reminders, due tasks, energy suggestions, monitoring
│   │       ├── TasksPage.tsx       # CRUD tasks with filters (All/Open/Monitored/Done), monitor toggle
│   │       ├── TimerPage.tsx       # Pomodoro timers with multi-task/subtask linking
│   │       ├── MatrixPage.tsx      # Eisenhower 4-quadrant drag-and-drop
│   │       ├── StatsPage.tsx       # Streak, charts, all-time statistics
│   │       ├── ReadLaterPage.tsx   # Read-later pocket with tags, status, notes
│   │       ├── RemindersPage.tsx   # Birthdays, appointments, events with time-of-day
│   │       ├── TemplatesPage.tsx   # Reusable task templates
│   │       ├── WeeklyReviewPage.tsx# End-of-week summary and planning
│   │       ├── FocusModePage.tsx   # Distraction-free focus view
│   │       └── SettingsPage.tsx    # Timer presets, storage config, Obsidian, about
│   └── index.html
│
├── server/                    # Backend (Express + tRPC)
│   ├── _core/                 # Framework plumbing (do not edit)
│   │   ├── index.ts           # Server entry point
│   │   ├── trpc.ts            # tRPC initialization
│   │   ├── context.ts         # Request context builder
│   │   ├── env.ts             # Environment variable access
│   │   └── oauth.ts           # Manus OAuth handler
│   ├── dataRouter.ts          # tRPC router: load, save, getConfig, setConfig (uses shared Zod schemas)
│   ├── mdStorage.ts           # Markdown file serializer/deserializer
│   ├── obsidianSync.ts        # Obsidian vault markdown export
│   ├── sheetsStorage.ts       # Google Sheets API read/write
│   ├── storageConfig.ts       # Storage mode config (file vs sheets)
│   ├── routers.ts             # Root tRPC router
│   ├── db.ts                  # Database helpers (Drizzle ORM)
│   └── *.test.ts              # Vitest test files (15 files, 172+ tests)
│
├── shared/                    # Shared between client and server
│   ├── appTypes.ts            # SINGLE SOURCE OF TRUTH: Zod schemas → inferred TS types
│   └── const.ts               # Shared constants
│
├── drizzle/                   # Database schema and migrations
│   └── schema.ts              # Users table (for auth)
│
├── data/                      # Persistent data (Docker volume mount)
│   ├── focus-assist-data.md   # All app data in Markdown format
│   ├── daily_backup/          # Daily backup snapshots
│   └── config.json            # Storage mode configuration
│
├── .github/workflows/ci.yml  # CI: test → Docker build → push (Docker Hub + GHCR)
├── Dockerfile                 # Multi-stage production build
├── docker-compose.yml         # Single-command deployment
├── DOCKER-GUIDE.md            # Deployment guide (Docker + Unraid)
├── CHANGELOG.md               # Version history
└── package.json               # Dependencies and scripts
```

## Data Model

All types are defined as Zod schemas in `shared/appTypes.ts`. TypeScript types are inferred automatically — never defined manually. This prevents schema drift between runtime validation and compile-time types.

| Entity | Key Fields | Notes |
|--------|-----------|-------|
| Task | id, title, priority, status, dueDate, category, energy, quadrant, recurrence, subtasks, pinnedToday | Status: `active`/`done`/`monitored`. Supports daily/weekly/monthly/quarterly/weekdays recurrence. Monitored = waiting on external action. |
| Subtask | id, title, done | Nested under parent task |
| Pomodoro | id, title, duration, elapsed, status, linkedTasks | Links to multiple tasks/subtasks via `linkedTasks` array |
| PomodoroLink | taskId, subtaskId? | Associates a pomodoro with a task and optionally a subtask |
| Reminder | id, title, date, time?, recurrence, category, acknowledged | Birthdays, appointments, events. Optional time (HH:mm). Yearly/monthly/weekly recurrence. |
| ReadingItem | id, url, title, tags, status, notes | Read-later pocket with unread/reading/read status |
| TaskTemplate | id, name, tasks | Reusable task sets |
| DailyStats | date, tasksCompleted, focusMinutes, pomodorosCompleted | Per-day aggregates |
| AppPreferences | notificationSound, obsidianVaultPath, obsidianAutoSync, activeContext | User preferences. activeContext: `all`/`work`/`personal` for global context filtering. |

## Data Flow

### Write Path (e.g., creating a task)

1. User fills the "New Task" dialog and clicks "Create Task"
2. `TasksPage` dispatches `ADD_TASK` to `AppContext` reducer
3. `AppContext` updates local state immediately (optimistic)
4. `AppContext` calls `saveState()` which POSTs to `trpc.data.save`
5. `dataRouter.save` validates state against `appStateSchema.strict()` (Zod)
6. If `mode === 'file'`: calls `saveToMdFile()` → serializes state to Markdown → writes `data/focus-assist-data.md`
7. If `mode === 'sheets'`: calls `saveToSheets()` → clears and rewrites all Google Sheets tabs
8. If Obsidian auto-sync enabled: fires `syncToObsidian()` asynchronously

### Read Path (app load)

1. `AppContext` mounts and calls `loadState()` which queries `trpc.data.load`
2. `dataRouter.load` checks storage config
3. Reads from MD file or Google Sheets
4. Returns `AppState` (tasks, pomodoros, settings, dailyStats, currentStreak, templates, preferences, readingList, reminders)
5. `AppContext` dispatches `LOAD_STATE` to populate the reducer

### Type Safety Pipeline

```
shared/appTypes.ts (Zod schemas)
    ↓ z.infer<typeof schema>
TypeScript types (auto-derived)
    ↓ imported by
dataRouter.ts (runtime validation via .strict())
mdStorage.ts (serialization/deserialization)
AppContext.tsx (reducer actions)
All page components (UI rendering)
```

The `.strict()` modifier on `appStateSchema` ensures that any unknown fields in the save payload cause an error instead of being silently stripped. This prevents the class of bug where new fields are added to types but not to the validation schema.

## Storage Backends

### Local Markdown File (Default)

The primary storage is a human-readable Markdown file at `data/focus-assist-data.md`. The format uses Markdown tables for structured data:

```markdown
# Focus Assist Data
> Auto-generated by Focus Assist. Edit with care.

## Settings
- **Focus Duration:** 25 min
- **Current Streak:** 7 days

## Tasks
| ID | Title | Priority | Status | ... |

## Pomodoros
| ID | Title | Duration | Status | LinkedTasks | ... |

## Daily Stats
| Date | Tasks Completed | Focus Minutes | ... |

## Templates
| ID | Name | Description | Tasks (JSON) | Created |

## Reading List
| ID | URL | Title | Description | Tags | Status | Notes | ... |

## Reminders
| ID | Title | Description | Date | Time | Recurrence | Category | Acknowledged | ... |
```

This format is intentionally designed to be:
- Readable in any text editor, Obsidian, or GitHub
- Diffable in git (great for version control)
- Editable by hand if needed
- Parseable by the `mdStorage.ts` serializer

Pipe characters in field values are escaped as `\|` during serialization and unescaped during parsing.

### Google Sheets (Optional)

When enabled via Settings, the app writes to a Google Sheet with four tabs: `Tasks`, `Pomodoros`, `Settings`, `DailyStats`. Each tab uses the first row as headers and subsequent rows as data. The Google Sheets API v4 is called server-side with the user's API key.

### Obsidian Vault Sync

When configured in Settings, the app writes a `FocusAssist.md` file to the specified Obsidian vault path on every save. The file includes YAML frontmatter, Obsidian-compatible task checkboxes, #hashtag tags, reading list with links, and a stats table. This runs asynchronously and does not block saves.

## CI/CD Pipeline

```
git push to main → GitHub Actions CI
    ├── Test job: pnpm install → tsc --noEmit → pnpm test (104+ tests)
    └── Docker job (on success):
        ├── Build multi-arch image (amd64 + arm64)
        ├── Push to Docker Hub (islamdiaa/focus-assistant:latest)
        └── Push to GHCR (ghcr.io/islamdiaa/FocusAssistant:latest)

git tag v*.*.* → Same pipeline + semver Docker tags (e.g., 1.8.1, 1.8)
```

Watchtower on Unraid polls Docker Hub hourly and auto-pulls new images.

## Test Coverage

| Test File | Tests | Coverage |
|-----------|-------|----------|
| mdStorage.comprehensive.test.ts | Tasks, pomodoros, settings, daily stats round-trips | Core serialization |
| v18-features.test.ts | Reading list, Obsidian sync, templates, preferences | V1.8 features |
| v181-persistence.test.ts | Full save/load round-trips for all entity types | Persistence integrity |
| schema-integrity.test.ts | Zod schema drift detection, full state round-trips | Architecture safety |
| appTypes.test.ts | Zod schema validation, type inference checks | Type system |
| sheetsStorage.test.ts | Google Sheets API mocking | Cloud storage |
| auth.logout.test.ts | Logout endpoint | Auth |

## Port Allocation

| Port | Purpose | Status |
|------|---------|--------|
| 1992 | Main app (Express + React) | Active |
| 1993 | Reserved for future use (e.g., WebSocket) | Reserved |
| 1994 | Reserved for future use (e.g., admin panel) | Reserved |

## Key Design Decisions

**Single container, no database for app data.** App data lives in a Markdown file, not MySQL. The database (Drizzle/MySQL) is only used for the Manus OAuth user table. This keeps the Docker deployment dead simple — one volume mount and you're done.

**Zod-first type system.** All data types are defined as Zod schemas in `shared/appTypes.ts`. TypeScript types are inferred via `z.infer<>`. The save endpoint uses `.strict()` to reject unknown fields. This eliminates the class of bugs where types and validation schemas drift apart.

**Server-side storage, not client-side.** Previous versions used the browser's File System Access API and localStorage. The server-backed approach means data persists across devices and browsers, and the Docker volume ensures durability.

**Markdown as the storage format.** JSON would be simpler to parse, but Markdown is human-readable, git-diffable, and can be opened in Obsidian or any note-taking tool. The tradeoff is a slightly more complex parser, which is covered by unit tests.

**No authentication required for app data.** The data endpoints are public procedures (not protected). This is intentional — FocusAssist is a personal tool running on a private network (Unraid). If deployed publicly, wrap the data router in `protectedProcedure`.

**Warm Scandinavian design.** The UI uses DM Serif Display + DM Sans typography, earth-tone colors (cream, sand, terracotta, sage green), and watercolor illustrations. This creates a calm, focused environment that's ADHD-friendly — warm rather than sterile.

## Keyboard Shortcuts

| Key | Action | Context |
|-----|--------|---------|
| N | New task dialog | Tasks page |
| R | New reminder dialog | Reminders page |
| / | Focus search bar | Tasks page |
| F | Enter focus mode | Any page |
| Esc | Exit focus mode | Focus mode |
| 1-9 | Switch pages | Global |
| Ctrl+Z | Undo | Global |
| Ctrl+Shift+Z | Redo | Global |
