# syntax=docker/dockerfile:1.7

# ---------- Base: pnpm + Node ----------
FROM node:20-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.17.1 --activate
WORKDIR /repo

# ---------- Dependencies (with build toolchain for better-sqlite3) ----------
FROM base AS deps
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy workspace manifests first for better layer caching
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY packages/sdk/package.json packages/sdk/
COPY examples/package.json examples/

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ---------- Build web (Next static export) ----------
FROM deps AS web-build
COPY apps/web apps/web
COPY tsconfig.base.json ./
RUN pnpm --filter web build

# ---------- Build server (tsup) ----------
FROM deps AS server-build
COPY tsconfig.base.json ./
COPY apps/server apps/server
COPY packages/sdk packages/sdk
RUN pnpm --filter orchestrator-server build

# ---------- Production dependencies only ----------
FROM base AS prod-deps
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY packages/sdk/package.json packages/sdk/
COPY examples/package.json examples/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod --filter orchestrator-server...

# ---------- Runtime ----------
FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production
ENV PORT=8000
# Persist SQLite DB outside the image
ENV DATABASE_URL=file:/data/dev.db

WORKDIR /app

# Production node_modules (includes better-sqlite3 native binary)
COPY --from=prod-deps /repo/node_modules ./node_modules
COPY --from=prod-deps /repo/apps/server/node_modules ./apps/server/node_modules
COPY --from=prod-deps /repo/pnpm-workspace.yaml /repo/package.json ./
COPY --from=prod-deps /repo/apps/server/package.json ./apps/server/package.json

# Built server output
COPY --from=server-build /repo/apps/server/dist ./apps/server/dist
COPY --from=server-build /repo/apps/server/prisma ./apps/server/prisma
COPY --from=server-build /repo/apps/server/src/generated ./apps/server/src/generated

# Built dashboard, served as static assets from apps/server/public
COPY --from=web-build /repo/apps/web/out ./apps/server/public

# SQLite data directory
RUN mkdir -p /data
VOLUME ["/data"]

WORKDIR /app/apps/server
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+ (process.env.PORT||8000) +'/agents').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]
