# FocusAssist

A warm, ADHD-friendly productivity app with task management, Pomodoro timers, Eisenhower Matrix, and statistics tracking. Runs as a single Docker container with data stored in a human-readable Markdown file.

## Features

| Feature | Description |
|---------|-------------|
| **Tasks** | Create, edit, delete tasks with priority, category, energy level, due dates. Filter by status, sort by date/priority. Inline editing on cards. |
| **Focus Timer** | Multiple Pomodoro timers with circular progress. Configurable focus/break durations. |
| **Eisenhower Matrix** | Drag tasks into Do First / Schedule / Delegate / Eliminate quadrants. |
| **Stats** | Daily streak, completed tasks, focus minutes, weekly charts, all-time statistics. |
| **Settings** | Timer presets (Classic/Short/Deep/Gentle), custom sliders, storage backend toggle. |

## Quick Start

### Docker (Recommended)

```bash
git clone https://github.com/YOUR_USERNAME/FocusAssistant.git
cd FocusAssistant
docker compose up -d
```

Open `http://localhost:1992` in your browser.

### Docker Run (Manual)

```bash
docker build -t focus-assist .
docker run -d \
  --name focus-assist \
  --restart unless-stopped \
  -p 1992:1992 \
  -v focus-data:/app/data \
  -e NODE_ENV=production \
  -e PORT=1992 \
  focus-assist
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
| ID | Title | Priority | Status | ... |
|----|-------|----------|--------|-----|
| abc | Review OKRs | high | active | ... |
```

### Google Sheets (Optional)

Toggle Google Sheets sync in Settings → Data Storage. You'll need:

1. A Google Sheet with tabs: `Tasks`, `Pomodoros`, `Settings`, `DailyStats`
2. A Google Cloud API key with Sheets API enabled
3. The Sheet ID (from the URL)

When Sheets mode is active, the local Markdown file is ignored.

## Unraid Deployment

See [DOCKER-GUIDE.md](./DOCKER-GUIDE.md) for detailed Unraid deployment instructions, including:

- Docker Compose Manager plugin setup
- Manual Docker template configuration
- SSH-based build and run
- Backup and restore procedures

## Port Allocation

| Port | Purpose |
|------|---------|
| 1992 | Main application |
| 1993 | Reserved for future use |
| 1994 | Reserved for future use |

To change the port, update `docker-compose.yml`:

```yaml
ports:
  - "YOUR_PORT:YOUR_PORT"
environment:
  - PORT=YOUR_PORT
```

And update `Dockerfile`:

```dockerfile
EXPOSE YOUR_PORT
ENV PORT=YOUR_PORT
```

## Project Structure

```
client/src/           # React 19 frontend (Tailwind CSS 4 + shadcn/ui)
server/               # Express 4 backend (tRPC 11 API)
shared/               # Shared TypeScript types
data/                 # Persistent data (Docker volume mount point)
drizzle/              # Database schema (auth only)
```

For detailed architecture documentation, see [architecture.md](./architecture.md).

## Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS 4, shadcn/ui
- **Backend:** Express 4, tRPC 11, Node.js 22
- **Storage:** Local Markdown file or Google Sheets
- **Build:** Vite 7 (client), esbuild (server)
- **Tests:** Vitest
- **Container:** Docker (Node 22 Alpine)

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

## License

MIT
