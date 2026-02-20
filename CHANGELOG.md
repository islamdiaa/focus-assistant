# Changelog

All notable changes to FocusAssist are documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
