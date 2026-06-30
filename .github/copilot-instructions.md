# Orchestrator

## What you're building

An open-source Kanban board that launches, monitors, and budget-controls Claude Code agents on the developer's local machine. The developer runs `npx orchestrator`, a board opens at localhost:8000, they create tasks with prompts and token budgets, and the board spawns Claude Code to do the work. Each task gets its own git worktree for isolation. Steps and token usage stream to the card in real time. When a task exceeds its token budget, the process is killed immediately. The developer can add more budget and resume. A workspace-wide dollar cap can hard-stop all running agents at once.

There is no SDK. There is no config file the user writes. There is no developer instrumentation. The board owns every process it spawns and reads structured output directly.

## How you'll be used

You will receive prompts one at a time, each describing a specific part of the system to build. Build exactly what the prompt asks for. Do not scaffold, stub, or generate code for parts that haven't been prompted yet. Each prompt builds on top of what was built before — treat the existing codebase as the source of truth for what exists, and the current prompt as the source of truth for what to add.

When a prompt references [FEATURES.md](../docs/FEATURES.md), read it for exact field lists, API routes, UI specs, and enforcement rules.

## Architecture

```
User creates task on Kanban
       ↓
Server creates git worktree + branch
       ↓
Server spawns: claude -p "<prompt>" --output-format stream-json
               --input-format stream-json --verbose
               --dangerously-skip-permissions --cwd <worktree>
       ↓
Event parser reads NDJSON from stdout line by line
       ↓
Each event: persisted to SQLite, checked against budget, broadcast via Socket.io
       ↓
Frontend receives Socket.io event → updates card in real time
       ↓
User can send messages to running agent via stdin (bidirectional streaming)
       ↓
Process exits → task moves to done/failed
Budget exceeded → process killed → task moves to token_exceeded (session ID saved for resume)
```

## Stack

- pnpm workspaces monorepo: `apps/server`, `apps/web`
- Server: Node.js, TypeScript strict, Express, Socket.io, Prisma, SQLite
- Frontend: Next.js 14 App Router, TypeScript, Tailwind, shadcn/ui, `output: 'export'`
- Build: tsup for server, Next.js static export for frontend
- DB location: `~/.orchestrator/data.db`
- Distribution: single npm package, `npx orchestrator`

## State model

Five states: `todo`, `running`, `done`, `token_exceeded`, `failed`

- `todo → running`: worktree created, process spawned
- `running → done`: process exits 0
- `running → token_exceeded`: tokens ≥ budget, process killed, session ID saved
- `running → failed`: process exits non-zero or stream error
- `token_exceeded → running`: new budget set, `claude --resume <session_id>`
- `failed → running`: retry, new process, same prompt

No other states or transitions.

## Hard rules

- No SDK, no instrumentation, no config for the user to write
- Headless stream-json only — no node-pty, no xterm.js, no terminal emulation
- Git required — refuse to start without it
- One worktree per task — never run two tasks in the same directory
- No auto-merge — worktrees persist until the user deletes the task
- Resume = new process via `--resume <session_id>`, never OS signals
- Token budgets are enforced by killing the process, not by alerting
- Workspace budget kills ALL running processes when hit
- No stuck detection, no silence timers, no heuristics — state changes come from real events only
- Cost calculated from Claude's published per-token pricing × actual usage from stream events
- Socket.io emits `tasks:update` after every DB write
