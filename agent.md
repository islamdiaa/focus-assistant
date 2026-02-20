# AGENT.md — AI Agent Guide for FocusAssist

This file provides context for AI coding agents (Cursor, Copilot, Windsurf, Devin, Cline, Aider, etc.) working on this codebase.

## What Is This Project?

FocusAssist is a personal productivity web app with these features:

1. **Today** — Daily planner with reminders (overdue/today/upcoming), due tasks, pinned tasks ("My Today"), energy-based suggestions, monitoring section, motivational quotes.
2. **Tasks** — Create, edit, delete, filter, and sort tasks with priority, category, energy level, due dates, subtasks, and recurrence (daily/weekly/monthly/quarterly/weekdays). Filter tabs: All/Open/Monitored/Done. Monitor toggle (Eye icon) for "waiting-on" tasks. Includes reminder creation via R shortcut.
3. **Focus Timer** — Multiple Pomodoro timers with configurable durations, circular progress, and multi-task/subtask linking.
4. **Eisenhower Matrix** — Drag tasks into four quadrants (Do First, Schedule, Delegate, Eliminate). Inline task editing via pencil icon.
5. **Stats** — Daily streak tracking, completed tasks, focus minutes, weekly charts, all-time statistics.
6. **Read Later** — Pocket-style read-later list with tags, status (unread/reading/read), and notes.
7. **Reminders** — Birthdays, appointments, events with optional time-of-day, yearly/quarterly/monthly/weekly recurrence, acknowledge/undo-ack flow, and edit via pencil icon.
8. **Templates** — Reusable task sets for recurring workflows.
9. **Weekly Review** — End-of-week summary with reflection prompts.
10. **Focus Mode** — Distraction-free view showing only the current task.
11. **Settings** — Timer presets, storage backend toggle, Obsidian vault sync, about section.

## Stack

- **Frontend:** React 19 + TypeScript + Tailwind CSS 4 + shadcn/ui + Framer Motion
- **Backend:** Express 4 + tRPC 11 (end-to-end type safety)
- **Type System:** Zod schemas → inferred TypeScript types (single source of truth)
- **Storage:** Local Markdown file (default) or Google Sheets (optional) + Obsidian vault sync
- **Build:** Vite 7 (client) + esbuild (server)
- **Tests:** Vitest (172+ tests across 15 files)
- **CI/CD:** GitHub Actions → Docker Hub + GHCR (multi-arch: amd64 + arm64)
- **Deployment:** Docker (single container, port 1992) on Unraid with Watchtower auto-updates
- **Preflight:** `pnpm preflight` — automated pre-push checks (see below)

## Critical Constraints

1. **App data does NOT use the database.** The MySQL database (via Drizzle ORM) is only for the Manus OAuth `users` table. All app data is stored in `data/focus-assist-data.md` or Google Sheets.

2. **Zod-first type system.** ALL data types are defined as Zod schemas in `shared/appTypes.ts`. TypeScript types are auto-inferred via `z.infer<>`. **NEVER define types manually.** The save endpoint uses `.strict()` to reject unknown fields — this prevents silent data loss.

3. **`client/src/lib/types.ts` is a re-export file only.** It re-exports from `shared/appTypes.ts`. Do NOT add type definitions there.

4. **Do not edit `server/_core/`** — Framework plumbing (OAuth, Vite dev server bridge, tRPC initialization). Treat as a black box. Exception: `SKIP_AUTH` bypass in `context.ts` for self-hosted mode.

5. **Do not edit `client/src/components/ui/`** — shadcn/ui primitives. Customize via props and composition.

6. **The MD storage format must be backward-compatible** — If you add fields, make them optional and handle missing values gracefully in `markdownToState()`. Use the `col()` safe accessor pattern (see mdStorage.ts).

7. **Pipe characters (`|`) in data must be escaped** — The MD format uses Markdown tables. The `escapeField()` / `unescapeField()` functions in `mdStorage.ts` handle this.

## Hard-Won Rules (from V1.8.x bugs)

These rules exist because we hit real bugs. **Do not skip them.**

### 1. Fail Loud, Recover Gracefully
- Save operations MUST show visible success/failure in the UI (see `sheets.ts` retry logic + error banner in `Home.tsx`)
- NEVER catch errors and continue silently — if a save fails, the user must know
- Client-side saves retry 3x with exponential backoff before showing error

### 2. Backward-Compatible Deserialization
- Every new column in mdStorage gets a safe `col(index)` accessor that returns `''` for missing columns
- ALWAYS add a round-trip test that deserializes OLD format data (fewer columns) with the NEW code
- Test both: old data → new code, and new data → new code

### 3. Version Bump Atomically
- ALL 4 files must be updated together in one commit:
  - `package.json` (version field)
  - `client/src/pages/SettingsPage.tsx` (display version)
  - `Dockerfile` (image version label)
  - `CHANGELOG.md` (new version section)
