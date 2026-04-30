# The Orchestrator

An agent monitoring system shipped as two npm packages that run on the user's machine.

## Packages

| Package              | Purpose                          | Usage                        |
| -------------------- | -------------------------------- | ---------------------------- |
| `orchestrator-sdk`   | 4-method Agent class (zero deps) | `npm install orchestrator-sdk` |
| `orchestrator-server`| Express + dashboard + SQLite     | `npx orchestrator-server`      |

## Architecture

- **SDK** (`packages/sdk`): Single `Agent` class → makes HTTP POSTs to the server. Never crashes the user's agent — every method is wrapped in try/catch, failures are silent.
- **Server** (`apps/server`): Express + Prisma + SQLite + Socket.io on `:8000`. Receives SDK events, persists to DB, runs attention engine (45s stuck detection), broadcasts via Socket.io, serves static dashboard.
- **Frontend** (`apps/web`): Next.js dashboard, static-exported (`output: 'export'`). Single page: StatCards → AttentionPanel → AgentGrid → AgentDrawer. Consumes REST API + Socket.io for live updates. NOT published to npm — bundled into server's `public/`.

## Repo Structure

```
orchestrator/
├── apps/
│   ├── server/          ← npm: orchestrator-server
│   │   ├── prisma/schema.prisma
│   │   ├── src/
│   │   │   ├── index.ts          ← shebang, entry point
│   │   │   ├── routes/
│   │   │   ├── attention-engine.ts
│   │   │   └── socket.ts
│   │   ├── public/               ← static export copied here pre-publish
│   │   └── dist/
│   └── web/             ← NOT published
│       ├── app/
│       │   ├── page.tsx
│       │   ├── hooks/use-agents.ts
│       │   └── components/
│       │       ├── stat-cards.tsx
│       │       ├── attention-panel.tsx
│       │       ├── agent-grid.tsx
│       │       └── agent-drawer.tsx
│       └── next.config.js
├── packages/
│   └── sdk/             ← npm: orchestrator-sdk
│       ├── src/index.ts
│       └── dist/
└── examples/            ← NOT published
    ├── agent-ok.ts
    ├── agent-error.ts
    └── agent-stuck.ts
```

## Commands

- **Build SDK**: `cd packages/sdk && pnpm build` (tsup → CJS + ESM + .d.ts)
- **Build FE**: `pnpm --filter @orchestrator/web build` → produces `apps/web/out/`
- **Build Server**: `pnpm --filter @orchestrator/server build`
- **Dev Server**: `pnpm --filter @orchestrator/server dev` (`:8000`)
- **Dev FE**: `pnpm --filter @orchestrator/web dev` (`:3000`)
- **Run test agents**: `cd examples && npx tsx agent-ok.ts`
- **Copy dashboard**: `cp -r apps/web/out/ apps/server/public/`

## API Endpoints

| Method | Route                | Purpose                              |
| ------ | -------------------- | ------------------------------------ |
| POST   | `/agent/start`       | Register new agent, returns `{ id }` |
| POST   | `/agent/step`        | Log a step `{ agentId, message, tokens?, cost? }` |
| POST   | `/agent/error`       | Log an error                         |
| POST   | `/agent/end`         | Mark agent as done                   |
| GET    | `/agents`            | List all agents                      |
| GET    | `/agent/:id`         | Agent detail + events                |
| POST   | `/agent/:id/resolve` | Clear needsAttention flag            |

## Conventions

- Monorepo managed with **pnpm workspaces**
- TypeScript everywhere — strict mode
- SDK has **zero runtime dependencies** — just native `fetch`
- SDK methods never throw — always try/catch, fail silently
- Server uses **Prisma + SQLite** (DB at `~/.orchestrator/dev.db` in prod)
- Frontend uses **shadcn/ui** components, **Tailwind**, **date-fns** for relative times
- Socket.io emits `'agents:update'` after every DB write — FE refetches on that signal
- Status badges: `running` → blue, `error` → red, `done` → gray

## Hard Constraints

- SDK must NEVER crash the user's agent. Silent failure only.
- No cloud deployment. Both packages run locally via npm/npx.
- Next.js uses `output: 'export'` — no server-side rendering, no API routes in FE.
- Server entry file must have `#!/usr/bin/env node` shebang for npx support.
- DB path must NOT be inside node_modules.
- `public/` dir is only present in production builds (don't assume it exists in dev).

## Build Order

SDK → Server (Socket.io + resolve endpoint) → FE → Server (static serving + packaging) → Publish

Do NOT skip ahead. Each phase depends on the previous one.

## Current Progress & Build Plan

@./BUILD_PLAN.md