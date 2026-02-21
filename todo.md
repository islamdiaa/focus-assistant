# Architecture Upgrade

- [x] Resolve Home.tsx conflict (keep existing layout, removed auto-injected useAuth)
- [x] Build server API routes for tasks, pomodoros, settings, stats (tRPC)
- [x] Create server-side MD file storage service
- [x] Create server-side Google Sheets storage service
- [x] Refactor frontend to call server API instead of localStorage
- [x] Create Dockerfile for production build
- [x] Create docker-compose.yml with volume mounts
- [x] Write Unraid deployment guide
- [x] Run pnpm db:push for schema sync
- [x] Test end-to-end flow

# GitHub Repo & Docs

- [x] Update ports to 1992/1993/1994 in Dockerfile, docker-compose.yml, and DOCKER-GUIDE.md
- [x] Write architecture.md
- [x] Write claude.md
- [x] Write agent.md
- [x] Write/update README.md
- [x] Create private GitHub repo FocusAssistant and push

# Improvements Batch

- [x] 1. Auto-backup rotation (keep last 5 versions of MD file)
- [x] 2. Timer persistence across page refresh (save startedAt timestamp)
- [x] 3. Search + quick filter across task titles/descriptions
- [x] 4. Keyboard shortcuts (N=new task, Esc=close, 1-5=switch pages)
- [x] 5. Multi-tab sync via polling
- [x] 6. Undo/redo action history
- [x] 7. Recurring tasks (auto-creation on schedule)
- [x] 8. Export to MD/JSON + Import from file

# CI/CD

- [x] GitHub Actions CI workflow (test + Docker build on every push)

# New Batch

- [x] Comprehensive unit test suite (server logic, storage, data router) — 36 tests across 6 files
- [x] CHANGELOG.md with full history
- [x] Update agent.md and claude.md with changelog instructions
- [x] Dark mode toggle in Settings
- [x] Drag-and-drop task reordering on Tasks page
- [x] Verify/enhance CI workflow for PR + deployment (already set up in previous checkpoint)

# V1.1 Release

- [x] Fix dnd-kit React 19 compatibility (migrated to @dnd-kit/react + @dnd-kit/react/sortable)
- [x] Add custom checklist icon (favicon, PWA icons, Docker/Unraid icon)
- [x] Update CHANGELOG.md for V1.1
- [x] Push to GitHub as V1.1
- [x] CI/CD push Docker image to GHCR on every push to main
- [x] Update Docker guide with Watchtower auto-update setup for Unraid

# V1.2 Release

- [x] 1. Subtasks — parent/child task relationships with progress bars
- [x] 2. Weekly Review page — end-of-week summary with carry-over and next week planning
- [x] 3. Obsidian vault sync — auto-export MD file to configurable folder path
- [x] 4. Task templates — save/load reusable task sets
- [x] 5. Focus Mode — full-screen distraction-free view with current task + timer
- [x] 6. Daily Planner view — "Today" page with due tasks, focus blocks, timeline
- [x] 7. Framer Motion animations — page transitions, card enter/exit
- [x] 8. Notification sound options — multiple chime choices for timer completion
- [x] 9. Data integrity check — verify/fix MD file structure from Settings
- [x] 10. Motivational quote box on Daily Planner — curated quotes from authors/books, changes on refresh
- [x] Update CHANGELOG.md with V1.2 entries
- [x] Update version number in package.json and SettingsPage
- [x] Align all version references to V1.7.0 (package.json, SettingsPage, CHANGELOG, Git tag)

# V1.8 — Knowledge & Reading

- [x] Read Later pocket — save links with title/URL, tag them, mark as read
- [x] Reading notes — add notes/highlights to saved links
- [x] Daily digest — surface unread links on the Today page
- [x] Obsidian export for reading notes — push highlights to vault

# V1.9 — Focus Experience

- [ ] Spotify/YT Music integration — link playlist, play during focus sessions
- [ ] Focus ambient sounds — built-in lo-fi/rain/white noise as fallback
- [ ] Actual notification audio playback — wire Web Audio API to sound preferences
- [ ] Task-linked pomodoros — pick a task when starting a timer, track focus time per task

# V2.0 — Intelligence

- [ ] AI task breakdown — paste a goal, get subtasks generated via LLM
- [ ] Smart scheduling — suggest optimal time slots based on energy patterns
- [ ] Weekly review AI summary — auto-generate insights from week's data
- [ ] Natural language task input — "call dentist tomorrow high priority"

# V2.1 — Collaboration & Sync

