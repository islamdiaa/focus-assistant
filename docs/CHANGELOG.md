# Changelog

All notable changes to FocusAssist are documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [1.8.8] - 2026-02-23

### Added

- **Thoughts Drawer** — Always-accessible slide-out panel for capturing ideas without losing context. Triggered by floating lightbulb button (bottom-right) or keyboard shortcut `I`. Thoughts can be upgraded to tasks ("Make Task") or reminders ("Make Reminder" with date picker dialog). Persisted as `## Scratch Pad` section in the data file. Hidden during Focus Mode.
- **"Make Reminder" from Thoughts** — Converts a thought into a reminder with a date picker dialog. Pre-fills the thought text as the reminder title.
- Sidebar "Thoughts" Quick Action button (next to Focus Mode)

### Changed

- Renamed "Scratch Pad" to "Thoughts" throughout the UI (drawer title, sidebar, button tooltip)
- Icon changed from StickyNote to Lightbulb for better semantic meaning

---

## [Unreleased]

### Fixed

- **Touch/Mobile: MatrixPage drag-drop** — Tasks in quadrants now have "Move to..." select dropdown on mobile (previously only unassigned tasks had this). Added "Unassigned" option for moving tasks back out of quadrants. Subtitle text adapts for touch ("Use Move to..." instead of "Drag tasks").
- **Touch/Mobile: Subtask rename** — Added pencil edit button to subtasks for tap-friendly editing. `onDoubleClick` still works on desktop. Also fixed empty subtask title validation (M5 from audit).
- **Touch/Mobile: Small touch targets** — Increased hit areas for subtask checkboxes (16px→20px), subtask delete buttons (16px→24px), MatrixPage edit pencil (20px→28px), ReadLaterPage tag remove (12px→22px), tag confirm/cancel (14px→28px), FocusMode/TimerPage subtask checkboxes (14px→20px), DailyPlanner action button spacing (gap-0.5→gap-1).
- **Touch/Mobile: Keyboard shortcut hints** — Hidden on touch devices via `@media (hover: none)` CSS class. Affects TasksPage shortcuts footer, RemindersPage "Press R" hint. Search placeholder no longer mentions "press / to focus".
- **Touch/Mobile: WeeklyReview grid** — Daily breakdown grid collapses from 7 columns to 4 on small screens (below 640px).

### Added

- `keyboard-hint` CSS utility class — hides elements on touch devices using `@media (hover: none)`
- Mobile Playwright E2E tests (`e2e/mobile-touch.spec.ts`) — 7 tests covering mobile viewport behavior
- `mobile-chromium` Playwright project using iPhone 13 device emulation

---

## [1.8.7] - 2026-02-21

### Fixed

- **H1: AudioContext leak** — `ctx.close()` now called after both tones finish playing in `playCompletionSound()`. Prevents browser from running out of AudioContext instances after ~6 pomodoro completions.
- **H7: Duplicate recurrences on rapid toggle** — added dedup check before spawning recurrence child. If an active child with the same `recurrenceParentId` already exists, no duplicate is created. Prevents accumulating duplicate recurring tasks from done→active→done toggling.
- **H9: COMPLETE_POMODORO elapsed vs planned** — `focusMinutes` now uses `Math.round(pom.elapsed / 60)` instead of `pom.duration`. Stats reflect actual focus time, not planned duration. Partial sessions and early stops are recorded accurately.

### Changed

- **Code-split with React.lazy** — 8 less-frequently-used pages (Timer, Matrix, Stats, Settings, Templates, WeeklyReview, ReadLater, FocusMode) are now lazy-loaded with Suspense. Reduces initial JS bundle size significantly. Frequently-used pages (DailyPlanner, Tasks, Reminders) remain eagerly loaded.
- **Playwright E2E in CI** — `pnpm test:e2e` step added to GitHub Actions workflow. Runs after unit tests with Chromium in headless mode.
- **278 unit tests + 20 E2E tests** — 24 new tests covering H7 dedup logic, H9 elapsed time calculations, serialization of recurrence/elapsed fields, and code-split module verification.

