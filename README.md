# FocusAssist

[![CI](https://github.com/islamdiaa/focus-assistant/actions/workflows/ci.yml/badge.svg)](https://github.com/islamdiaa/focus-assistant/actions/workflows/ci.yml)
[![Docker Pulls](https://img.shields.io/docker/pulls/islamdiaa/focus-assistant)](https://hub.docker.com/r/islamdiaa/focus-assistant)
[![Docker Image](https://img.shields.io/docker/image-size/islamdiaa/focus-assistant/latest)](https://hub.docker.com/r/islamdiaa/focus-assistant)

A warm, ADHD-friendly productivity app with task management, Pomodoro timers, Eisenhower Matrix, reminders, and statistics tracking. Runs as a single Docker container with data stored in a human-readable Markdown file.

## Screenshots

|                                                   Today View                                                    |                                                      Tasks                                                      |
| :-------------------------------------------------------------------------------------------------------------: | :-------------------------------------------------------------------------------------------------------------: |
| ![Today](https://files.manuscdn.com/user_upload_by_module/session_file/310519663318830806/rCJUBSCRCTAumHhN.png) | ![Tasks](https://files.manuscdn.com/user_upload_by_module/session_file/310519663318830806/tFSWUijcDpdIaafI.png) |

## Features

| Feature               | Description                                                                                                                                                                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Today View**        | Daily planner with motivational quotes, stats summary, due tasks, monitoring section, and reminders (overdue, today, upcoming 5 days).                                                                                                            |
| **Tasks**             | Create, edit, delete tasks with priority, category, energy level, due dates, subtasks. Filter tabs: All/Open/Monitored/Done. Monitor toggle for "waiting-on" tasks. Inline editing on cards. Recurring tasks (daily, weekly, monthly, quarterly). |
| **Focus Timer**       | Multiple Pomodoro timers with circular progress. Configurable focus/break durations. Link multiple tasks or subtasks to a session.                                                                                                                |
| **Eisenhower Matrix** | Drag tasks into Do First / Schedule / Delegate / Eliminate quadrants.                                                                                                                                                                             |
| **Reminders**         | Birthdays, appointments, events with optional time-of-day. Recurring support (yearly, monthly, etc.). Acknowledge to dismiss or advance to next occurrence.                                                                                       |
| **Read Later**        | Save articles/links for later reading with status tracking (unread, reading, done).                                                                                                                                                               |
| **Templates**         | Save and reuse task templates for repeating workflows.                                                                                                                                                                                            |
| **Weekly Review**     | Guided reflection with accomplishments, challenges, and next-week planning.                                                                                                                                                                       |
| **Stats**             | Daily streak, completed tasks, focus minutes, weekly charts, all-time statistics.                                                                                                                                                                 |
| **Settings**          | Timer presets (Classic/Short/Deep/Gentle), custom sliders, focus mode, keyboard shortcuts.                                                                                                                                                        |
| **Context Filtering** | Global Work/Personal toggle in sidebar. Filters tasks, reminders, and stats by context. Persisted across sessions.                                                                                                                                |

## Quick Start

### Docker (Recommended)

```bash
docker pull islamdiaa/focus-assistant:latest
docker run -d \
  --name focus-assistant \
  --restart unless-stopped \
  -p 1992:1992 \
  -v focus-data:/app/data \
  -e NODE_ENV=production \
  -e PORT=1992 \
  islamdiaa/focus-assistant:latest
```

Open `http://localhost:1992` in your browser.

### Docker Compose

```bash
git clone https://github.com/islamdiaa/FocusAssistant.git
cd FocusAssistant
docker compose up -d
```

### Development (Local)

```bash
pnpm install
pnpm dev
```

Dev server starts at `http://localhost:3000` with hot module replacement.

## Data Storage

By default, all data is saved to `data/focus-assist-data.md` — a human-readable Markdown file. You can open it in any text editor, Obsidian, VS Code, or view it on GitHub.

```markdown
# Focus Assist Data

## Tasks

| ID  | Title       | Priority | Status | ... |
| --- | ----------- | -------- | ------ | --- |
| abc | Review OKRs | high     | active | ... |
```

### Google Sheets (Optional)

Toggle Google Sheets sync in Settings → Data Storage. You'll need:

1. A Google Sheet with tabs: `Tasks`, `Pomodoros`, `Settings`, `DailyStats`
2. A Google Cloud API key with Sheets API enabled
3. The Sheet ID (from the URL)

When Sheets mode is active, the local Markdown file is ignored.

## CI/CD Pipeline

The project uses GitHub Actions for continuous integration and deployment:

```
Code push → CI tests → Docker build → Docker Hub → Watchtower → Auto-update
```

- **Test job:** TypeScript type-checking + Vitest (172+ tests)
- **Docker job:** Multi-arch build (amd64/arm64), pushes to Docker Hub + GHCR
- **Versioning:** Semver tags on GitHub releases (e.g., `v1.8.1` → Docker tag `1.8.1`)

## Unraid Deployment

See [DOCKER-GUIDE.md](./DOCKER-GUIDE.md) for detailed Unraid deployment instructions, including:

- Docker Compose Manager plugin setup
- Manual Docker template configuration
- SSH-based build and run
- Backup and restore procedures

## Port Allocation

| Port | Purpose                 |
| ---- | ----------------------- |
| 1992 | Main application        |
| 1993 | Reserved for future use |
| 1994 | Reserved for future use |

To change the port, update `docker-compose.yml`:

```yaml
ports:
  - "YOUR_PORT:YOUR_PORT"
environment:
  - PORT=YOUR_PORT
```

## Project Structure

```
client/src/           # React 19 frontend (Tailwind CSS 4 + shadcn/ui)
server/               # Express 4 backend (tRPC 11 API)
shared/               # Shared TypeScript types (Zod-first schemas)
data/                 # Persistent data (Docker volume mount point)
drizzle/              # Database schema (auth only)
```

For detailed architecture documentation, see [architecture.md](./architecture.md).

## Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS 4, shadcn/ui
- **Backend:** Express 4, tRPC 11, Node.js 22
- **Storage:** Local Markdown file or Google Sheets
- **Validation:** Zod (single source of truth for types + runtime validation)
- **Build:** Vite 7 (client), esbuild (server)
- **Tests:** Vitest (172+ tests including schema integrity + persistence round-trips)
- **CI/CD:** GitHub Actions → Docker Hub + GHCR
- **Container:** Docker (Node 22 Alpine, multi-arch amd64/arm64)

## Scripts

```bash
pnpm dev          # Development server with HMR
pnpm build        # Production build (Vite + esbuild)
pnpm start        # Start production server
pnpm test         # Run vitest tests
pnpm check        # TypeScript type checking
pnpm db:push      # Database migrations
```

## AI Agent Guides

This repo includes guidance files for AI coding assistants:

- [claude.md](./claude.md) — Guide for Claude (Anthropic)
- [agent.md](./agent.md) — General guide for any AI agent (Cursor, Copilot, etc.)

## Design

The UI follows a "Warm Scandinavian" design language with DM Serif Display + DM Sans typography, earth-tone colors (cream, sand, terracotta, sage green), and watercolor illustrations. Designed to be calm, focused, and ADHD-friendly.

## Keyboard Shortcuts

| Key            | Action            |
| -------------- | ----------------- |
| `N`            | New task          |
| `R`            | New reminder      |
| `F`            | Toggle focus mode |
| `Ctrl+Z`       | Undo              |
| `Ctrl+Shift+Z` | Redo              |

## Author

[Islam ElTayar](https://itayar.com)

## License

MIT