- [ ] Multi-device sync via cloud storage (S3/Supabase)
- [ ] Shared templates — export/import template packs
- [ ] Calendar integration (Google Calendar) — see events alongside tasks
- [ ] Mobile PWA improvements — offline support, push notifications
- [x] Daily backup snapshot — copy data file to /data/daily_backup/YYYY-MM-DD.md once per day, kept indefinitely
- [x] Proper Obsidian vault sync — server-side write of FocusAssist.md to vault path on every save, Docker volume mount support

# V1.8 Implementation

- [x] ReadingItem data model + MD serialization
- [x] Server endpoints for reading items CRUD
- [x] Read Later page — save links, tag, mark read, add notes/highlights
- [x] Daily Digest section on Today page — unread links queue
- [x] Obsidian Vault Sync — server-side write FocusAssist.md to vault path on save
- [x] Navigation + sidebar updates for Read Later
- [x] V1.8 tests
- [x] CHANGELOG + version bump to 1.8.0
- [x] Fix Dockerfile — client/dist path not found after template upgrade to tRPC/Express
- [x] Fix Docker production error — vite imported at runtime in dist/index.js but not in prod dependencies
- [x] Fix Docker standalone mode — Invalid URL error when VITE\_ OAuth env vars are missing

# CI Workflow Update

- [x] Update CI to push to Docker Hub (islamdiaa/focus-assistant) instead of only GHCR
- [x] Add Docker Hub login step with secrets
- [x] Keep GHCR push as secondary registry

# V1.8.1 — Incremental Improvements

- [x] Task-linked pomodoros — select multiple tasks or subtasks when starting a timer, track focus time per task
- [x] Quarterly recurring tasks — repeat every 3 months from a specific start date (e.g., 16th Feb/May/Aug/Nov)
- [x] Reminders system — birthdays, appointments; upcoming view (within 5 days) + today highlight on Today page
- [ ] Playwright E2E tests — deferred to next version
- [x] README screenshots — capture key pages and add to README.md
- [x] Update architecture.md, claude.md, agent.md with V1.8.x changes
- [x] Version bump to 1.8.1, CHANGELOG update

# Bug Fix — Task persistence

- [x] Fix: marking task as done doesn't persist after refresh (state not saved to server)
- [x] Add vitest tests for save/load round-trip covering all state mutations

# Architecture Fix — Single Source of Truth

- [x] Refactor shared/appTypes.ts to Zod-first schemas (define Zod schemas, infer TS types)
- [x] Remove duplicate Zod schema from dataRouter.ts, import from shared
- [x] Update all imports across codebase to use new exports
- [x] Add integration test for save endpoint to catch schema drift
- [x] Add full persistence round-trip tests for all key mutations (add/toggle/edit task, subtasks, pomodoros with linked tasks, reminders, reading items, quarterly tasks, etc.)
- [x] Add .strict() or .passthrough() to prevent silent field stripping

# Reminder Time of Day

- [x] Add optional time field to reminders (HH:mm format, null for all-day like birthdays)
- [x] Show time in overdue/today/upcoming views
- [x] Update Zod schema, MD serialization, and round-trip tests
- [x] Add R keyboard shortcut to open new reminder dialog (like N for new task)

# Bug Fix — AppProvider missing

- [x] Fix: Home component uses useApp() but is not wrapped in AppProvider — HMR invalidation crash (dev-only)

# V1.8.2 — Full Code & Functionality Audit

## Audit Findings

- [x] Layer 1: Types, Zod schemas, serialization audit
- [x] Layer 2: Reducer actions and state mutations audit
- [x] Layer 3: UI components — all pages, forms, views, data bindings audit
- [x] Layer 4: API endpoints and server-side logic audit
- [x] Fix: Focus Mode exit ghost overlay (AnimatePresence not unmounting)
- [x] Fix: TimerPage getEffectiveElapsed null type mismatch
- [x] Fix: Version string v1.8.0 → v1.8.2 in SettingsPage
- [x] Add v182-audit.test.ts (4 tests)
- [x] Version bump to 1.8.2
- [x] CHANGELOG update
- [x] Docs update (architecture.md, claude.md, agent.md)

# V1.8.2 — Feature Additions

