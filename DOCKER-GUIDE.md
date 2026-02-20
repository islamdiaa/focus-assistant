# FocusAssist — Docker & Unraid Deployment Guide

## Architecture Overview

FocusAssist runs as a single container with an Express server that serves both the React frontend and the API. Data is persisted to a local Markdown file (`focus-assist-data.md`) inside a mounted volume. Optionally, you can switch to Google Sheets for cloud sync via the Settings page.

```
┌─────────────────────────────────────┐
│           Docker Container          │
│                                     │
│  ┌──────────┐    ┌──────────────┐   │
│  │  React   │    │   Express    │   │
│  │ Frontend │◄──►│   Server     │   │
│  │ (static) │    │  (tRPC API)  │   │
│  └──────────┘    └──────┬───────┘   │
│                         │           │
│                    ┌────▼────┐      │
│                    │  data/  │      │
│                    │  .md    │      │
│                    └────┬────┘      │
└─────────────────────────┼───────────┘
                          │
                    Docker Volume
                  (persistent data)
```

## Quick Start (Any Docker Host)

### Option 1: Docker Compose (Recommended)

```bash
# Clone or copy the project files
cd focus-assist

# Build and start
docker compose up -d

# Access at http://localhost:3000
```

### Option 2: Docker Run

```bash
# Build the image
docker build -t focus-assist .

# Run with a named volume for data persistence
docker run -d \
  --name focus-assist \
  --restart unless-stopped \
  -p 3000:3000 \
  -v focus-data:/app/data \
  -e NODE_ENV=production \
  -e PORT=3000 \
  focus-assist
```

## Unraid Deployment

### Method 1: Docker Compose Manager Plugin (Easiest)

1. Install the **Docker Compose Manager** plugin from Community Applications
2. Go to **Docker** → **Compose** → **Add New Stack**
3. Paste the `docker-compose.yml` content (or point to the file)
4. Click **Compose Up**
5. Access at `http://YOUR_UNRAID_IP:3000`

### Method 2: Manual Docker Template

1. Go to **Docker** → **Add Container**
2. Fill in the following:

| Field | Value |
|-------|-------|
| **Name** | `focus-assist` |
| **Repository** | `focus-assist` (after building locally) |
| **Network Type** | `bridge` |
| **Port Mapping** | Host: `3000` → Container: `3000` (TCP) |

3. Add a **Path** mapping:

| Container Path | Host Path | Access Mode |
|----------------|-----------|-------------|
| `/app/data` | `/mnt/user/appdata/focus-assist` | Read/Write |

4. Add **Environment Variables**:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `3000` |

5. Click **Apply**

### Method 3: Build on Unraid via SSH

```bash
# SSH into your Unraid server
ssh root@YOUR_UNRAID_IP

# Create app directory
mkdir -p /mnt/user/appdata/focus-assist/build
cd /mnt/user/appdata/focus-assist/build

# Copy project files here (via SCP, SMB, or git clone)
# Then build:
docker build -t focus-assist .

# Run:
docker run -d \
  --name focus-assist \
  --restart unless-stopped \
  -p 3000:3000 \
  -v /mnt/user/appdata/focus-assist/data:/app/data \
  -e NODE_ENV=production \
  -e PORT=3000 \
  focus-assist
```

## Data Persistence

All app data is stored in the `/app/data` volume:

| File | Purpose |
|------|---------|
| `focus-assist-data.md` | All tasks, pomodoros, stats, and settings in human-readable Markdown |
| `config.json` | Storage mode configuration (file vs. Google Sheets) |

### Backup

The data directory contains plain text files. Back them up however you normally back up Unraid appdata:

```bash
# Manual backup
cp -r /mnt/user/appdata/focus-assist/data /mnt/user/backups/focus-assist-$(date +%Y%m%d)

# Or just copy the .md file — it contains everything
cp /mnt/user/appdata/focus-assist/data/focus-assist-data.md ~/backup/
```

### Editing Data Directly

The `focus-assist-data.md` file is a standard Markdown file with tables. You can open it in any text editor, Obsidian, VS Code, or even view it on GitHub. Changes will be picked up on the next app load.

## Google Sheets Mode (Optional)

To use Google Sheets instead of the local file:

1. Create a Google Sheet with tabs named: `Tasks`, `Pomodoros`, `Settings`, `DailyStats`
2. Get a Google Cloud API key with Sheets API enabled
3. Open the app → Settings → Toggle "Google Sheets Cloud Sync"
4. Enter your Sheet ID and API key
5. Click "Connect Sheet"

When Sheets mode is active, the local `.md` file is ignored. Switch back anytime in Settings.

## Updating

```bash
# Pull latest code, rebuild, and restart
cd /path/to/focus-assist
docker compose down
docker compose build --no-cache
docker compose up -d
```

Your data persists in the volume — it survives container rebuilds.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Container won't start | Check logs: `docker logs focus-assist` |
| Port 3000 in use | Change the host port: `-p 8080:3000` |
| Data not persisting | Verify volume mount: `docker inspect focus-assist` |
| Blank page | Clear browser cache, check `docker logs` for build errors |
| Google Sheets not syncing | Verify API key has Sheets API enabled and Sheet is shared |

## Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `production` | Set to `production` for Docker |
| `PORT` | `3000` | Server port (inside container) |
| `DATA_DIR` | `/app/data` | Path to data directory |
| `JWT_SECRET` | auto-generated | Session cookie secret |
