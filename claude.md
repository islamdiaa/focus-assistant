# CLAUDE.md — Project Guide for Claude

This file helps Claude (Anthropic's AI assistant) navigate and contribute to the FocusAssist codebase effectively.

## Project Summary

FocusAssist is a full-stack productivity app (React 19 + Express 4 + tRPC 11) designed for ADHD-friendly task management. It runs as a single Docker container. Data is stored as a local Markdown file (`data/focus-assist-data.md`) by default, with optional Google Sheets sync and Obsidian vault export.

**V1.8.5 additions:** Work/Personal context filtering (global toggle in sidebar), Monitored task status (active ↔ monitored ↔ done state machine for "waiting-on" tasks), `statusChangedAt` field for tracking when tasks change status, Today view overhaul (full task/reminder actions, "Actioned Today" section, no monitoring section).

**V1.8.6 fixes:** Auto-save race condition (C1), poll overwrites unsaved changes (C2), JSON import Zod validation (C3), write mutex + atomic saves (C4), zero-safe integer parsing (C6), corrupt file handling (H5), missing default fields in fallback states (H8). All backward compatible.

**V1.8.7 changes:** Code-split 8 pages with React.lazy + Suspense (Timer, Matrix, Stats, Settings, Templates, WeeklyReview, ReadLater, FocusMode). Fixed AudioContext leak (H1), duplicate recurrence spawning (H7), and pomodoro stats using planned vs actual time (H9). Playwright E2E added to CI.

## Quick Start (Development)

```bash
pnpm install
pnpm dev          # Starts Express + Vite dev server on port 3000
pnpm test         # Runs vitest (278+ tests)
pnpm build        # Production build (Vite + esbuild)
pnpm preflight    # Pre-push checks (MUST pass before every push)
pnpm db:push      # Drizzle schema migrations
```

## Architecture at a Glance

```
Client (React SPA)  ──tRPC──►  Server (Express)  ──►  Storage (MD file or Google Sheets)
                                                  ──►  Obsidian Vault Sync (optional)
```

- **No database for app data.** MySQL/Drizzle is only for the OAuth user table.
- **All app data** (tasks, pomodoros, settings, stats, reminders, reading list, templates) flows through `server/dataRouter.ts`.
- **Storage backends** are swappable via `data/config.json` (`mode: "file"` or `mode: "sheets"`).
- **Self-hosted mode:** `SKIP_AUTH=true` bypasses OAuth and injects a local admin user.

## Key Files to Know

| File                                    | What It Does                                                                                                                                                                                                                                                         |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shared/appTypes.ts`                    | **SINGLE SOURCE OF TRUTH** — Zod schemas → inferred TS types. All types defined here. Includes `taskStatusSchema` (`active`/`done`/`monitored`), `contextFilterSchema` (`all`/`work`/`personal`), and category constants (`WORK_CATEGORIES`, `PERSONAL_CATEGORIES`). |
| `server/dataRouter.ts`                  | tRPC router with `load`, `save`, `getConfig`, `setConfig` procedures. Imports schemas from shared.                                                                                                                                                                   |
| `server/mdStorage.ts`                   | Serializes/deserializes `AppState` ↔ Markdown tables. Uses `col()` safe accessor for backward compat.                                                                                                                                                               |
| `server/obsidianSync.ts`                | Writes Obsidian-compatible markdown to configured vault path                                                                                                                                                                                                         |
| `server/sheetsStorage.ts`               | Google Sheets API v4 read/write                                                                                                                                                                                                                                      |
| `server/storageConfig.ts`               | Reads/writes `data/config.json` for storage mode                                                                                                                                                                                                                     |
| `client/src/contexts/AppContext.tsx`    | React Context + useReducer — the global state store. Includes save status tracking.                                                                                                                                                                                  |
| `client/src/lib/sheets.ts`              | Client-side API bridge (calls tRPC endpoints). **Includes retry logic (3x) and error reporting.**                                                                                                                                                                    |
| `client/src/lib/types.ts`               | Re-exports from `shared/appTypes.ts` (do not add types here)                                                                                                                                                                                                         |
| `client/src/lib/contextFilter.ts`       | Context filter utility — filters tasks/reminders by Work/Personal/All. Work = `work` category. Personal = everything else + uncategorized.                                                                                                                           |
| `client/src/pages/Home.tsx`             | Main layout shell (sidebar + header + page content + save error banner)                                                                                                                                                                                              |
| `client/src/pages/DailyPlannerPage.tsx` | Today view: reminders, due tasks, pinned tasks ("My Today"), energy suggestions, "Actioned Today" collapsible section. Full task actions (monitor/complete/delete) and reminder actions (ack/delete) on cards.                                                       |
| `client/src/pages/TasksPage.tsx`        | Tasks CRUD with filters (All/Open/Monitored/Done + priority sort), inline edit, recurrence, monitor toggle (Eye icon), R shortcut for reminders                                                                                                                      |
| `client/src/pages/TimerPage.tsx`        | Pomodoro timers with multi-task/subtask linking                                                                                                                                                                                                                      |
| `client/src/pages/RemindersPage.tsx`    | Reminders with yearly/quarterly/monthly/weekly recurrence, edit + undo-ack                                                                                                                                                                                           |
| `client/src/pages/ReadLaterPage.tsx`    | Read-later pocket with tags, status, notes                                                                                                                                                                                                                           |
| `client/src/pages/MatrixPage.tsx`       | Eisenhower Matrix with drag-and-drop + inline task editing                                                                                                                                                                                                           |
| `client/src/pages/StatsPage.tsx`        | Statistics dashboard with charts                                                                                                                                                                                                                                     |
| `client/src/pages/TemplatesPage.tsx`    | Reusable task templates                                                                                                                                                                                                                                              |
| `client/src/pages/WeeklyReviewPage.tsx` | End-of-week summary and planning                                                                                                                                                                                                                                     |
| `client/src/pages/FocusModePage.tsx`    | Distraction-free focus view (direct conditional render, no AnimatePresence)                                                                                                                                                                                          |
| `client/src/pages/SettingsPage.tsx`     | Timer presets, storage config, Obsidian, about section                                                                                                                                                                                                               |
| `scripts/preflight.mjs`                 | Automated pre-push checks — version, tsc, tests, env guards, shortcuts, schema compat                                                                                                                                                                                |

## Files You Should NOT Edit

- `server/_core/*` — Framework plumbing (OAuth, Vite bridge, context). Treat as read-only. Exception: `SKIP_AUTH` bypass in `context.ts`.
- `client/src/components/ui/*` — shadcn/ui primitives. Customize via props, not source edits.
- `drizzle/schema.ts` — Only the `users` table exists. App data does NOT use the database.

## Hard-Won Rules (Learned from Real Bugs)

These rules exist because we hit real bugs in V1.8.x. **Do not skip them.**

### 1. Save Operations Must Be Visible

- Save errors are tracked with retry (3x exponential backoff) in `sheets.ts`
- On failure, a red error banner with Retry button appears in the header (`Home.tsx`)
- Save status (`saving`/`saved`/`error`) is in AppContext and displayed in UI
- NEVER catch save errors silently — the user must know if data isn't persisting

### 2. Backward-Compatible Deserialization

- Every new column in mdStorage gets a safe `col(index)` accessor that returns `''` for missing columns
- ALWAYS add a test that deserializes OLD format data (fewer columns) with NEW code
- Test both: old data → new code, and new data → new code

### 3. Version Bump Atomically (ALL 4 files)

- `package.json` (version field)
- `client/src/pages/SettingsPage.tsx` (display version)
- `Dockerfile` (image version label)
- `docs/CHANGELOG.md` (new version section)
- `pnpm preflight` verifies consistency

### 4. Keyboard Shortcuts Must Check Modifier Keys

```typescript
// CORRECT — every single-key shortcut checks !isMod
const isMod = e.metaKey || e.ctrlKey;
if (e.key === "r" && !isMod && !isInput) {
  /* open reminder */
}
```

Without this, Cmd+R (refresh), Cmd+F (find), Cmd+N (new window) get intercepted.

### 5. Trigger Props Must Skip Initial Mount

```typescript
// CORRECT — useRef tracks previous value, only fires on actual change
const prevTrigger = useRef(trigger);
useEffect(() => {
  if (trigger !== prevTrigger.current) {
    prevTrigger.current = trigger;
    setDialogOpen(true);
  }
}, [trigger]);
```

Without this, navigating to a page with a stale counter > 0 auto-opens dialogs.

### 6. Environment Variables in HTML Must Be Guarded

- `%VITE_*%` in `client/index.html` must be wrapped in JS conditionals
- Unset vars become literal strings, causing URIError in self-hosted deployments

### 7. Docker: Never Use --ignore-scripts in Builder Stage

- `--ignore-scripts` prevents esbuild from downloading its platform binary
- Only use it in the production stage (no build tools needed there)
- Always test with `docker build .` before pushing Dockerfile changes

### 8. Focus Mode: No AnimatePresence

- Use direct conditional rendering (`{focusMode && <FocusModePage />}`)
- AnimatePresence exit animations leave ghost DOM nodes with `fixed inset-0 z-50`

## Type System (CRITICAL)

**All types are Zod-first in `shared/appTypes.ts`.** TypeScript types are auto-inferred via `z.infer<>`. Never define types manually.

```typescript
// shared/appTypes.ts — the ONLY place to define data shapes
export const taskSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    priority: prioritySchema,
    status: taskStatusSchema,
    // ... all fields
  })
  .strict();

