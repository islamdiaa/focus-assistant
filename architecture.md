# FocusAssist — Architecture

## Overview

FocusAssist is a full-stack productivity web application designed for ADHD-friendly task management, Pomodoro timing, and Eisenhower Matrix prioritization. It runs as a single Docker container with an Express backend serving both the React frontend and a tRPC API layer. Data is persisted to a local Markdown file by default, with an optional Google Sheets backend for cloud sync.

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
│  │  • Tasks Page   │     │  ┌──────────────────┐  │  │
│  │  • Timer Page   │     │  │   Data Router    │  │  │
│  │  • Matrix Page  │     │  │  (load / save)   │  │  │
│  │  • Stats Page   │     │  └────────┬─────────┘  │  │
│  │  • Settings     │     │           │            │  │
│  └─────────────────┘     │     ┌─────▼─────┐     │  │
│                          │     │  Storage   │     │  │
│                          │     │  Router    │     │  │
│                          │     └──┬─────┬──┘     │  │
│                          │        │     │        │  │
│                          │   ┌────▼┐  ┌─▼─────┐  │  │
│                          │   │ MD  │  │Google │  │  │
│                          │   │File │  │Sheets │  │  │
│                          │   └──┬──┘  └───────┘  │  │
│                          └──────┼────────────────┘  │
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
| State Management | React Context + useReducer | Client-side state with server sync |
| API Layer | tRPC 11 | End-to-end type-safe RPC |
| Server | Express 4, Node.js 22 | HTTP server, static file serving |
| Serialization | superjson | Preserves Date, Map, Set over the wire |
| Primary Storage | Local Markdown file | Human-readable, git-friendly persistence |
| Cloud Storage | Google Sheets API v4 | Optional cloud sync backend |
| Build | Vite 7 (client), esbuild (server) | Fast builds, HMR in dev |
| Testing | Vitest | Unit tests for storage layer |
| Container | Docker (Alpine-based) | Single container deployment |
| Auth | Manus OAuth (optional) | Session-based authentication |
| Database | MySQL/TiDB via Drizzle ORM | User table for auth (not used for app data) |

## Directory Structure

```
focus-assist/
├── client/                    # Frontend (React SPA)
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   │   ├── Sidebar.tsx    # Navigation sidebar with daily tips
│   │   │   └── ui/            # shadcn/ui primitives
│   │   ├── contexts/
│   │   │   └── AppContext.tsx  # Global state (tasks, pomodoros, settings, stats)
│   │   ├── lib/
│   │   │   ├── sheets.ts      # Client → server API bridge
│   │   │   ├── types.ts       # Client-side type definitions
│   │   │   └── md-storage.ts  # (Legacy) File System Access API
│   │   └── pages/
│   │       ├── Home.tsx        # Main layout shell (sidebar + content + header)
│   │       ├── TasksPage.tsx   # CRUD tasks with filters, sort, inline edit
│   │       ├── TimerPage.tsx   # Pomodoro timers with circular progress
│   │       ├── MatrixPage.tsx  # Eisenhower 4-quadrant drag-and-drop
│   │       ├── StatsPage.tsx   # Streak, charts, all-time statistics
│   │       └── SettingsPage.tsx# Timer presets, storage config, about
│   └── index.html
│
├── server/                    # Backend (Express + tRPC)
│   ├── _core/                 # Framework plumbing (do not edit)
│   │   ├── index.ts           # Server entry point
│   │   ├── trpc.ts            # tRPC initialization
│   │   ├── context.ts         # Request context builder
│   │   ├── env.ts             # Environment variable access
│   │   └── oauth.ts           # Manus OAuth handler
│   ├── dataRouter.ts          # tRPC router: load, save, getConfig, setConfig
│   ├── mdStorage.ts           # Markdown file serializer/deserializer
│   ├── sheetsStorage.ts       # Google Sheets API read/write
│   ├── storageConfig.ts       # Storage mode config (file vs sheets)
│   ├── routers.ts             # Root tRPC router
│   ├── db.ts                  # Database helpers (Drizzle ORM)
│   └── *.test.ts              # Vitest test files
│
├── shared/                    # Shared between client and server
│   ├── appTypes.ts            # App data types (Task, Pomodoro, etc.)
│   └── const.ts               # Shared constants
│
├── drizzle/                   # Database schema and migrations
│   └── schema.ts              # Users table (for auth)
│
├── data/                      # Persistent data (Docker volume mount)
│   ├── focus-assist-data.md   # All app data in Markdown format
│   └── config.json            # Storage mode configuration
│
├── Dockerfile                 # Multi-stage production build
├── docker-compose.yml         # Single-command deployment
├── DOCKER-GUIDE.md            # Deployment guide (Docker + Unraid)
└── package.json               # Dependencies and scripts
```

