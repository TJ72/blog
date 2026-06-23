# syntax=docker/dockerfile:1

# ============================================================
# Stage 1 — deps: install dependencies
# Cached as long as package.json / pnpm-lock.yaml don't change.
# ============================================================
FROM node:22-alpine AS deps
WORKDIR /app

# Enable pnpm via corepack (version pinned by "packageManager" in package.json).
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

# Copy only the manifest + lockfile (+ .npmrc, which pins node-linker=hoisted so
# the container gets a flat node_modules that traces into standalone cleanly)
# first, so this layer stays cached unless dependencies actually change.
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

# ============================================================
# Stage 2 — builder: build the Next.js app (produces .next/standalone)
# ============================================================
FROM node:22-alpine AS builder
WORKDIR /app

ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# ============================================================
# Stage 3 — runner: minimal runtime image (only what's needed to run)
# ============================================================
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Run as a non-root user (security best practice).
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# The standalone build is self-contained, but .next/static and public
# must be copied in separately.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

# Cloud Run injects its own PORT at runtime; 3000 is just the local default.
# HOSTNAME=0.0.0.0 makes the server listen on all interfaces inside the container.
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
EXPOSE 3000

CMD ["node", "server.js"]
