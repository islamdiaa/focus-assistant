# ============================================================
# FocusAssist — Multi-stage Docker build
# ============================================================
# Stage 1: Install deps + build
# Stage 2: Slim production image
# ============================================================

# --- Build stage ---
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

# Copy dependency manifests
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/

# Install all dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build client (Vite) + server (esbuild)
RUN pnpm build

# --- Production stage ---
FROM node:22-alpine AS production

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

# Copy dependency manifests
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/client/dist ./client/dist

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

# Volume for persistent data
VOLUME ["/app/data"]

# Start the server
CMD ["node", "dist/index.js"]
