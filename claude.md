# CLAUDE.md — Project Guide for Claude

This file helps Claude (Anthropic's AI assistant) navigate and contribute to the FocusAssist codebase effectively.

## Project Summary

FocusAssist is a full-stack productivity app (React 19 + Express 4 + tRPC 11) designed for ADHD-friendly task management. It runs as a single Docker container. Data is stored as a local Markdown file (`data/focus-assist-data.md`) by default, with optional Google Sheets sync.

## Quick Start (Development)

```bash
pnpm install
pnpm dev          # Starts Express + Vite dev server on port 3000
pnpm test         # Runs vitest
pnpm build        # Production build (Vite + esbuild)
pnpm db:push      # Drizzle schema migrations
```

## Architecture at a Glance

```
Client (React SPA)  ──tRPC──►  Server (Express)  ──►  Storage (MD file or Google Sheets)
```

- **No database for app data.** MySQL/Drizzle is only for the Manus OAuth user table.
- **All app data** (tasks, pomodoros, settings, stats) flows through `server/dataRouter.ts`.
- **Storage backends** are swappable via `data/config.json` (`mode: "file"` or `mode: "sheets"`).

## Key Files to Know

| File | What It Does |
|------|-------------|
| `server/dataRouter.ts` | tRPC router with `load`, `save`, `getConfig`, `setConfig` procedures |
| `server/mdStorage.ts` | Serializes/deserializes `AppState` ↔ Markdown tables |
| `server/sheetsStorage.ts` | Google Sheets API v4 read/write |
| `server/storageConfig.ts` | Reads/writes `data/config.json` for storage mode |
| `shared/appTypes.ts` | All shared TypeScript types (`Task`, `Pomodoro`, `AppState`, etc.) |
| `client/src/contexts/AppContext.tsx` | React Context + useReducer — the global state store |
| `client/src/lib/sheets.ts` | Client-side API bridge (calls tRPC endpoints) |
| `client/src/pages/Home.tsx` | Main layout shell (sidebar + header + page content) |
| `client/src/pages/TasksPage.tsx` | Tasks CRUD with filters, sort, inline edit |
| `client/src/pages/TimerPage.tsx` | Pomodoro timers with circular progress |
| `client/src/pages/MatrixPage.tsx` | Eisenhower Matrix with drag-and-drop |
| `client/src/pages/StatsPage.tsx` | Statistics dashboard with charts |
| `client/src/pages/SettingsPage.tsx` | Timer presets, storage config, about section |

## Files You Should NOT Edit

- `server/_core/*` — Framework plumbing (OAuth, Vite bridge, context). Treat as read-only.
- `client/src/components/ui/*` — shadcn/ui primitives. Customize via props, not source edits.
- `drizzle/schema.ts` — Only the `users` table exists. App data does NOT use the database.

## Type System

All app data types live in `shared/appTypes.ts`:

```typescript
interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'active' | 'done';
  dueDate?: string;
  category?: 'work' | 'personal' | 'health' | 'learning' | 'errands' | 'other';
  energy?: 'low' | 'medium' | 'high';
  quadrant: 'do-first' | 'schedule' | 'delegate' | 'eliminate' | 'unassigned';
  createdAt: string;
  completedAt?: string;
}

interface AppState {
  tasks: Task[];
  pomodoros: Pomodoro[];
  settings: TimerSettings;
  dailyStats: DailyStat[];
  currentStreak: number;
}
```

## Data Flow Pattern

1. User action → React dispatch → `AppContext` reducer updates state
2. After state update → `saveState()` → `trpc.data.save.mutate(state)`
3. Server checks `config.json` → writes to MD file or Google Sheets
4. On app load → `trpc.data.load.query()` → dispatches `LOAD_STATE`

## Styling Conventions

- **Design system:** Warm Scandinavian — cream, sand, terracotta, sage green palette
- **Typography:** DM Serif Display (headings), DM Sans (body) via Google Fonts
- **Custom CSS classes:** `bg-warm-sand`, `bg-warm-sage`, `bg-warm-terracotta`, `bg-warm-blue`, etc. defined in `client/src/index.css`
- **Component library:** shadcn/ui with Tailwind CSS 4
- **Responsive:** Mobile-first with hamburger menu below `lg` breakpoint (1024px)

## Testing

```bash
pnpm test                    # Run all tests
pnpm vitest run server/      # Run only server tests
```

Test files:
- `server/mdStorage.test.ts` — Round-trip serialization, edge cases (pipes, empty state)
- `server/auth.logout.test.ts` — Auth cookie clearing

When adding new features, write tests for any server-side logic. The MD storage serializer is particularly important to test since it handles escaping.

## Changelog Maintenance

**IMPORTANT:** Every time you make changes to this project, you MUST update `CHANGELOG.md`.

1. Add your changes under the `[Unreleased]` section at the top of the file
2. Use the correct category: `Added`, `Changed`, `Fixed`, `Removed`, `Deprecated`, `Security`
3. Write concise but specific descriptions of what changed
4. When a release is cut, move `[Unreleased]` items to a new versioned section with the date
5. Never delete existing changelog entries

Example:
```markdown
## [Unreleased]

### Added
- Dark mode toggle in Settings with warm palette variant

### Fixed
- Timer not resuming after page refresh
```

## Common Tasks

**Add a new field to tasks:**
1. Update `Task` type in `shared/appTypes.ts`
2. Update `appStateSchema` in `server/dataRouter.ts` (Zod validation)
3. Update `stateToMarkdown` and `markdownToState` in `server/mdStorage.ts`
4. Update `TasksPage.tsx` form and card display
5. Add test case in `server/mdStorage.test.ts`

**Add a new page:**
1. Create `client/src/pages/NewPage.tsx`
2. Add navigation item in `client/src/components/Sidebar.tsx`
3. Add page rendering in `client/src/pages/Home.tsx`

**Change the default port:**
Update `Dockerfile` (EXPOSE + ENV), `docker-compose.yml` (ports + environment), and `DOCKER-GUIDE.md`.

## Ports

| Port | Purpose |
|------|---------|
| 1992 | Main app |
| 1993 | Reserved (future WebSocket) |
| 1994 | Reserved (future admin) |

## Environment Variables

The app runs without any required env vars for basic functionality. The Manus OAuth system uses `JWT_SECRET`, `VITE_APP_ID`, `OAUTH_SERVER_URL`, etc., but these are only needed for the hosted version.

For Docker deployment, only `PORT` and `DATA_DIR` matter:
```
PORT=1992
DATA_DIR=/app/data
NODE_ENV=production
```