---

## [1.8.6] - 2026-02-21

### Fixed

- **C1: Auto-save race condition** — `loadedRef.current` now set inside `.then()` after `LOAD_STATE` dispatch completes, preventing empty state from being saved before data loads. Added re-entry guard to prevent double-calling `loadState`.
- **C2: Poll overwrites unsaved changes** — added `dirtyRef` flag that is set on user actions and cleared after save completes. Polling skips state replacement while dirty, preventing data loss during concurrent edits.
- **C3: JSON import validation** — imported data now validated through Zod `appStateSchema.safeParse()` before acceptance. Invalid JSON imports are rejected with a descriptive error instead of silently corrupting state.
- **C4: Write mutex + atomic saves** — `saveToMdFile` now uses a mutex to prevent concurrent writes and atomic write-then-rename (`fs.writeFile` to `.tmp`, then `fs.rename`) to prevent partial writes on crash.
- **C6: Zero-safe integer parsing** — replaced all `parseInt(val) || default` patterns with `safeParseInt(val, fallback)` across server mdStorage, client md-storage, sheetsStorage, TasksPage, and TimerPage. Zero values (e.g., `focusDuration: 0`, `elapsed: 0`) are now preserved correctly instead of falling back to defaults.
- **H5: Corrupt file handling** — `loadFromMdFile` now throws on unreadable/corrupt files instead of silently returning `null`. This prevents the caller from treating corrupt data as "no data" and overwriting with empty state.
- **H8: Missing default fields** — added `reminders: []` to all fallback/default states (AppContext `initialState`, `LOAD_STATE` handler, `loadLocal()` in sheets.ts, `markdownToState` in mdStorage). Also added missing `templates`, `preferences`, `readingList` defaults where absent.

### Changed

- **Backward compatible** — all fixes work with pre-V1.8.5 data. Old markdown files without `statusChangedAt`, `reminders`, or `preferences` sections load correctly with safe defaults.
- **254 unit tests + 20 E2E tests** covering Zod validation, zero-safe parsing, corrupt file handling, default state completeness, serialization consistency, backward compatibility, context filtering edge cases, monitored task lifecycle, and all critical UI flows.
- **Playwright E2E tests** added for all critical flows: app loading, page navigation, task CRUD, context filtering, data persistence, responsive layout, and error handling.

### Added

- **Edit button on Today task cards** — inline edit (pencil icon) now available on Today view task cards, matching Tasks page functionality.
- **Playwright E2E test suite** — `e2e/critical-flows.spec.ts` with 20 tests covering all critical user flows.

---

## [1.8.5] - 2026-02-20

### Added

- **Work/Personal context filtering** — global toggle in sidebar (All/Work/Personal) filters tasks, reminders, and stats by context. Work = `work` category tasks + `appointment` reminders. Personal = everything else. Persisted in preferences.
- **Monitored task status** — new `monitored` state for tasks where you've done your part but are waiting on external action (e.g., waiting for NPC response on a ticket appeal). Clean state machine: Active ↔ Monitored ↔ Done.
- **Monitor toggle on task cards** — Eye icon button to send tasks to monitoring; EyeOff to reactivate. Visual distinction with dashed border and muted opacity.
- **Today view overhaul** — full task actions on Today cards (monitor/complete/delete), full reminder actions (acknowledge/delete), removed monitoring section for focus-only view.
- **Actioned Today section** — collapsible section at bottom of Today view showing tasks completed or sent to monitoring today. Uses new `statusChangedAt` field.
- **`statusChangedAt` field** — tracks when a task's status last changed (ISO string). Set on TOGGLE_TASK and TOGGLE_MONITOR actions. Serialized to Markdown.
- **Task filter tabs updated** — Tasks page now shows All/Open/Monitored/Done tabs with counts.
- **Monitored tasks excluded from Matrix** — only active tasks appear in Eisenhower quadrants.
- **Stats page context awareness** — task status summary shows open/monitored/done counts, filtered by context.
- **activeContext preference persistence** — context filter choice serialized to Markdown file and restored on load.
- **71 new tests** — comprehensive test suite for context filtering (tasks + reminders), monitored status lifecycle, statusChangedAt, Actioned Today logic, Today view exclusion rules, serialization round-trips, data integrity, combined scenarios, and stress tests (193+ total).

