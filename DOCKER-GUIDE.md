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
  -p 1992:1992 \
  -v focus-data:/app/data \
  -e NODE_ENV=production \
  -e PORT=1992 \
  focus-assist
```

## Unraid Deployment

### Method 1: Docker Compose Manager Plugin (Easiest)

1. Install the **Docker Compose Manager** plugin from Community Applications
2. Go to **Docker** → **Compose** → **Add New Stack**
3. Paste the `docker-compose.yml` content (or point to the file)
4. Click **Compose Up**
5. Access at `http://YOUR_UNRAID_IP:1992`

### Method 2: Manual Docker Template

1. Go to **Docker** → **Add Container**
2. Fill in the following:

| Field            | Value                                   |
| ---------------- | --------------------------------------- |
| **Name**         | `focus-assist`                          |
| **Repository**   | `focus-assist` (after building locally) |
| **Network Type** | `bridge`                                |
| **Port Mapping** | Host: `1992` → Container: `1992` (TCP)  |

3. Add a **Path** mapping:

| Container Path | Host Path                        | Access Mode |
| -------------- | -------------------------------- | ----------- |
| `/app/data`    | `/mnt/user/appdata/focus-assist` | Read/Write  |

4. Add **Environment Variables**:

| Key        | Value        |
| ---------- | ------------ |
| `NODE_ENV` | `production` |
| `PORT`     | `3000`       |

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
  -p 1992:1992 \
  -v /mnt/user/appdata/focus-assist/data:/app/data \
  -e NODE_ENV=production \
  -e PORT=1992 \
  focus-assist
```

## Data Persistence

All app data is stored in the `/app/data` volume:

| File                   | Purpose                                                              |
| ---------------------- | -------------------------------------------------------------------- |
| `focus-assist-data.md` | All tasks, pomodoros, stats, and settings in human-readable Markdown |
| `config.json`          | Storage mode configuration (file vs. Google Sheets)                  |

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

## Automatic Updates (Recommended)

The CI/CD pipeline automatically builds and pushes Docker images to **GitHub Container Registry (GHCR)** on every push to `main`. Combined with **Watchtower** on Unraid, your container updates itself automatically.

### Step 1: Use the GHCR Image

Instead of building locally, pull the pre-built image. Update your `docker-compose.yml`:

```yaml
services:
  focus-assist:
    image: ghcr.io/YOUR_GITHUB_USERNAME/focusassistant:latest
    # Remove the 'build: .' line
    restart: unless-stopped
    ports:
      - "1992:1992"
    volumes:
      - focus-data:/app/data
    environment:
      - NODE_ENV=production
      - PORT=1992

volumes:
  focus-data:
```

Replace `YOUR_GITHUB_USERNAME` with your actual GitHub username (lowercase).

### Step 2: Authenticate with GHCR (Private Repos)

If your GitHub repo is **private**, you need to authenticate Docker with GHCR:

```bash
# Create a GitHub Personal Access Token (PAT) with 'read:packages' scope
# Go to: GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
# Generate with scope: read:packages

# Login to GHCR on your Unraid server
ssh root@YOUR_UNRAID_IP
echo "YOUR_GITHUB_PAT" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

This only needs to be done once — Docker saves the credentials.

### Step 3: Install Watchtower on Unraid

Watchtower monitors your running containers and automatically pulls new images when available.

**Option A: Community Applications (Easiest)**

1. Go to **Apps** in Unraid
2. Search for **Watchtower**
3. Install it with default settings
4. It will automatically check for updates every 24 hours

**Option B: Docker Run**

```bash
docker run -d \
  --name watchtower \
  --restart unless-stopped \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -e WATCHTOWER_CLEANUP=true \
  -e WATCHTOWER_POLL_INTERVAL=86400 \
  -e WATCHTOWER_INCLUDE_STOPPED=false \
  containrrr/watchtower
```

**Option C: Docker Compose** — Add to your `docker-compose.yml`:

```yaml
services:
  focus-assist:
    image: ghcr.io/YOUR_GITHUB_USERNAME/focusassistant:latest
    restart: unless-stopped
    ports:
      - "1992:1992"
    volumes:
      - focus-data:/app/data
    environment:
      - NODE_ENV=production
      - PORT=1992

  watchtower:
    image: containrrr/watchtower
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - WATCHTOWER_CLEANUP=true
      - WATCHTOWER_POLL_INTERVAL=86400
      - WATCHTOWER_INCLUDE_STOPPED=false
    # For private GHCR repos, mount Docker config:
    # - /root/.docker/config.json:/config.json:ro

volumes:
  focus-data:
```

### How It Works

```
Push to GitHub main
       │
       ▼
GitHub Actions CI
  ├── Run tests
  ├── Build Docker image (amd64 + arm64)
  └── Push to ghcr.io/user/focusassistant:latest
       │
       ▼
Watchtower on Unraid (checks every 24h)
  ├── Detects new image digest
  ├── Pulls new image
  ├── Stops old container
  ├── Starts new container (same config + volumes)
  └── Removes old image
       │
       ▼
Your data persists in the Docker volume ✓
```

### Watchtower Configuration

| Variable                     | Default | Description                                                                    |
| ---------------------------- | ------- | ------------------------------------------------------------------------------ |
| `WATCHTOWER_POLL_INTERVAL`   | `86400` | Check interval in seconds (86400 = 24h)                                        |
| `WATCHTOWER_CLEANUP`         | `true`  | Remove old images after update                                                 |
| `WATCHTOWER_INCLUDE_STOPPED` | `false` | Only update running containers                                                 |
| `WATCHTOWER_SCHEDULE`        | —       | Cron schedule (alternative to poll interval), e.g. `0 0 4 * * *` for 4am daily |
| `WATCHTOWER_NOTIFICATIONS`   | —       | Set to `email` or `slack` for update notifications                             |

### Manual Update (Alternative)

If you prefer not to use Watchtower:

```bash
# Pull latest image and restart
cd /path/to/focus-assist
docker compose pull
docker compose up -d

# Or with docker run:
docker pull ghcr.io/YOUR_GITHUB_USERNAME/focusassistant:latest
docker stop focus-assist
docker rm focus-assist
docker run -d \
  --name focus-assist \
  --restart unless-stopped \
  -p 1992:1992 \
  -v focus-data:/app/data \
  -e NODE_ENV=production \
  -e PORT=1992 \
  ghcr.io/YOUR_GITHUB_USERNAME/focusassistant:latest
```

Your data persists in the volume — it survives container rebuilds and image updates.

## Troubleshooting

| Issue                     | Solution                                                  |
| ------------------------- | --------------------------------------------------------- |
| Container won't start     | Check logs: `docker logs focus-assist`                    |
| Port 1992 in use          | Change the host port: `-p 8080:1992`                      |
| Data not persisting       | Verify volume mount: `docker inspect focus-assist`        |
| Blank page                | Clear browser cache, check `docker logs` for build errors |
| Google Sheets not syncing | Verify API key has Sheets API enabled and Sheet is shared |

## Environment Variables Reference

| Variable     | Default        | Description                    |
| ------------ | -------------- | ------------------------------ |
| `NODE_ENV`   | `production`   | Set to `production` for Docker |
| `PORT`       | `1992`         | Server port (inside container) |
| `DATA_DIR`   | `/app/data`    | Path to data directory         |
| `JWT_SECRET` | auto-generated | Session cookie secret          |