- Run `pnpm preflight` to verify consistency before pushing

### 4. Keyboard Shortcuts Must Check Modifier Keys
- Every single-key shortcut (F, N, R, /) MUST check `!isMod` where `isMod = e.metaKey || e.ctrlKey`
- Without this, Cmd+R (refresh), Cmd+F (find), Cmd+N (new window) get intercepted
- The preflight script checks for this automatically

### 5. Trigger Props Must Skip Initial Mount
- When passing a counter prop (e.g., `reminderTrigger`) to trigger an action on increment:
  - Use `useRef(initialValue)` to track the previous value
  - Only fire the action when `current !== prev`, then update the ref
  - Without this, navigating to a page with a stale counter > 0 auto-opens dialogs

### 6. Environment Variables in HTML Must Be Guarded
- `%VITE_*%` references in `client/index.html` must be wrapped in conditionals
- Unset vars become literal strings like `%VITE_ANALYTICS_ENDPOINT%`, causing URIError in self-hosted

### 7. Docker Builds: Test Before Push
- `--ignore-scripts` in the builder stage breaks esbuild (no platform binary)
- Only use `--ignore-scripts` in the production stage (no build tools needed)
- Always test with `docker build .` before pushing Dockerfile changes

### 8. Graceful Shutdown
- The server handles SIGTERM/SIGINT for clean Docker container stops
- Dockerfile includes `STOPSIGNAL SIGTERM`

## Project Structure

```
client/src/
  contexts/AppContext.tsx   ← Global state (useReducer + Context)
  lib/sheets.ts             ← Client API bridge (calls tRPC, retry logic, error reporting)
  lib/types.ts              ← Re-exports from shared/appTypes.ts (DO NOT add types here)
  lib/contextFilter.ts      ← Context filter utility (Work/Personal/All)
  pages/                    ← All page components (12 pages)
  components/Sidebar.tsx    ← Navigation sidebar (includes context switcher)

server/
  dataRouter.ts             ← tRPC procedures: load, save, getConfig, setConfig
  mdStorage.ts              ← Markdown ↔ AppState serializer (col() safe accessor)
  obsidianSync.ts           ← Obsidian vault markdown export
  sheetsStorage.ts          ← Google Sheets API backend
  storageConfig.ts          ← Storage mode config manager
  routers.ts                ← Root tRPC router
  *.test.ts                 ← 15 test files, 172+ tests

shared/
  appTypes.ts               ← SINGLE SOURCE OF TRUTH: Zod schemas → inferred TS types

scripts/
  preflight.mjs             ← Pre-push checks (run via `pnpm preflight`)
```

## How Data Flows

```
User Action → React Dispatch → AppContext Reducer → saveState()
  → trpc.data.save → Zod .strict() validation → dataRouter
  → mdStorage.saveToMdFile() → writes data/focus-assist-data.md
  → (optional) obsidianSync.syncToObsidian() → writes to Obsidian vault
```

```
App Load → trpc.data.load → dataRouter → mdStorage.loadFromMdFile()
  → reads data/focus-assist-data.md → LOAD_STATE dispatch → UI renders
```

**Save reliability:** Client saves retry 3x with exponential backoff. On failure, a red error banner with Retry button appears in the header. Save status (saving/saved/error) is tracked in AppContext and displayed in the UI.

## Development Commands

```bash
pnpm dev        # Dev server with HMR (port 3000 in dev)
pnpm build      # Production build
pnpm test       # Run vitest tests (172+ tests)
pnpm preflight  # Pre-push checks (MUST pass before every push)
pnpm db:push    # Database migrations (only for users table)
```

## Pre-Push Checklist (Automated)

Run `pnpm preflight` before every push. It checks:

1. **Version consistency** — package.json, SettingsPage, Dockerfile, CHANGELOG all match
2. **TypeScript** — `tsc --noEmit` passes
3. **Tests** — All vitest tests pass
4. **Env var guards** — No unguarded `%VITE_*%` in index.html
5. **Keyboard shortcuts** — All single-key shortcuts check `!isMod`
6. **Schema backward compat** — mdStorage uses safe column accessors
7. **Save error handling** — sheets.ts has retry mechanism and error reporting

## How to Add a New Feature

### Adding a new field to an existing entity (e.g., adding "tags" to tasks):

1. `shared/appTypes.ts` — Add to the Zod schema: `tags: z.array(z.string()).optional()` — TS type auto-updates
2. `server/mdStorage.ts` — Update `stateToMarkdown()` table headers and row serialization; update `markdownToState()` parsing. **Use `col()` safe accessor for the new column index.**
3. `client/src/pages/TasksPage.tsx` — Add UI for the field in the create/edit forms and card display
4. `server/schema-integrity.test.ts` — Add round-trip test for the new field. **Also add a test that deserializes OLD format data (without the new column).**
5. Run `pnpm preflight` to verify everything