## Data Flow

### Write Path (e.g., creating a task)

1. User fills the "New Task" dialog and clicks "Create Task"
2. `TasksPage` dispatches `ADD_TASK` to `AppContext` reducer
3. `AppContext` updates local state immediately (optimistic)
4. `AppContext` calls `saveState()` which POSTs to `trpc.data.save`
5. `dataRouter.save` checks `config.json` for storage mode
6. If `mode === 'file'`: calls `saveToMdFile()` → serializes state to Markdown → writes `data/focus-assist-data.md`
7. If `mode === 'sheets'`: calls `saveToSheets()` → clears and rewrites all Google Sheets tabs

### Read Path (app load)

1. `AppContext` mounts and calls `loadState()` which queries `trpc.data.load`
2. `dataRouter.load` checks storage config
3. Reads from MD file or Google Sheets
4. Returns `AppState` (tasks, pomodoros, settings, dailyStats, currentStreak)
5. `AppContext` dispatches `LOAD_STATE` to populate the reducer

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
|----|-------|----------|--------|-----|
| abc123 | Review OKRs | high | active | ... |

## Pomodoros
| ID | Title | Duration | Status | ... |

## Daily Stats
| Date | Tasks Completed | Focus Minutes | ... |
```

This format is intentionally designed to be:
- Readable in any text editor, Obsidian, or GitHub
- Diffable in git (great for version control)
- Editable by hand if needed
- Parseable by the `mdStorage.ts` serializer

Pipe characters in field values are escaped as `\|` during serialization and unescaped during parsing.

### Google Sheets (Optional)

When enabled via Settings, the app writes to a Google Sheet with four tabs: `Tasks`, `Pomodoros`, `Settings`, `DailyStats`. Each tab uses the first row as headers and subsequent rows as data. The Google Sheets API v4 is called server-side with the user's API key.

## Port Allocation

| Port | Purpose | Status |
|------|---------|--------|
| 1992 | Main app (Express + React) | Active |
| 1993 | Reserved for future use (e.g., WebSocket) | Reserved |
| 1994 | Reserved for future use (e.g., admin panel) | Reserved |

## Key Design Decisions

**Single container, no database for app data.** App data lives in a Markdown file, not MySQL. The database (Drizzle/MySQL) is only used for the Manus OAuth user table. This keeps the Docker deployment dead simple — one volume mount and you're done.

**Server-side storage, not client-side.** Previous versions used the browser's File System Access API and localStorage. The server-backed approach means data persists across devices and browsers, and the Docker volume ensures durability.

**Markdown as the storage format.** JSON would be simpler to parse, but Markdown is human-readable, git-diffable, and can be opened in Obsidian or any note-taking tool. The tradeoff is a slightly more complex parser, which is covered by unit tests.

**No authentication required for app data.** The data endpoints are public procedures (not protected). This is intentional — FocusAssist is a personal tool running on a private network (Unraid). If deployed publicly, wrap the data router in `protectedProcedure`.

**Warm Scandinavian design.** The UI uses DM Serif Display + DM Sans typography, earth-tone colors (cream, sand, terracotta, sage green), and watercolor illustrations. This creates a calm, focused environment that's ADHD-friendly — warm rather than sterile.