- [x] Edit reminder — allow editing existing reminders (title, date, time, category, recurrence) via dialog
- [x] Inline task editing from Matrix view — edit task title, priority, due date directly from Eisenhower matrix
- [x] Tests for edit reminder and matrix inline editing (8 tests in v182-features.test.ts)
- [x] Push latest code to GitHub via checkpoint
- [x] Fix Dockerfile ARM64 QEMU build crash (illegal instruction in native packages)
- [x] Undo-acknowledge reminder — make acknowledged status reversible/editable
- [x] Make priority view the default in Tasks page
- [x] Add reminder creation from Tasks page with R shortcut
- [x] Manual task picker on Today page — pin any active task to Today view
- [x] Audit codebase for bugs and issues
- [x] Fix bugs found during audit (pinnedToday cleared on completion, energy suggestions exclude pinned/due tasks)
- [x] Add tests for new features and bug fixes (6 tests in v182-pintoday.test.ts)
- [ ] Tasks page default filter: Open (active) tasks instead of All
- [ ] Version bump to 1.8.3
- [x] Tasks page default filter: Open (active) tasks instead of All
- [x] Version bump to 1.8.3
- [x] BUG: Tasks added in browser not persisted to disk — data lost on container restart
- [x] Fix save reliability: save errors now tracked with retry (3 attempts), error banner in UI
- [x] Add graceful shutdown (SIGTERM handler + STOPSIGNAL in Dockerfile)
- [x] Column format resilience: col() helper safely handles missing columns in old formats
- [x] Create preflight script (pnpm preflight) — version consistency, tsc, tests, schema compat, env guards
- [x] Update agent.md with process improvements from retrospective
- [x] Update claude.md with process improvements from retrospective
- [x] BUG: Reminder dialog auto-opens when navigating to Reminders page
- [x] Add quarterly recurrence for reminders (same as tasks)
- [x] BUG: TasksPage new task/search/reminder dialogs auto-open on page navigate

# V1.8.5 — Work/Personal Context Switcher

- [x] Add activeContext ('all' | 'work' | 'personal') to preferences schema
- [x] Add SET_CONTEXT reducer action
- [x] Build context switcher toggle in Sidebar
- [x] Filter Tasks page by context
- [x] Filter Today/DailyPlanner page by context
- [x] Filter Matrix page by context
- [x] Filter Stats page by context
- [x] Filter Reminders page by context (reminders always show, tasks filtered)
- [x] Thorough tests for context filtering logic
- [ ] Update ROADMAP with V1.9 Planning tab feature
- [x] Version bump to 1.8.5

# V1.8.5 — Monitored Task Status

- [x] Add 'monitored' to taskStatusSchema enum in appTypes.ts
- [x] Add TOGGLE_MONITOR reducer action (active ↔ monitored)
- [x] Update TasksPage filter tabs: All | Open | Monitored | Done
- [x] Add monitor/reactivate toggle button on task cards (Eye icon)
- [x] Visual distinction for monitored tasks (muted style, eye badge)
- [x] Exclude monitored tasks from Daily Planner actionable sections
- [x] Add "Monitoring" summary section on Daily Planner
- [x] Exclude monitored tasks from Matrix quadrants
- [x] Update Stats to track monitored separately
- [x] Markdown serialization round-trip for monitored status
- [x] Comprehensive tests for monitored task lifecycle
- [x] Comprehensive tests for context filtering across all pages

# V1.8.5 — Docs Update

- [x] Update claude.md with V1.8.5 features
- [x] Update agent.md with V1.8.5 features
- [x] Update architecture.md with monitored status + context filtering
- [x] Update README.md with new features
- [x] Update CHANGELOG.md for V1.8.5

# V1.8.5 — Version Auto-Read

- [x] SettingsPage reads version from package.json instead of hardcoding
- [x] Update preflight to remove SettingsPage version check (no longer needed)

# V1.8.5 — Preflight Automation

- [x] Install husky and configure pre-push hook to run pnpm preflight
- [x] Update CI workflow to use pnpm preflight instead of separate tsc + test

# V1.8.5 — Pre-commit Lint + Release Tag

- [x] Add pre-commit hook for pnpm format:check
- [ ] Tag V1.8.5 and push to GitHub

# V1.8.5 — Today View Overhaul

- [x] Add statusChangedAt field to task schema (ISO string, set on status transitions)
- [x] Update reducer: set statusChangedAt on TOGGLE_TASK, TOGGLE_MONITOR actions
- [x] Update Markdown serialization: add statusChangedAt column to tasks table
- [x] Today task cards: add monitor/complete/delete buttons (same as Tasks page)
- [x] Today reminder cards: add acknowledge/delete buttons (same as Reminders page)
- [x] Remove Monitoring section from Today view
- [x] Add "Actioned Today" collapsible section (completed + monitored today)
- [x] Comprehensive tests for statusChangedAt, Actioned Today logic, serialization
- [x] Update docs (claude.md, agent.md, architecture.md, CHANGELOG)
