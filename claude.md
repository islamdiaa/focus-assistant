# CLAUDE.md — Project Guide for Claude

This file helps Claude (Anthropic's AI assistant) navigate and contribute to the FocusAssist codebase effectively.

## Project Summary

FocusAssist is a full-stack productivity app (React 19 + Express 4 + tRPC 11) designed for ADHD-friendly task management. It runs as a single Docker container. Data is stored as a local Markdown file (`data/focus-assist-data.md`) by default, with optional Google Sheets sync and Obsidian vault export.

## Quick Start (Development)

```bash
pnpm install
pnpm dev          # Starts Express + Vite dev server on port 3000
pnpm test         # Runs vitest (104+ tests)
pnpm build        # Production build (Vite + esbuild)
pnpm db:push      # Drizzle schema migrations
```

## Architecture at a Glance

```
Client (React SPA)  ──tRPC──►  Server (Express)  ──►  Storage (MD file or Google Sheets)
                                                  ──►  Obsidian Vault Sync (optional)
```

- **No database for app data.** MySQL/Drizzle is only for the Manus OAuth user table.
- **All app data** (tasks, pomodoros, settings, stats, reminders, reading list, templates) flows through `server/dataRouter.ts`.
- **Storage backends** are swappable via `data/config.json` (`mode: "file"` or `mode: "sheets"`).

## Key Files to Know

| File | What It Does |
|------|-------------|
| `shared/appTypes.ts` | **SINGLE SOURCE OF TRUTH** — Zod schemas → inferred TS types. All types defined here. |
| `server/dataRouter.ts` | tRPC router with `load`, `save`, `getConfig`, `setConfig` procedures. Imports schemas from shared. |
| `server/mdStorage.ts` | Serializes/deserializes `AppState` ↔ Markdown tables |
| `server/obsidianSync.ts` | Writes Obsidian-compatible markdown to configured vault path |
| `server/sheetsStorage.ts` | Google Sheets API v4 read/write |
| `server/storageConfig.ts` | Reads/writes `data/config.json` for storage mode |
| `client/src/contexts/AppContext.tsx` | React Context + useReducer — the global state store |
| `client/src/lib/sheets.ts` | Client-side API bridge (calls tRPC endpoints) |
| `client/src/lib/types.ts` | Re-exports from `shared/appTypes.ts` (do not add types here) |
| `client/src/pages/Home.tsx` | Main layout shell (sidebar + header + page content) |
| `client/src/pages/DailyPlannerPage.tsx` | Today view: reminders (overdue/today/upcoming), due tasks, energy suggestions |
| `client/src/pages/TasksPage.tsx` | Tasks CRUD with filters, sort, inline edit, recurrence (incl. quarterly) |
| `client/src/pages/TimerPage.tsx` | Pomodoro timers with multi-task/subtask linking |
| `client/src/pages/RemindersPage.tsx` | Birthdays, appointments, events with optional time-of-day |
| `client/src/pages/ReadLaterPage.tsx` | Read-later pocket with tags, status, notes |
| `client/src/pages/MatrixPage.tsx` | Eisenhower Matrix with drag-and-drop |
| `client/src/pages/StatsPage.tsx` | Statistics dashboard with charts |
| `client/src/pages/TemplatesPage.tsx` | Reusable task templates |
| `client/src/pages/WeeklyReviewPage.tsx` | End-of-week summary and planning |
| `client/src/pages/FocusModePage.tsx` | Distraction-free focus view |
| `client/src/pages/SettingsPage.tsx` | Timer presets, storage config, Obsidian, about section |

## Files You Should NOT Edit

- `server/_core/*` — Framework plumbing (OAuth, Vite bridge, context). Treat as read-only.
- `client/src/components/ui/*` — shadcn/ui primitives. Customize via props, not source edits.
- `drizzle/schema.ts` — Only the `users` table exists. App data does NOT use the database.

## Type System (CRITICAL)

**All types are Zod-first in `shared/appTypes.ts`.** TypeScript types are auto-inferred via `z.infer<>`. Never define types manually.

```typescript
// shared/appTypes.ts — the ONLY place to define data shapes
export const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  priority: prioritySchema,
  status: taskStatusSchema,
  // ... all fields
}).strict();

// TS type is auto-derived — NEVER define manually
export type Task = z.infer<typeof taskSchema>;
```

**When adding a new field:**
1. Add it to the Zod schema in `shared/appTypes.ts` — that's it for types
2. The TS type updates automatically via `z.infer<>`
3. The save endpoint validates automatically via `appStateSchema.strict()`
4. Update `mdStorage.ts` serialization (both `stateToMarkdown` and `markdownToState`)
5. Update the relevant page component
6. Add a round-trip test in `server/schema-integrity.test.ts`

**Why `.strict()`?** The `appStateSchema` uses `.strict()` to reject unknown fields. This prevents silent data loss where new fields get stripped during save. If you add a field to the schema, it will be validated. If you forget, the save will fail loudly.

**`client/src/lib/types.ts` is a re-export file only.** It re-exports everything from `shared/appTypes.ts`. Do NOT add type definitions there.

## Data Flow Pattern

1. User action → React dispatch → `AppContext` reducer updates state
2. After state update → `saveState()` → `trpc.data.save.mutate(state)`
3. Server validates state against `appStateSchema.strict()` (Zod)
4. Server checks `config.json` → writes to MD file or Google Sheets
5. If Obsidian auto-sync enabled → fires `syncToObsidian()` asynchronously
6. On app load → `trpc.data.load.query()` → dispatches `LOAD_STATE`

## Styling Conventions

- **Design system:** Warm Scandinavian — cream, sand, terracotta, sage green palette
- **Typography:** DM Serif Display (headings), DM Sans (body) via Google Fonts
- **Custom CSS classes:** `bg-warm-sand`, `bg-warm-sage`, `bg-warm-terracotta`, `bg-warm-blue`, etc. defined in `client/src/index.css`
- **Component library:** shadcn/ui with Tailwind CSS 4
- **Animations:** Framer Motion for page transitions, card animations, layout animations
- **Responsive:** Mobile-first with hamburger menu below `lg` breakpoint (1024px)

## Testing

```bash
pnpm test                              # Run all 104+ tests
pnpm vitest run server/                # Run only server tests
pnpm vitest run server/schema-integrity # Run schema integrity tests
```

Test files (11 files, 104+ tests):
- `server/schema-integrity.test.ts` — **Most important.** Schema drift detection + full persistence round-trips for all entity types
- `server/v181-persistence.test.ts` — Save/load round-trips for V1.8.1 features
- `server/mdStorage.comprehensive.test.ts` — Core serialization round-trips
- `server/v18-features.test.ts` — Reading list, Obsidian sync, templates
- `server/appTypes.test.ts` — Zod schema validation
- `server/sheetsStorage.test.ts` — Google Sheets API mocking
- `server/auth.logout.test.ts` — Auth cookie clearing

**When adding features, you MUST:**
1. Add a round-trip test in `schema-integrity.test.ts` for any new entity/field
2. Run `pnpm test` and ensure all tests pass
3. Run `npx tsc --noEmit` and ensure no type errors

## Changelog Maintenance

**IMPORTANT:** Every time you make changes to this project, you MUST update `CHANGELOG.md`.

1. Add your changes under the current version section or `[Unreleased]`
2. Use the correct category: `Added`, `Changed`, `Fixed`, `Removed`, `Deprecated`, `Security`
3. Write concise but specific descriptions of what changed
4. When a release is cut, move items to a new versioned section with the date
5. Never delete existing changelog entries

## Common Tasks

**Add a new field to an entity:**
1. Add to the Zod schema in `shared/appTypes.ts` (TS type auto-updates)
2. Update `stateToMarkdown` and `markdownToState` in `server/mdStorage.ts`
3. Update the relevant page component
4. Add round-trip test in `server/schema-integrity.test.ts`
5. Run `pnpm test` — all tests must pass

**Add a new page:**
1. Create `client/src/pages/NewPage.tsx`
2. Add navigation item in `client/src/components/Sidebar.tsx`
3. Add page rendering in `client/src/pages/Home.tsx`
4. Update keyboard shortcut numbers if needed

**Add a new entity type:**
1. Define Zod schema in `shared/appTypes.ts`
2. Add to `appStateSchema`
3. Add serialization in `mdStorage.ts` (both directions)
4. Add reducer actions in `AppContext.tsx`
5. Create page component
6. Add comprehensive round-trip tests

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

## CI/CD

GitHub Actions CI (`.github/workflows/ci.yml`):
- Triggers on push to `main` and version tags (`v*`)
- Test job: `pnpm install → tsc --noEmit → pnpm test`
- Docker job: builds multi-arch (amd64 + arm64), pushes to Docker Hub (`islamdiaa/focus-assistant`) + GHCR
- Semver tags on version tags (e.g., `v1.8.1` → `1.8.1` + `1.8` + `latest`)
