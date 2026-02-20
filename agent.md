# AGENT.md — AI Agent Guide for FocusAssist

This file provides context for AI coding agents (Cursor, Copilot, Windsurf, Devin, Cline, Aider, etc.) working on this codebase.

## What Is This Project?

FocusAssist is a personal productivity web app with five features:

1. **Tasks** — Create, edit, delete, filter, and sort tasks with priority, category, energy level, and due dates.
2. **Focus Timer** — Multiple Pomodoro timers with configurable durations and circular progress visualization.
3. **Eisenhower Matrix** — Drag tasks into four quadrants (Do First, Schedule, Delegate, Eliminate).
4. **Stats** — Daily streak tracking, completed tasks, focus minutes, weekly charts, all-time statistics.
5. **Settings** — Timer presets (Classic/Short/Deep/Gentle), custom sliders, storage backend toggle.

## Stack

- **Frontend:** React 19 + TypeScript + Tailwind CSS 4 + shadcn/ui
- **Backend:** Express 4 + tRPC 11 (end-to-end type safety)
- **Storage:** Local Markdown file (default) or Google Sheets (optional)
- **Build:** Vite 7 (client) + esbuild (server)
- **Tests:** Vitest
- **Deployment:** Docker (single container, port 1992)

## Critical Constraints

1. **App data does NOT use the database.** The MySQL database (via Drizzle ORM) is only for the Manus OAuth `users` table. All app data (tasks, pomodoros, settings, stats) is stored in `data/focus-assist-data.md` or Google Sheets.

2. **Do not edit `server/_core/`** — This directory contains framework plumbing (OAuth, Vite dev server bridge, tRPC initialization). Treat it as a black box.

3. **Do not edit `client/src/components/ui/`** — These are shadcn/ui primitives. Customize via props and composition, not by modifying source files.

4. **All types live in `shared/appTypes.ts`** — Both client and server import from here. Keep them in sync.

5. **The MD storage format must be backward-compatible** — If you add fields, make them optional and handle missing values gracefully in `markdownToState()`.

6. **Pipe characters (`|`) in data must be escaped** — The MD format uses Markdown tables. The `escapeField()` / `unescapeField()` functions in `mdStorage.ts` handle this. Always test with pipe characters in task titles.

## Project Structure

```
client/src/
  contexts/AppContext.tsx   ← Global state (useReducer + Context)
  lib/sheets.ts             ← Client API bridge (calls tRPC)
  lib/types.ts              ← Client-side types
  pages/                    ← All page components
  components/Sidebar.tsx    ← Navigation sidebar

server/
  dataRouter.ts             ← tRPC procedures: load, save, getConfig, setConfig
  mdStorage.ts              ← Markdown ↔ AppState serializer
  sheetsStorage.ts          ← Google Sheets API backend
  storageConfig.ts          ← Storage mode config manager
  routers.ts                ← Root tRPC router

shared/
  appTypes.ts               ← Shared types (Task, Pomodoro, AppState, etc.)
```

## How Data Flows

```
User Action → React Dispatch → AppContext Reducer → saveState()
  → trpc.data.save → dataRouter → mdStorage.saveToMdFile()
  → writes data/focus-assist-data.md
```

```
App Load → trpc.data.load → dataRouter → mdStorage.loadFromMdFile()
  → reads data/focus-assist-data.md → LOAD_STATE dispatch → UI renders
```

## Development Commands

```bash
pnpm dev        # Dev server with HMR (port 3000 in dev)
pnpm build      # Production build
pnpm test       # Run vitest tests
pnpm db:push    # Database migrations (only for users table)
```

## How to Add a New Feature

### Adding a new field to an existing entity (e.g., adding "tags" to tasks):

1. `shared/appTypes.ts` — Add `tags?: string[]` to `Task` interface
2. `server/dataRouter.ts` — Add to Zod schema: `tags: z.array(z.string()).optional()`
3. `server/mdStorage.ts` — Update `stateToMarkdown()` table headers and row serialization; update `markdownToState()` parsing
4. `client/src/pages/TasksPage.tsx` — Add UI for the field in the create/edit forms and card display
5. `server/mdStorage.test.ts` — Add test case for round-trip with the new field
6. Run `pnpm test` to verify

### Adding a new page:

1. Create `client/src/pages/NewPage.tsx`
2. Add nav item in `client/src/components/Sidebar.tsx` (icon + label + page key)
3. Add rendering case in `client/src/pages/Home.tsx` (`activePage === 'newpage' && <NewPage />`)
4. If the page needs new data, add it to `AppState` in `shared/appTypes.ts` and update the storage layer

### Adding a new tRPC endpoint:

1. Add procedure in `server/dataRouter.ts` or create a new router file
2. Register in `server/routers.ts`
3. Call from client via `trpc.routerName.procedureName.useQuery()` or `.useMutation()`

## Design System

The UI follows a "Warm Scandinavian" design language:

- **Fonts:** DM Serif Display (headings), DM Sans (body)
- **Colors:** Cream background, sage green accents, terracotta for urgency, warm blue for info
- **Custom classes:** `bg-warm-sand`, `bg-warm-sage`, `bg-warm-terracotta`, `bg-warm-blue`, `text-warm-charcoal` (defined in `client/src/index.css`)
- **Cards:** Rounded corners (2xl), subtle borders, paper-like texture
- **Responsive:** Sidebar collapses to hamburger menu below 1024px

## Ports

| Port | Use |
|------|-----|
| 1992 | Main application |
| 1993 | Reserved (future) |
| 1994 | Reserved (future) |

## Testing Checklist

Before submitting changes:

- [ ] `pnpm test` passes (all vitest tests)
- [ ] `npx tsc --noEmit` passes (no TypeScript errors)
- [ ] New server logic has corresponding test cases
- [ ] MD storage round-trips correctly (serialize → deserialize → same data)
- [ ] UI works on both desktop and mobile viewports
