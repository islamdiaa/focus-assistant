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