### Changed

- **Data integrity check** — `checkDataIntegrity()` now accepts `monitored` as a valid task status alongside `active` and `done`.
- **Preferences serialization** — `activeContext` field added to Markdown preferences section.
- **Task serialization** — `statusChangedAt` column added to tasks Markdown table (column 19). Backward compatible with older formats.
- **Husky git hooks** — pre-push runs `pnpm preflight`, pre-commit runs `pnpm format:check`.
- **CI workflow** — replaced separate tsc + test steps with single `pnpm preflight` command.
- **SettingsPage version** — now reads version from package.json dynamically instead of hardcoding.

---

## [1.8.4] - 2026-02-20

### Fixed

- **Silent save failures causing data loss** — save errors were silently swallowed; now tracked with up to 3 retries, exponential backoff, and a red error banner in the UI with a Retry button. Data is always cached in localStorage as a safety net.
- **Column format resilience** — task deserialization now safely handles old markdown formats with fewer columns (15-col V1.8.0, 17-col V1.8.1) without crashing or losing data
- **Analytics URIError on self-hosted** — analytics script tag now only loads when `VITE_ANALYTICS_ENDPOINT` env var is actually set, preventing `URIError: URI malformed` on self-hosted deployments

### Added

- **Save status indicator** — red error banner appears when saves fail, with error details and a manual Retry button; clears automatically when saves recover
- **Graceful shutdown** — server now handles SIGTERM/SIGINT signals, closing HTTP connections cleanly before exit; Dockerfile includes `STOPSIGNAL SIGTERM`
- **Save retry with backoff** — failed saves retry up to 3 times with increasing delays (2s, 4s, 6s) before reporting failure

---

## [1.8.3] - 2026-02-20

### Fixed

- **Focus Mode ghost overlay** — exiting Focus Mode left timer circle, play/reset buttons, and task selector visible on top of the main layout; replaced `AnimatePresence` wrapper with direct conditional rendering to ensure clean unmount
- **TimerPage TypeScript error** — `getEffectiveElapsed` function signature didn't accept `null` for `startedAt` and `accumulatedSeconds`, causing TS2345 when called with Zod-inferred types that include `null`
- **Version string mismatch** — Settings page showed v1.8.0 instead of current version
- **Energy suggestions duplication** — Today page energy suggestions now exclude tasks already pinned to today or due today, preventing duplicate entries
- **pinnedToday not cleared on completion** — completing a task now clears its `pinnedToday` field to prevent stale pins
- **Dockerfile ARM64 QEMU crash** — `--ignore-scripts` only applied to production stage; builder stage now runs scripts normally so esbuild binary installs correctly

### Added

- **Pin-to-Today task picker** — "My Today" section on the Today page with an "+ Add Task" button that opens a searchable picker to pin any active task; pinned tasks show with unpin buttons and completion toggles
- **Undo-acknowledge reminders** — acknowledged reminders now show an "Undo" button to reverse the acknowledgment and restore the reminder to active state
- **Reminder creation from Tasks page** — new Reminder button in Tasks page header + **R** keyboard shortcut opens a full reminder creation dialog without leaving the Tasks view
- **Edit Reminder** — click the pencil icon on any reminder to edit its title, description, date, time, category, and recurrence in a pre-filled dialog; uses existing `UPDATE_REMINDER` reducer action
- **Inline Matrix Task Editing** — click the pencil icon on any task in the Eisenhower Matrix to edit title, priority, and due date inline without leaving the view; priority badges now shown on task cards
- **SKIP_AUTH env var** — new environment variable (default `true` in Dockerfile) bypasses OAuth for self-hosted deployments; injects a local admin user automatically
- **Unraid template** — `unraid-template.xml` for Community Apps submission with all env vars pre-configured
- **v182-audit.test.ts** — 4 tests covering pomodoro serialization with null/undefined `startedAt`, linked tasks round-trip, and reminders round-trip
- **v182-features.test.ts** — 8 tests covering edit reminder round-trip (title, recurrence, optional fields) and inline matrix task editing round-trip (title, priority, dueDate, quadrant preservation)
- **v182-pintoday.test.ts** — 6 tests covering pinnedToday field serialization, Zod validation, null handling, and completion clearing

