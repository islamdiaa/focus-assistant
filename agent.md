# AGENT.md — AI Agent Guide for FocusAssist

This file provides context for AI coding agents (Cursor, Copilot, Windsurf, Devin, Cline, Aider, etc.) working on this codebase.

## What Is This Project?

FocusAssist is a personal productivity web app with these features:

1. **Today** — Daily planner with reminders (overdue/today/upcoming), due tasks, energy-based suggestions, motivational quotes.
2. **Tasks** — Create, edit, delete, filter, and sort tasks with priority, category, energy level, due dates, subtasks, and recurrence (daily/weekly/monthly/quarterly/weekdays).
3. **Focus Timer** — Multiple Pomodoro timers with configurable durations, circular progress, and multi-task/subtask linking.
4. **Eisenhower Matrix** — Drag tasks into four quadrants (Do First, Schedule, Delegate, Eliminate).
5. **Stats** — Daily streak tracking, completed tasks, focus minutes, weekly charts, all-time statistics.
6. **Read Later** — Pocket-style read-later list with tags, status (unread/reading/read), and notes.
7. **Reminders** — Birthdays, appointments, events with optional time-of-day, yearly/monthly/weekly recurrence, and acknowledge flow.
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
- **Tests:** Vitest (104+ tests across 11 files)
- **CI/CD:** GitHub Actions → Docker Hub + GHCR (multi-arch: amd64 + arm64)
- **Deployment:** Docker (single container, port 1992) on Unraid with Watchtower auto-updates

## Critical Constraints

1. **App data does NOT use the database.** The MySQL database (via Drizzle ORM) is only for the Manus OAuth `users` table. All app data is stored in `data/focus-assist-data.md` or Google Sheets.

2. **Zod-first type system.** ALL data types are defined as Zod schemas in `shared/appTypes.ts`. TypeScript types are auto-inferred via `z.infer<>`. **NEVER define types manually.** The save endpoint uses `.strict()` to reject unknown fields — this prevents silent data loss.

3. **`client/src/lib/types.ts` is a re-export file only.** It re-exports from `shared/appTypes.ts`. Do NOT add type definitions there.

4. **Do not edit `server/_core/`** — Framework plumbing (OAuth, Vite dev server bridge, tRPC initialization). Treat as a black box.

5. **Do not edit `client/src/components/ui/`** — shadcn/ui primitives. Customize via props and composition.

6. **The MD storage format must be backward-compatible** — If you add fields, make them optional and handle missing values gracefully in `markdownToState()`.

7. **Pipe characters (`|`) in data must be escaped** — The MD format uses Markdown tables. The `escapeField()` / `unescapeField()` functions in `mdStorage.ts` handle this.

## Project Structure

```
client/src/
  contexts/AppContext.tsx   ← Global state (useReducer + Context)
  lib/sheets.ts             ← Client API bridge (calls tRPC)
  lib/types.ts              ← Re-exports from shared/appTypes.ts (DO NOT add types here)
  pages/                    ← All page components (12 pages)
  components/Sidebar.tsx    ← Navigation sidebar

server/
  dataRouter.ts             ← tRPC procedures: load, save, getConfig, setConfig (imports schemas from shared)
  mdStorage.ts              ← Markdown ↔ AppState serializer
  obsidianSync.ts           ← Obsidian vault markdown export
  sheetsStorage.ts          ← Google Sheets API backend
  storageConfig.ts          ← Storage mode config manager
  routers.ts                ← Root tRPC router
  *.test.ts                 ← 11 test files, 104+ tests

shared/
  appTypes.ts               ← SINGLE SOURCE OF TRUTH: Zod schemas → inferred TS types
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

## Development Commands

```bash
pnpm dev        # Dev server with HMR (port 3000 in dev)
pnpm build      # Production build
pnpm test       # Run vitest tests (104+ tests)
pnpm db:push    # Database migrations (only for users table)
```

## How to Add a New Feature

### Adding a new field to an existing entity (e.g., adding "tags" to tasks):

1. `shared/appTypes.ts` — Add to the Zod schema: `tags: z.array(z.string()).optional()` — TS type auto-updates
2. `server/mdStorage.ts` — Update `stateToMarkdown()` table headers and row serialization; update `markdownToState()` parsing
3. `client/src/pages/TasksPage.tsx` — Add UI for the field in the create/edit forms and card display
4. `server/schema-integrity.test.ts` — Add round-trip test for the new field
5. Run `pnpm test` to verify all 104+ tests pass

**DO NOT:**
- Define types manually in `client/src/lib/types.ts`
- Add a separate Zod schema in `server/dataRouter.ts`
- Skip the round-trip test

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

## Design System

The UI follows a "Warm Scandinavian" design language:

- **Fonts:** DM Serif Display (headings), DM Sans (body)
- **Colors:** Cream background, sage green accents, terracotta for urgency, warm blue for info
- **Custom classes:** `bg-warm-sand`, `bg-warm-sage`, `bg-warm-terracotta`, `bg-warm-blue`, `text-warm-charcoal` (defined in `client/src/index.css`)
- **Cards:** Rounded corners (2xl), subtle borders, paper-like texture
- **Animations:** Framer Motion for page transitions, card animations, layout animations
- **Responsive:** Sidebar collapses to hamburger menu below 1024px

## Keyboard Shortcuts

| Key | Action | Context |
|-----|--------|---------|
| N | New task dialog | Tasks page |
| R | New reminder dialog | Reminders page |
| / | Focus search bar | Tasks page |
| F | Enter focus mode | Any page |
| Esc | Exit focus mode | Focus mode |

## Ports

| Port | Use |
|------|-----|
| 1992 | Main application |
| 1993 | Reserved (future) |
| 1994 | Reserved (future) |

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

Before submitting changes:

- [ ] `pnpm test` passes (all 104+ vitest tests)
- [ ] `npx tsc --noEmit` passes (no TypeScript errors)
- [ ] New server logic has corresponding test cases in `schema-integrity.test.ts`
- [ ] MD storage round-trips correctly (serialize → deserialize → same data)
- [ ] UI works on both desktop and mobile viewports
- [ ] `CHANGELOG.md` updated with all changes
- [ ] `architecture.md`, `claude.md`, `agent.md` updated if architecture changed

## CI/CD

GitHub Actions CI (`.github/workflows/ci.yml`):
- Triggers on push to `main` and version tags (`v*`)
- Test job: `pnpm install → tsc --noEmit → pnpm test`
- Docker job: builds multi-arch (amd64 + arm64), pushes to Docker Hub (`islamdiaa/focus-assistant`) + GHCR
- Semver tags on version tags (e.g., `v1.8.1` → `1.8.1` + `1.8` + `latest`)
