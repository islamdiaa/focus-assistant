# ============================================================
# FocusAssist — Multi-stage Docker build
# ============================================================
# Stage 1: Install deps + build
# Stage 2: Slim production image
#
# Multi-arch: CI uses native runners per architecture (no QEMU).
# ARM64 builds on `ubuntu-24.04-arm`, AMD64 on `ubuntu-latest`.
# Per-arch images are pushed by digest, then merged into a
# multi-arch manifest. See .github/workflows/ci.yml for details.
# ============================================================

# --- Build stage ---
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

# Copy dependency manifests
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/

# Skip husky git hooks during Docker build (no .git in container)
ENV HUSKY=0

# Install all dependencies (including devDependencies for build)
# Scripts must run here so esbuild gets the correct platform binary
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build client (Vite → dist/public/) + server (esbuild → dist/index.js)
RUN pnpm build

# --- Production stage ---
FROM node:22-alpine AS production

# Labels for Unraid and container registries
LABEL org.opencontainers.image.title="Focus Assistant"
LABEL org.opencontainers.image.description="ADHD-friendly productivity app with tasks, Pomodoro timer, Eisenhower matrix, and stats"
LABEL org.opencontainers.image.source="https://github.com/islamdiaa/focus-assistant"
LABEL org.opencontainers.image.version="1.8.7"
LABEL net.unraid.docker.icon="https://cdn-icons-png.flaticon.com/512/7246/7246748.png"
LABEL net.unraid.docker.webui="http://[IP]:[PORT:1992]/"
LABEL net.unraid.docker.managed="dockerman"

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

# Copy dependency manifests
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/

# Install production dependencies only
# --ignore-scripts is safe here since we don't build anything in production
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# Copy built artifacts from builder
# dist/index.js = server bundle, dist/public/ = client assets
COPY --from=builder /app/dist ./dist

# Copy shared and drizzle for runtime
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/drizzle ./drizzle

# Create data directory for MD file persistence
RUN mkdir -p /app/data

# Expose port (server picks it up from PORT env or defaults)
EXPOSE 1992

# Environment defaults
ENV NODE_ENV=production
ENV PORT=1992
ENV DATA_DIR=/app/data
ENV SKIP_AUTH=true
ENV JWT_SECRET=focus-assistant-local-secret

# Volume for persistent data
VOLUME ["/app/data"]

# Ensure Docker sends SIGTERM for graceful shutdown
STOPSIGNAL SIGTERM

# Start the server
CMD ["node", "dist/index.js"]
