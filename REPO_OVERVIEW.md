# Orchestrator — Repository Overview

## What this is

Orchestrator is an open-source Kanban board that launches, monitors, and
budget-controls [Claude Code](https://claude.com/claude-code) agents on the
developer's local machine. Run `npx orchestrator` inside a git repo, a board
opens at `http://localhost:8000`, and the developer creates tasks with a
prompt and a token budget. Each task gets its own git worktree; Claude Code
runs headless in that worktree, and every step (assistant messages, tool
calls, tool results, token usage) streams to the card in real time over
Socket.io. If a task's token usage crosses its budget, the process is killed
immediately — not warned, killed. A workspace-wide dollar cap can hard-stop
every running agent at once.

There is no SDK, no config file, and no instrumentation the user has to add.
The server owns every process it spawns and parses Claude's own
`stream-json` output directly.

Package name on npm: `orchestrator-sdk` (bin: `orchestrator`), currently
`v0.3.3`, published under `monaabishek2003/Orchestrator` (MIT licensed).

## Architecture at a glance

```
User creates task on Kanban
       ↓
Server creates git worktree + branch (.worktrees/<slug>, orchestrator/<slug>)
       ↓
Server spawns: claude -p "<prompt>" --output-format stream-json
               --input-format stream-json --verbose
               --dangerously-skip-permissions (or nothing, for acceptEdits)
       ↓
Event parser reads NDJSON from stdout line by line
       ↓
Each event: persisted to SQLite (Event row), tokens/cost accumulated,
            checked against the task's budget, broadcast via Socket.io
       ↓
Frontend receives `tasks:update` / `task:event` → updates the card live
       ↓
User can send messages to the running agent via stdin (bidirectional
stream-json), through POST /tasks/:id/message or the `task:send-message`
socket event
       ↓
Process exits 0 → task → done (PR auto-attempted via `gh pr create`)
Process exits non-zero / errors → task → failed
Cumulative tokens ≥ budget → process killed, session ID saved → token_exceeded
Workspace $ cap hit → ALL running processes killed → all → token_exceeded
```

## Monorepo layout

pnpm workspaces (`pnpm-workspace.yaml`: `apps/*`), single top-level
`package.json` orchestrating both apps.

```
apps/
  server/    Node/Express/Socket.io/Prisma backend
  web/       Next.js 14 (App Router) frontend, statically exported
scripts/     Build/packaging helper scripts (dist assembly, postinstall, verify)
.github/docs/  Design docs (FEATURES.md, prd.md) — the spec this codebase implements
.worktrees/  Per-task git worktrees created at runtime (not committed)
dist/        Assembled publishable package (server + web static export + prisma)
```

Root scripts (`package.json`):
- `dev` — runs both apps in parallel (`tsx watch` for server, `next dev -p 3000` for web)
- `build` — builds web (static export), builds server (tsup + `prisma generate`), then `scripts/assemble-dist.js` copies everything into `dist/`
- `typecheck` — `tsc --noEmit` in both apps
- `postinstall` — `scripts/postinstall.js` runs `prisma generate` against the packaged schema (no-op in local dev before first build)
- `prepublishOnly` — build then `scripts/verify-dist.js` sanity-checks the assembled `dist/`

## Server (`apps/server`)

Express + Socket.io app, TypeScript strict, bundled with `tsup`. Data layer
is Prisma over a SQLite file at `~/.orchestrator/data.db` (never inside the
repo). Listens on port `8000`; in production it also serves the web app's
static export from `dist/web`.

### Entry points
- `src/cli.ts` — the `orchestrator` bin. Runs git preflight, ensures
  `~/.orchestrator` exists, runs Prisma migrations (`migrate deploy`,
  invoked programmatically — the user never runs a migrate command),
  starts the HTTP/Socket.io server, opens the default browser to
  `localhost:8000`, and installs `SIGINT`/`SIGTERM` handlers that kill every
  live Claude process before exiting.
- `src/index.ts` — thinner dev entry point (`pnpm dev:server`, no browser
  auto-open) used by `tsx watch`.
- `src/server.ts` — builds the Express app + `http.Server` + `Socket.io`
  server, registers `/api` routers, serves static web assets in production
  (detected by checking whether `dist/web` exists next to the compiled
  module), and wires the `task:send-message` and `workspace:subscribe`
  socket events.

### Domain modules
- `src/db.ts` — resolves the Prisma schema path (dev vs. packaged), points
  `DATABASE_URL` at `~/.orchestrator/data.db`, exports the singleton
  `prisma` client, and exposes `runMigrations()`.
- `src/git.ts` — git preflight (requires git + a git repo, exits with a
  clear message otherwise), `slugify()` for turning a task title into a
  unique branch-safe slug, `createWorktree()` / `removeWorktree()` which
  shell out to `git worktree add|remove` and `git branch -D` under
  `.worktrees/<slug>` on branch `orchestrator/<slug>`.
- `src/agent/spawner.ts` — the low-level process layer. Spawns the `claude`
  binary with `stream-json` input/output, reads stdout line-by-line as
  NDJSON, extracts session IDs and token usage from heterogeneous event
  shapes, exposes `sendMessage()` (writes a `type: "user"` stream-json
  message to stdin) and `kill()` (SIGTERM, then SIGKILL after a 5s grace
  period). `spawnNewTask()` starts fresh; `spawnResumeTask()` re-attaches
  via `claude --resume <sessionId>`.
- `src/agent/runner.ts` — `startTask()` orchestrates a task end-to-end:
  resolves/creates the worktree, transitions the task to `running`, wires
  spawner callbacks into an async queue (`chain`) so DB writes stay
  ordered, persists every event, accumulates tokens/cost via the
  `TokenAccumulator`, enforces the per-task budget (kills the process and
  moves to `token_exceeded` the instant cumulative tokens reach the
  budget), feeds the workspace-wide budget check after each event, closes
  stdin on a `result` event so the process exits cleanly (event-driven, not
  a timer), and fires `attemptPullRequest()` fire-and-forget on success.
- `src/agent/pricing.ts` — per-token pricing table for Sonnet 4, Opus 4,
  and Haiku 3.5 (converted from per-million-token rates), `detectModel()`
  to pull the model name out of a stream event, `calculateCost()`, and the
  `TokenAccumulator` class that tracks running input/output tokens and
  cost (used both for fresh runs and reseeded from prior totals on
  resume).
- `src/services/process-registry.ts` — in-memory `Map<taskId, ProcessHandle>`
  of currently-running processes; never persisted, purely a live-process
  lookup used for stop/resume/kill-all/message.
- `src/services/task-lifecycle.ts` — `resumeTask()` (bumps the budget,
  re-invokes `startTask({ resume: true })`), `retryTask()` (wipes events
  and runtime fields, restarts from `todo` with the same prompt/worktree),
  `stopTask()` (kills the process, moves task to `failed` with "Manually
  stopped by user"), `sendMessage()` (writes to a running task's stdin).
- `src/services/workspace-budget.ts` — singleton `WorkspaceBudget` row
  (`WORKSPACE_BUDGET_ID`) tracking `budgetCap` / `totalSpent`;
  `checkWorkspaceBudget()` kills every running process and moves all of
  them to `token_exceeded` the moment cumulative spend reaches the cap.
- `src/services/pr.ts` — best-effort `attemptPullRequest()`: pushes the
  task's branch and runs `gh pr create --fill`. Fully silent on any
  failure (no `gh`, not authenticated, no remote) — never affects task
  status.
- `src/shared/events.ts` — the single source of truth for Socket.io event
  names (`tasks:update`, `tasks:delete`, `task:event`, `workspace:update`,
  `workspace:budget-exceeded`, plus client→server `task:send-message` /
  `workspace:subscribe`) and their payload types.

### Data model (`prisma/schema.prisma`, SQLite)
- **Task** — `id, title, prompt, tokenBudget, permissionMode, status,
  sessionId, worktreePath, branchName, totalTokens, totalCost, totalSteps,
  duration, errorInfo, startedAt, completedAt, createdAt, updatedAt` +
  relation to `Event[]`.
- **Event** — `id, taskId, type, content (raw NDJSON line), inputTokens,
  outputTokens, cost, timestamp`, indexed on `taskId`.
- **WorkspaceBudget** — singleton row: `id, budgetCap, totalSpent`.

### REST API (mounted under `/api`, see `src/routes/tasks.ts` and `workspace.ts`)

| Method | Route | Purpose |
|---|---|---|
| POST | `/tasks` | Create task (`todo`) |
| GET | `/tasks` | List all tasks |
| GET | `/tasks/:id` | Task detail + its events |
| PUT | `/tasks/:id` | Edit task (only while `todo`) |
| POST | `/tasks/:id/start` | Spawn the agent |
| POST | `/tasks/:id/stop` | Kill process → `failed` |
| POST | `/tasks/:id/resume` | Resume from `token_exceeded` with a new budget |
| POST | `/tasks/:id/retry` | Retry a `failed` task from scratch |
| DELETE | `/tasks/:id` | Delete task, remove worktree + branch |
| POST | `/tasks/:id/message` | Send a message to a running task's stdin |
| GET | `/workspace/stats` | Status counts, total tokens/cost, budget |
| PUT | `/workspace/budget` | Set/clear the workspace $ cap |
| GET | `/workspace/timeline` | Cross-task activity feed (last 100) |
| GET | `/analytics` | All-time historical stats + 30-day cost-by-day |

Plus `GET /health` and a Socket.io connection for live updates.

### Task state machine

Five states: `todo → running → {done | token_exceeded | failed}`, with
`token_exceeded → running` (resume) and `failed → running` (retry). No
other states or transitions — state changes are driven only by real process
events (exit codes, token totals crossing the budget), never by timers or
"stuck" heuristics.

## Frontend (`apps/web`)

Next.js 14 App Router, TypeScript, Tailwind, shadcn/ui (Radix primitives),
Zustand for state, `socket.io-client` for live updates. Built with
`output: 'export'` — pure static HTML/CSS/JS with no Node server of its own;
in production these files are served directly by the Express server on
port 8000. In dev it runs on port 3000 and talks to the API on 8000
(CORS-enabled server-side for that case).

- `app/page.tsx` — the whole app shell: `TopBar`, `BudgetExceededBanner`,
  `KanbanBoard`, `TimelinePanel`.
- `lib/api.ts` — typed `fetch` wrappers for every REST endpoint; resolves
  the API base URL to `""` (relative) when served from port 8000, or
  `http://localhost:8000` in dev.
- `lib/store.ts` — Zustand store: tasks, per-task events, workspace budget,
  selected task (for the detail drawer), timeline, budget-exceeded flag;
  plus `fetchTasks/fetchWorkspaceStats/fetchTimeline` loaders and
  socket-driven mutators (`updateTask`, `addEvent`, etc.).
- `lib/socket.ts` — Socket.io client wiring.
- `lib/types.ts` — types mirroring the server's Prisma models
  (`Task`, `TaskEvent`, `WorkspaceBudget`, `TimelineEntry`, `AnalyticsData`).
- `lib/event-helpers.ts` / `lib/format.ts` — stream-event display helpers
  and formatting utilities (tokens, currency, duration).

### Components (`components/`)
- `kanban-board.tsx` / `kanban-column.tsx` / `task-card.tsx` — the five-column
  board (`todo, running, done, token_exceeded, failed`) and per-state card
  rendering (start/edit/delete; live step feed + token bar + stop for
  running; summary + PR status for done; budget slider + resume for
  exceeded; error + retry for failed).
- `create-task-modal.tsx` — new task form (title, prompt, token budget with
  presets, permission mode, tags, notes).
- `task-detail-drawer.tsx` — right-side drawer opened from a card: full
  chronological step history, tokens-per-step bar chart, most-expensive
  step, input/output token split, live updates while running.
- `step-feed.tsx` — scrollable live/verbose event feed for a running task.
- `message-input.tsx` — sends a message to a running task's stdin.
- `top-bar.tsx` — session stats (task counts, total tokens/cost, workspace
  budget bar) and opens `analytics-dialog.tsx` (historical, all-time stats).
- `budget-exceeded-banner.tsx` — shown when the workspace cap is hit.
- `timeline-panel.tsx` — cross-task activity feed.
- `socket-provider.tsx` — establishes the Socket.io connection and pipes
  `tasks:update` / `task:event` / `workspace:update` /
  `workspace:budget-exceeded` into the Zustand store.
- `components/ui/*` — shadcn/ui primitives (button, dialog, alert-dialog,
  select, popover, progress, scroll-area, sheet, tooltip, etc.), generated
  per `components.json`.

## Packaging & distribution

The published npm package is entirely self-contained:
1. `pnpm build` builds the web static export and the server bundle
   (`prisma generate` + `tsup`), then `scripts/assemble-dist.js` copies
   server output, web's static `out/`, and the Prisma schema/migrations
   into a single top-level `dist/`.
2. `scripts/verify-dist.js` (run in `prepublishOnly`) sanity-checks that
   `dist/cli.js` exists with a shebang, `dist/web/index.html` exists, and
   the Prisma schema/migrations were copied.
3. On `npm install`, `scripts/postinstall.js` runs `prisma generate`
   against the packaged schema (skipped harmlessly if `dist/` isn't there
   yet, e.g. during local development before the first build).
4. At runtime, `dist/cli.js` is the `orchestrator` bin: git preflight →
   ensure `~/.orchestrator` → `prisma migrate deploy` → start server →
   open browser.

## Design docs

- `.github/copilot-instructions.md` — the authoritative spec for how this
  project should be built (architecture, stack, state model, hard rules)
  and how AI coding agents should approach incremental prompts against it.
- `.github/docs/FEATURES.md` — detailed feature spec: modal fields, card
  contents per state, budget enforcement rules, worktree lifecycle, and
  the full API table.
- `.github/docs/prd.md` — product requirements document.

## Notable hard rules baked into the design

- No SDK, no user-authored config, no developer instrumentation.
- Headless `stream-json` only — no PTY/terminal emulation.
- Git is required; the CLI refuses to start without it.
- One worktree per task; worktrees persist until the user deletes the task
  (no auto-merge).
- Resuming a task always spawns a new process via `--resume <sessionId>` —
  never OS signals.
- Token budgets are enforced by killing the process, not by alerting.
- The workspace budget kills every running process at once when hit.
- No stuck-detection, silence timers, or heuristics — every state
  transition comes from a real process event.
- Cost is computed from Claude's published per-token pricing times actual
  usage reported in the stream, never estimated.
- Every DB write to a task is followed by a `tasks:update` Socket.io
  broadcast, keeping all connected clients in sync.