// TS type is auto-derived — NEVER define manually
export type Task = z.infer<typeof taskSchema>;
```

**When adding a new field:**

1. Add it to the Zod schema in `shared/appTypes.ts` — that's it for types
2. The TS type updates automatically via `z.infer<>`
3. The save endpoint validates automatically via `appStateSchema.strict()`
4. Update `mdStorage.ts` serialization — **use `col()` safe accessor for new column**
5. Update the relevant page component
6. Add a round-trip test AND a backward-compat test
7. Run `pnpm preflight`

**Why `.strict()`?** The `appStateSchema` uses `.strict()` to reject unknown fields. This prevents silent data loss where new fields get stripped during save.

## Task Status State Machine

```
Active (Open) ↔ Monitored ↔ Done
     ↓                        ↑
     └────────────────────────┘
```

- **Active (Open):** Actionable tasks you can work on now
- **Monitored:** You've done your part, waiting on external action (e.g., waiting for NPC response). Excluded from daily planner actionable sections and matrix quadrants.
- **Done:** Completed tasks

Transitions: `TOGGLE_MONITOR` (active ↔ monitored), `TOGGLE_TASK` (active ↔ done). Monitored → done via `TOGGLE_TASK` reopens to active first. Every status transition sets `statusChangedAt` (ISO string) for tracking when the change happened.

### Today View Design

- **Action-oriented only:** Shows pinned tasks, due/overdue tasks, high priority, energy suggestions, reminders
- **Full actions on cards:** Task cards have monitor/complete/delete buttons (hover). Reminder cards have acknowledge/delete buttons.
- **No monitoring section:** Monitored tasks are excluded from all actionable sections (they live on the Tasks page under Monitored tab)
- **Actioned Today:** Collapsible section at bottom showing tasks completed or sent to monitoring today (uses `statusChangedAt` field)

## Context Filtering

- **All:** No filter, shows everything
- **Work:** Tasks with `category: 'work'`; reminders with `category: 'appointment'`
- **Personal:** Tasks with `category: 'personal' | 'health' | 'learning' | 'errands' | 'other' | null`; all reminders

Context is persisted in `preferences.activeContext` and serialized to the Markdown file. Filter utility lives in `client/src/lib/contextFilter.ts`. Constants `WORK_CATEGORIES` and `PERSONAL_CATEGORIES` are in `shared/appTypes.ts`.

## Data Flow Pattern

1. User action → React dispatch → `AppContext` reducer updates state
2. After state update → `saveState()` → `trpc.data.save.mutate(state)` (with retry)
3. Server validates state against `appStateSchema.strict()` (Zod)
4. Server checks `config.json` → writes to MD file or Google Sheets
5. If Obsidian auto-sync enabled → fires `syncToObsidian()` asynchronously
6. On app load → `trpc.data.load.query()` → dispatches `LOAD_STATE`

**Save reliability:** Client saves retry 3x with exponential backoff. On failure, error banner appears. Graceful SIGTERM shutdown ensures pending operations complete before Docker stop.

**V1.8.6 data safety:** Server uses write mutex (prevents concurrent writes) + atomic write-then-rename (prevents partial writes on crash). Client uses `dirtyRef` flag to prevent poll from overwriting unsaved changes. `loadedRef` race fixed — auto-save only starts after initial load completes. Corrupt files throw instead of returning null (prevents empty-state overwrite). All fallback states include all required fields.

## Styling Conventions

- **Design system:** Warm Scandinavian — cream, sand, terracotta, sage green palette
- **Typography:** DM Serif Display (headings), DM Sans (body) via Google Fonts
- **Custom CSS classes:** `bg-warm-sand`, `bg-warm-sage`, `bg-warm-terracotta`, `bg-warm-blue`, etc. defined in `client/src/index.css`
- **Component library:** shadcn/ui with Tailwind CSS 4
- **Animations:** Framer Motion for page transitions, card animations, layout animations
- **Responsive:** Mobile-first with hamburger menu below `lg` breakpoint (1024px)

## Testing

```bash
pnpm test                              # Run all 172+ tests
pnpm vitest run server/                # Run only server tests
pnpm vitest run server/schema-integrity # Run schema integrity tests
pnpm preflight                         # Full pre-push validation
```

Test files (16 files, 228+ tests):

- `server/schema-integrity.test.ts` — **Most important.** Schema drift detection + full persistence round-trips
- `server/v182-pintoday.test.ts` — Pin-to-today, unpin, completion clearing, energy suggestion dedup
- `server/v182-features.test.ts` — Edit reminder, inline matrix editing
- `server/v182-audit.test.ts` — Pomodoro null fields, linked tasks, reminders round-trip
- `server/v181-persistence.test.ts` — Save/load round-trips for V1.8.1 features
- `server/mdStorage.comprehensive.test.ts` — Core serialization round-trips
- `server/v18-features.test.ts` — Reading list, Obsidian sync, templates
- `server/v185-features.test.ts` — Context filtering (tasks + reminders), monitored status lifecycle, serialization, data integrity, combined scenarios
- `server/v186-bugfixes.test.ts` — Zod import validation, zero-safe parsing, corrupt file handling, default state completeness, atomic write consistency, backward compatibility
- `server/appTypes.test.ts` — Zod schema validation
- `server/sheetsStorage.test.ts` — Google Sheets API mocking
- `server/auth.logout.test.ts` — Auth cookie clearing

**When adding features, you MUST:**

1. Add a round-trip test for any new entity/field
2. Add a backward-compat test (old format data → new code)
3. Run `pnpm preflight` and ensure all checks pass

## Common Tasks

**Add a new field to an entity:**

1. Add to the Zod schema in `shared/appTypes.ts` (TS type auto-updates)
2. Update `stateToMarkdown` and `markdownToState` in `server/mdStorage.ts` — **use `col()` accessor**
3. Update the relevant page component
4. Add round-trip test + backward-compat test
5. Run `pnpm preflight`

**Add a new page:**

1. Create `client/src/pages/NewPage.tsx`
2. Add navigation item in `client/src/components/Sidebar.tsx`
3. Add page rendering in `client/src/pages/Home.tsx`
4. Update keyboard shortcut numbers if needed

**Add a new entity type:**

1. Define Zod schema in `shared/appTypes.ts`
2. Add to `appStateSchema`
3. Add serialization in `mdStorage.ts` (both directions, with `col()` accessors)
4. Add reducer actions in `AppContext.tsx`
5. Create page component
6. Add comprehensive round-trip tests + backward-compat tests

**Add a keyboard shortcut:**

1. Add handler in `Home.tsx` `handleKeyDown` callback
2. **MUST check `!isMod`** (metaKey || ctrlKey)
3. **MUST check `!isInput`** (not typing in text fields)
4. If using trigger counter prop, **MUST use `useRef` to skip initial mount**
5. Update keyboard shortcuts table

## Keyboard Shortcuts

| Key          | Action              | Context              | Modifier Check |
| ------------ | ------------------- | -------------------- | -------------- |
| N            | New task dialog     | Tasks page           | !isMod         |
| R            | New reminder dialog | Tasks/Reminders page | !isMod         |
| /            | Focus search bar    | Tasks page           | !isMod         |
| F            | Enter focus mode    | Any page             | !isMod         |
| Esc          | Exit focus mode     | Focus mode           | N/A            |
| 1-9          | Switch pages        | Global               | N/A            |
| Ctrl+Z       | Undo                | Global               | N/A            |
| Ctrl+Shift+Z | Redo                | Global               | N/A            |

## Ports

| Port | Purpose                     |
| ---- | --------------------------- |
| 1992 | Main app                    |
| 1993 | Reserved (future WebSocket) |
| 1994 | Reserved (future admin)     |

## Environment Variables

The app runs without any required env vars for basic functionality. For self-hosted Docker:

```
PORT=1992
DATA_DIR=/app/data
NODE_ENV=production
SKIP_AUTH=true          # Bypass OAuth for self-hosted
JWT_SECRET=any-string   # Required but value doesn't matter with SKIP_AUTH
```

## CI/CD

GitHub Actions CI (`.github/workflows/ci.yml`):

- Triggers on push to `main` and version tags (`v*`)
- Test job: `pnpm install → tsc --noEmit → pnpm test`
- Docker job: builds multi-arch (amd64 + arm64), pushes to Docker Hub (`islamdiaa/focus-assistant`) + GHCR
- Semver tags on version tags (e.g., `v1.8.3` → `1.8.3` + `1.8` + `latest`)

## Pre-Push Checklist

Run `pnpm preflight` before every push. It automates:

1. Version consistency across 4 files
2. TypeScript compilation
3. All vitest tests
4. Env var guards in index.html
5. Keyboard shortcut modifier checks
6. Schema backward-compat (col() accessors)
7. Save error handling (retry mechanism)