### Changed

- **Tasks page defaults** — Tasks page now defaults to showing Open (active) tasks with priority sort, instead of All tasks with manual order
- **Analytics script conditional** — `index.html` analytics tag only loads when `VITE_ANALYTICS_ENDPOINT` is set, preventing URIError on self-hosted
- Test count increased from 104 to 122 across 14 test files

---

## [1.8.1] - 2026-02-20

### Added

- **Task-linked pomodoros** — select multiple tasks and/or subtasks when starting a focus session; linked tasks displayed on timer card and in stats
- **Quarterly recurring tasks** — new recurrence frequency with configurable day-of-month and start month (e.g., 16th of Feb/May/Aug/Nov)
- **Reminders system** — separate sidebar tab for managing birthdays, appointments, and events with optional time-of-day; recurring support (yearly, monthly, weekly); acknowledge to dismiss or advance to next occurrence
- **Reminders in Today view** — overdue, today, and upcoming (5-day lookahead) sections with distinct visual treatment and time display
- **`R` keyboard shortcut** — opens new reminder dialog from any page
- **Schema integrity tests** — 32 new tests covering Zod schema drift detection and full persistence round-trips for every entity type (tasks, subtasks, pomodoros, reminders, reading items, templates, preferences, daily stats)
- **README screenshots** — Today and Tasks page screenshots added to README

### Changed

- **Architecture: Zod-first single source of truth** — all type definitions now live as Zod schemas in `shared/appTypes.ts` with inferred TypeScript types; eliminated duplicate Zod schema from `dataRouter.ts` and duplicate type file `client/src/lib/types.ts`
- **Strict Zod validation** — `appStateSchema.strict()` now rejects unknown fields with errors instead of silently stripping them
- **CI/CD pipeline** — now pushes to both Docker Hub (`islamdiaa/focus-assistant`) and GHCR; supports semver tags from GitHub Releases (e.g., `v1.8.1` → Docker tags `1.8.1` + `1.8`)
- Sidebar navigation expanded with Reminders under "Knowledge" section
- Test count increased from 58 to 104+ across 12 test files
- Updated architecture.md, claude.md, agent.md with V1.8.1 changes

### Fixed

- **Critical persistence bug** — state changes (marking tasks done, adding reminders, etc.) were silently stripped by outdated Zod validation schema on save, causing data loss on refresh
- **`acknowledged: false` serialization** — boolean `false` values were lost during MD serialization round-trip

---

## [1.8.0] - 2026-02-20

### Added

- **Read Later Pocket** — save links with URL, title, description, and tags; mark as unread/reading/read; add freeform notes; filter by status and tags; search across titles and notes
- **Reading Queue on Today page** — Daily Digest section showing unread/in-progress reading items with domain badges and tag previews
- **Obsidian Vault Sync** — server-side write of `FocusAssist.md` to configured vault path on every save; YAML frontmatter, Obsidian-compatible task checkboxes, #hashtag tags, reading list with links, stats table; fire-and-forget async (doesn't block saves)
- **Obsidian export includes reading list** — unread, currently reading, and read sections with notes and tags
- **ReadingItem data model** — id, url, title, description, tags, status (unread/reading/read), notes, domain, createdAt, readAt
- **Reading list MD serialization** — new `## Reading List` section in data file with pipe-escaped fields
- **Sidebar "Knowledge" section** — Read Later page with BookOpen icon
- **Keyboard shortcut 6** — switches to Read Later page (Templates → 7, Weekly Review → 8, Settings → 9)
- 8 new V1.8 tests (58 total across 9 test files) covering reading list serialization, Obsidian markdown generation, and edge cases