**DO NOT:**
- Define types manually in `client/src/lib/types.ts`
- Add a separate Zod schema in `server/dataRouter.ts`
- Skip the round-trip test
- Skip the backward-compat test
- Use hardcoded array indices without the `col()` accessor

### Adding a new page:

1. Create `client/src/pages/NewPage.tsx`
2. Add nav item in `client/src/components/Sidebar.tsx` (icon + label + page key)
3. Add rendering case in `client/src/pages/Home.tsx` (`activePage === 'newpage' && <NewPage />`)
4. If the page needs new data, add it to `appStateSchema` in `shared/appTypes.ts` and update the storage layer

### Adding a new entity type:

1. Define Zod schema in `shared/appTypes.ts`
2. Add to `appStateSchema` (with default value in `emptyState`)
3. Add serialization in `mdStorage.ts` (both `stateToMarkdown` and `markdownToState`)
4. Add reducer actions in `AppContext.tsx`
5. Create page component
6. Add comprehensive round-trip tests in `schema-integrity.test.ts`

### Adding keyboard shortcuts:

1. Add handler in `Home.tsx` `handleKeyDown` callback
2. **MUST check `!isMod`** to avoid intercepting browser shortcuts (Cmd+R, Cmd+F, etc.)
3. **MUST check `!isInput`** to avoid firing when typing in text fields
4. If using a trigger counter prop, **MUST use `useRef` to skip initial mount** (see Hard-Won Rule #5)
5. Update the keyboard shortcuts table below

## Design System

The UI follows a "Warm Scandinavian" design language:

- **Fonts:** DM Serif Display (headings), DM Sans (body)
- **Colors:** Cream background, sage green accents, terracotta for urgency, warm blue for info
- **Custom classes:** `bg-warm-sand`, `bg-warm-sage`, `bg-warm-terracotta`, `bg-warm-blue`, `text-warm-charcoal` (defined in `client/src/index.css`)
- **Cards:** Rounded corners (2xl), subtle borders, paper-like texture
- **Animations:** Framer Motion for page transitions, card animations, layout animations
- **Responsive:** Sidebar collapses to hamburger menu below 1024px

## Keyboard Shortcuts

| Key | Action | Context | Modifier Check |
|-----|--------|---------|----------------|
| N | New task dialog | Tasks page | !isMod |
| R | New reminder dialog | Tasks/Reminders page | !isMod |
| / | Focus search bar | Tasks page | !isMod |
| F | Enter focus mode | Any page | !isMod |
| Esc | Exit focus mode | Focus mode | N/A |

## Ports

| Port | Use |
|------|-----|
| 1992 | Main application |
| 1993 | Reserved (future) |
| 1994 | Reserved (future) |

## Self-Hosted Mode

When `SKIP_AUTH=true` (default in Dockerfile), the app bypasses Manus OAuth and injects a local admin user. This is for running on personal homeservers (e.g., Unraid) without Manus infrastructure.

Key env vars for self-hosted:
- `SKIP_AUTH=true` — bypass OAuth
- `JWT_SECRET` — set to any random string
- `DATABASE_URL` — only needed if using the users table

## Changelog Maintenance

**MANDATORY:** Every change to this project MUST be documented in `CHANGELOG.md`.

The changelog follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format.

**Rules:**
1. Add all changes under the current version section or `[Unreleased]`
2. Categorize changes: `Added`, `Changed`, `Fixed`, `Removed`, `Deprecated`, `Security`
3. Be specific — "Added dark mode toggle in Settings" not "Updated UI"
4. Never delete or modify existing changelog entries
5. When cutting a release, move `[Unreleased]` items to a new `[X.Y.Z] - YYYY-MM-DD` section

## Testing Checklist

Before submitting changes, run `pnpm preflight` which automates most of this:

- [ ] `pnpm preflight` passes (all 7 checks green)
- [ ] New server logic has corresponding test cases
- [ ] MD storage round-trips correctly (serialize → deserialize → same data)
- [ ] **Backward compat test:** old format data deserializes correctly with new code
- [ ] UI works on both desktop and mobile viewports
- [ ] `CHANGELOG.md` updated with all changes
- [ ] `architecture.md`, `claude.md`, `agent.md` updated if architecture changed
- [ ] Version bumped atomically in all 4 files

## CI/CD

GitHub Actions CI (`.github/workflows/ci.yml`):
- Triggers on push to `main` and version tags (`v*`)
- Test job: `pnpm install → tsc --noEmit → pnpm test`
- Docker job: builds multi-arch (amd64 + arm64), pushes to Docker Hub (`islamdiaa/focus-assistant`) + GHCR
- Semver tags on version tags (e.g., `v1.8.1` → `1.8.1` + `1.8` + `latest`)