### Changed

- Sidebar navigation expanded from 8 to 9 items with new "Knowledge" section
- Version bumped to 1.8.0 in package.json and Settings About section
- AppState model extended with `readingList: ReadingItem[]`
- Markdown serialization updated for reading list section
- Obsidian sync now fires automatically on every data save (when enabled)

---

## [1.7.0] - 2026-02-20

### Added

- **Subtasks** — parent/child task relationships with inline add/toggle/delete and progress bars on task cards
- **Task Templates** — save reusable task sets, apply them to create multiple tasks at once, manage from dedicated Templates page
- **Daily Planner** ("Today" page) — time-of-day greeting, due/overdue tasks, high-priority tasks, energy-matched suggestions, completed today section
- **Motivational Quote Box** — 40 curated quotes from authors and books (Seneca, Cal Newport, James Clear, Steve Jobs, etc.), randomized on each page load
- **Weekly Review** page — end-of-week summary with task completion stats, carry-over of incomplete tasks, next week planning
- **Focus Mode** — full-screen distraction-free view with current task display, integrated Pomodoro timer, ambient background, keyboard shortcut (F)
- **Obsidian Vault Sync** — configurable vault path in Settings, auto-sync toggle for automatic export on data changes
- **Notification Sound Options** — 6 sound choices (Gentle Chime, Bell, Digital Ping, Soft Gong, Nature, None) selectable in Settings
- **Data Integrity Check** — scan and auto-fix data inconsistencies (orphaned refs, missing fields, duplicate IDs) from Settings
- **Framer Motion animations** — page transitions, card enter/exit animations, layout animations across all new pages
- **Sidebar reorganization** — section headers (Tools, System, Quick Actions), Focus Mode quick-launch button
- **Keyboard shortcuts** — F for Focus Mode, 1-8 for page switching, Esc to exit Focus Mode
- **LinkedTaskId** on Pomodoros — data model support for linking focus sessions to specific tasks
- 10 new V1.2 tests (46 total across 7 test files) covering subtasks, templates, preferences, and integrity check serialization

### Changed

- Default landing page changed from Tasks to Daily Planner ("Today")
- Sidebar expanded from 5 to 8 navigation items with section grouping
- Version bumped to 1.7.0 in package.json and Settings About section
- AppState model extended with `templates`, `preferences`, and `subtasks` fields
- Markdown serialization updated for subtasks (JSON column), templates section, and preferences section

---

## [1.6.0] - 2026-02-20 (V1.1 Release)

### Added

- Custom app icon from Flaticon (checklist icon by Freepik) — favicon.ico, apple-touch-icon, PWA icons (16/32/64/192/512px)
- PWA manifest.json for installable web app support
- Docker LABEL metadata for Unraid (icon, webui URL, managed flag)
- CI/CD pipeline pushes Docker images to GitHub Container Registry (GHCR) on every push to main
- Multi-architecture Docker builds (linux/amd64 + linux/arm64)
- Comprehensive Watchtower auto-update guide in DOCKER-GUIDE.md
- GHCR authentication guide for private repos
- Dark mode toggle in Settings with warm dark palette variant
- Drag-and-drop task reordering on Tasks page via @dnd-kit/react (React 19 compatible)
- Manual sort mode with grip handles on task cards
- Comprehensive unit test suite — 36 tests across 6 files
- CHANGELOG.md for tracking all changes
- Updated agent.md and claude.md with changelog maintenance instructions

### Changed

- Migrated from @dnd-kit/core to @dnd-kit/react for React 19 compatibility
- CI workflow enhanced with GHCR login, metadata extraction, and conditional push
- Theme system wired up as switchable (light/dark) via ThemeProvider

### Fixed

- dnd-kit React 19 hooks compatibility error (useSensor crash)

---

## [1.5.0] - 2026-02-20

### Added

- Comprehensive unit test suite — 36 tests across 6 files covering MD storage serialization, round-trip integrity, Google Sheets API mocking, storage config logic, auth logout, and shared type constants
- CHANGELOG.md for tracking all changes
- Updated agent.md and claude.md with changelog maintenance instructions

---

## [1.4.0] - 2026-02-20

### Added

- GitHub Actions CI workflow (`.github/workflows/ci.yml`) with two jobs: Test (tsc + vitest) and Docker Build (BuildX + GHA caching)
- Concurrency groups to auto-cancel stale CI runs
- Runs on every push and PR to `main`

---

## [1.3.0] - 2026-02-20

### Added

- Auto-backup rotation — keeps last 5 versions of the MD file (`.bak.1` through `.bak.5`)
- Timer persistence across page refresh — saves `startedAt` timestamp and `accumulatedSeconds` to resume running timers
- Search bar on Tasks page with `/` keyboard shortcut to focus
- Keyboard shortcuts: `N` new task, `/` search, `1-5` switch pages, `Ctrl+Z` undo, `Ctrl+Shift+Z` redo
- Multi-tab sync via 5-second polling of server file timestamp
- Undo/redo with action history stack (up to 50 states)
- Recurring tasks — daily, weekly, monthly, weekdays frequencies
- Export to Markdown and JSON from Settings page
- Import from Markdown or JSON file upload
- Sound notification (chime) and browser notification on timer completion

---

## [1.2.0] - 2026-02-20

### Changed

- **Architecture upgrade**: Migrated from static frontend to full-stack Express + tRPC backend
- Storage moved from browser File System Access API to server-side MD file read/write
- Data persists at `./data/focus-assist-data.md` (Docker volume mount point)
- Google Sheets integration moved to server-side with toggle in Settings

### Added

- `Dockerfile` for multi-stage production build
- `docker-compose.yml` with volume mounts for data persistence
- `DOCKER-GUIDE.md` with three Unraid deployment methods
- `.dockerignore` for lean Docker images
- `architecture.md` — full system architecture documentation
- `claude.md` — Claude Code navigation guide
- `agent.md` — general AI agent navigation guide
- `README.md` — comprehensive installation and usage guide
- Port configuration updated to 1992 (avoiding reserved ports)
- tRPC data router with load, save, getConfig, setConfig, poll, export, and import endpoints
- Server-side storage config manager (`config.json`)

---

## [1.1.0] - 2026-02-20

### Added

- Mobile responsive layout with hamburger menu (sidebar collapses below 1024px)
- Responsive padding and grid layouts across all 5 pages
- Matrix page stacks quadrants vertically on mobile with "Move to..." dropdown
- Local Markdown file storage via File System Access API (Chrome/Edge)
- Toggle switch in Settings to choose between Local File and Google Sheets
- Status badge showing active storage mode

### Changed

- Category field added to tasks (Work, Personal, Health, Learning, Errands, Other)
- Energy Required field added to tasks (Low, Medium, High)
- Priority switched from dropdown to button group
- Category, Energy, and Priority shown as badges on task cards
- Inline edit on task cards (pencil icon expands edit form below card)
- Settings "About" section updated with ADHD-friendly copy and badges

---

## [1.0.0] - 2026-02-20

### Added

- Initial release with 5 pages: Tasks, Focus Timer, Eisenhower Matrix, Stats, Settings
- Warm Scandinavian "Warm Productivity" design with DM Serif Display + DM Sans typography
- Earth-tone color palette (cream, sand, terracotta, sage green)
- Watercolor illustrations for empty states
- Tasks page with CRUD, filters (All/Active/Done), sorting (Newest/Priority/Due Date)
- Focus Timer page with multiple Pomodoro timers and circular progress
- Eisenhower Matrix with drag-and-drop quadrant assignment
- Stats page with streak tracking, daily/weekly charts, all-time statistics
- Settings page with timer presets (Classic/Short/Deep/Gentle) and custom sliders
- Google Sheets integration for cloud persistence
- Daily motivational tips in sidebar
- Header bar with completed tasks and focus time badges
