# Building Orchestrator From Scratch — A Learning Plan

A staged plan for rebuilding this project by hand, using the finished repo as
a reference. The goal is to write every line yourself and understand why it's
there — not to reproduce the codebase character-for-character.

---

## The key insight: this repo's git history is already a curriculum

`git log` shows 23 feature commits that build the project in a clean
dependency order, each one a self-contained chunk:

```
scaffold → prisma → server infra → git worktrees → spawner → pricing →
runner → workspace budget → lifecycle ops → PR → REST API → socket contract →
web scaffold → kanban → live cards → drawer → top bar → timeline →
analytics → packaging
```

**Don't diff your work against `main`.** Diff it against the commit for the
stage you're on. That way the reference never shows you code from stages you
haven't reached, and each comparison is small enough to actually read.

---

## Setup: two directories, side by side

```bash
# 1. Your build — starts empty
mkdir ~/orchestrator-mine && cd ~/orchestrator-mine && git init

# 2. The reference — a separate clone, parked at whatever stage you're on
git clone <this-repo-url> ~/orchestrator-ref
cd ~/orchestrator-ref && git checkout 25b5934   # stage 1's end state
```

Working rules for the reference clone:

- Keep it checked out at the **current stage's commit**, not `main`. You
  physically cannot spoil later stages for yourself.
- `git show <sha>` shows you *only* what that stage added — the cleanest
  possible answer to "what was I supposed to write?"
- `git show <sha>:path/to/file.ts` reads one file at that point in history.

Two editor windows, two terminals. Yours on the left.

### Prerequisites

- Node ≥ 20.11, pnpm 9, git, and the `claude` CLI on your PATH (the spawner
  shells out to it — nothing works without it).
- **Testing the agent spawner burns real tokens.** Use a trivial prompt
  (`"print hello and stop"`) and a tiny budget (5,000 tokens) while
  developing. Don't loop-test the runner with a real coding prompt.
- Stages 4+ create real git worktrees and branches in your repo. That's
  expected; `.worktrees/` is gitignored.

---

## The loop, per stage

1. **Read the spec, not the code.** `.github/docs/FEATURES.md` (95 lines) and
   `.github/copilot-instructions.md` (72 lines) are the actual specification
   this project was built from — modal fields, card contents per state, budget
   rules, the full API table, the hard rules. `.github/docs/prd.md` has the
   product reasoning. Start each stage from these.
2. **Write it yourself.** No peeking. Get it compiling and running.
3. **Verify it works** using that stage's checkpoint (below) — curl, a
   sqlite query, a throwaway script. Not "it typechecks."
4. **Then diff:** `cd ~/orchestrator-ref && git show <sha>`. Look for
   *structural* differences — a case you didn't handle, a race you didn't
   see, a boundary you put in the wrong module. Ignore naming and formatting.
5. **Write down what surprised you.** One line per stage. That file is the
   real output of this exercise.
6. Advance the reference: `git checkout <next-sha>`.

**Rule to hold yourself to:** you may look at the reference after a genuine
attempt, or after 30 minutes stuck. Not before. Copy-pasting a file you
haven't tried to write is a wasted stage — you'll retain nothing.

---

## Stage map

| # | Stage | Commit | Writes | Est. |
|---|---|---|---|---|
| 1 | Monorepo scaffold | `25b5934` | workspace configs, tsconfigs, tsup | 1 session |
| 2 | Prisma + SQLite | `1aa0d71` | `schema.prisma`, `db.ts`, migration | 1 |
| 3 | Server infra | `6838eff` | `server.ts` (express + socket.io) | 1 |
| 4 | Git worktrees | `8b2f1fe` | `git.ts` | 1 |
| 5 | **Spawner + stream parser** | `b72cc4a` | `agent/spawner.ts` | 2–3 |
| 6 | Cost accounting | `4f5dbb2` | `agent/pricing.ts` | 1 |
| 7 | **Runner + per-task budget** | `ea5f0c4` | `agent/runner.ts`, `process-registry.ts` | 2–3 |
| 8 | Workspace budget | `1bb3cb8` | `services/workspace-budget.ts` | 1 |
| 9 | Lifecycle ops | `edca5b4`, `d2118ab` | `services/task-lifecycle.ts` | 1–2 |
| 10 | PR automation | `3d06b11` | `services/pr.ts` | 0.5 |
| 11 | Tasks REST API | `1b6a31a` | `routes/tasks.ts` | 1–2 |
| 12 | Workspace/analytics API | `6cc8cf7` | `routes/workspace.ts` | 1 |
| 13 | Socket event contract | `145ae2f` | `shared/events.ts` | 0.5 |
| 14 | Web scaffold + kanban | `4a0331f` | Next app, Tailwind, shadcn, board | 2 |
| 15 | Create-task modal | `20a52f2` | `create-task-modal.tsx`, form UI | 1–2 |
| 16 | Cards by state | `01ab67c` | `task-card.tsx`, `lib/format.ts` | 2 |
| 17 | Live monitoring | `00d37ca` | `step-feed.tsx`, `message-input.tsx` | 2 |
| 18 | Detail drawer | `e656e79` | `task-detail-drawer.tsx`, `event-helpers.ts` | 2–3 |
| 19 | Top bar + budget | `d061b39` | `top-bar.tsx`, banner | 1–2 |
| 20 | Timeline | `06f04ce` | `timeline-panel.tsx` | 1 |
| 21 | Analytics | `3a99c79` | `analytics-dialog.tsx` | 1 |
| 22 | Packaging | `1ba2739` | `cli.ts`, `assemble-dist.js`, `verify-dist.js` | 1–2 |

~6,300 lines of TS/TSX total. Budget 30–50 focused sessions. The backend
(stages 1–13) is ~2,000 lines but holds most of the difficulty; the frontend
is ~4,300 lines but much of it is shadcn components you generate with a CLI.

---

## Phase A — Skeleton (stages 1–3)

**Stage 1 — Monorepo scaffold** (`25b5934`)

pnpm workspace with `apps/server` and `apps/web`, a shared
`tsconfig.base.json`, per-app tsconfigs, a tsup config for the server, and a
root `package.json` whose scripts drive both via `pnpm --filter`.

*What to actually learn:* why the root package orchestrates instead of each
app being independent; what `pnpm --parallel --filter "@orchestrator/*" dev`
does; why the server is ESM-only (`"type": "module"`) and what that forces
later (`.js` extensions in relative imports of `.ts` files — this will bite
you in stage 3 if you skip it).

*Checkpoint:* `pnpm dev` starts both apps; `pnpm typecheck` passes.

**Stage 2 — Prisma + SQLite** (`1aa0d71`)

Three models: `Task`, `Event`, `WorkspaceBudget`. Design them from
FEATURES.md before looking — decide for yourself what a task needs to store
(budget, status, session id, worktree path, running totals, timing, error).
Then `db.ts`: resolve `~/.orchestrator/data.db`, set `DATABASE_URL`, export
the client, and run migrations programmatically.

*The subtle bit:* `DATABASE_URL` must be set **before** `@prisma/client` is
imported, which is why `db.ts` uses a top-level `await import()` after
calling `configureDatabaseUrl()`. Try writing it with a normal static import
first and watch it fail — that failure is the lesson.

*Checkpoint:* `sqlite3 ~/.orchestrator/data.db ".tables"` lists your tables;
a scratch script can create and read back a Task row.

**Stage 3 — Server infra** (`6838eff`)

Express + `http.createServer` + Socket.io on port 8000, a `/health` route,
CORS for the Next dev server on :3000.

*Checkpoint:* `curl localhost:8000/health` returns `{"status":"ok"}`.

---

## Phase B — The engine (stages 4–10)

This is the interesting half of the project. **None of it has a UI.** Resist
the urge to jump ahead to React — everything here is testable from a terminal,
and debugging it later through a browser is far harder.

**Stage 4 — Git worktrees** (`8b2f1fe`)

`gitPreflight()` (is git installed? are we in a repo? — hard-exit 1 with a
useful message if not), `slugify()`, `createWorktree()`, `removeWorktree()`.
One worktree per task at `.worktrees/<slug>` on branch `orchestrator/<slug>`.

*Learn:* `execFileSync` vs `execSync` and why argument arrays matter when
task titles are user input. Why removal must be idempotent (`gitQuiet`).

*Checkpoint:* a scratch script that creates a worktree, `ls`es it, removes
it, and runs twice in a row without throwing.

**Stage 5 — Spawner + stream-json parser** (`b72cc4a`) ⭐

The heart of the project. Spawn `claude -p <prompt> --output-format
stream-json --input-format stream-json --verbose` in the worktree, read
stdout line-by-line with `readline`, JSON.parse each line, and extract event
type, session id, and token usage.

The original built this with a **throwaway harness before wiring it to
anything** — recover it and do the same:

```bash
git show b72cc4a:scripts/test-spawner.ts > scripts/test-spawner.ts   # in YOUR repo
```

Actually, better: write your own version of that harness first (spawn, dump
every parsed event to the console), *then* compare.

*The hard parts, flagged in advance:*
- Usage data isn't in a fixed location — it appears at the top level, under
  `message.usage`, or under `usage` depending on event type. Same for
  `session_id` and `model`. You need defensive readers, not `as any`.
- In `--input-format stream-json` mode the `-p` prompt is **not consumed**;
  you must write the first user message to stdin as a JSON line. This is
  genuinely confusing and worth discovering yourself.
- Killing needs SIGTERM then SIGKILL after a grace period, and must be
  idempotent.

*Checkpoint:* your harness prints a live event stream from a real one-line
Claude task, including a captured session id and non-zero token counts.

**Stage 6 — Cost accounting** (`4f5dbb2`)

Per-token pricing table, `detectModel()`, `calculateCost()`, and a
`TokenAccumulator` class. Pure functions and in-memory state — no I/O.

*Learn:* why this is a separate module with zero dependencies on Prisma or
the process (it's the only trivially unit-testable part of the backend), and
why costs are rounded to 6 decimals. Recover `scripts/test-cost.ts` from
`4f5dbb2` for a comparison after you write your own checks.

*Checkpoint:* known token counts produce hand-verifiable dollar amounts.

**Stage 7 — Runner + per-task budget** (`ea5f0c4`) ⭐

The glue: resolve/create the worktree, flip the task to `running`, spawn,
and for every event — persist an `Event` row, accumulate tokens/cost, update
the task, and **kill the process the moment cumulative tokens ≥ budget**.
Plus `process-registry.ts`, an in-memory `Map<taskId, ProcessHandle>`.

*The hard parts:*
- Callbacks fire faster than async DB writes complete. The reference
  serializes them through a promise chain (`chain = chain.then(...)`). Try it
  without and watch your event ordering and totals corrupt — then fix it.
- A `settled` flag is needed so a budget kill, a process exit, and an error
  don't each try to write a terminal state.
- `onExit` must re-read the task and bail if something else already moved it
  out of `running` (e.g. a manual stop). Otherwise you overwrite a correct
  terminal state with a wrong one.
- The `result` event ends the agent's turn — close stdin so the process exits
  naturally rather than using a timer.

*Checkpoint:* a script that inserts a task row and calls `startTask()`, then
watch rows appear in the `Event` table live via
`watch -n1 'sqlite3 ~/.orchestrator/data.db "select count(*),sum(inputTokens+outputTokens) from Event"'`.
Set a deliberately tiny budget and confirm the process is killed and the task
lands in `token_exceeded` with its `sessionId` saved.

**Stage 8 — Workspace budget** (`1bb3cb8`)

A singleton row holding a dollar cap and cumulative spend; when spend crosses
the cap, kill *every* running process and move all affected tasks to
`token_exceeded`.

*Checkpoint:* two tasks running, a cap set just above current spend — both
die together.

**Stage 9 — Lifecycle ops** (`edca5b4`, then bugfix `d2118ab`)

`stopTask`, `resumeTask` (new process via `--resume <sessionId>` with a
raised ceiling — never signals), `retryTask` (clear events, reset counters,
reuse the worktree), `sendMessage` (write a user message to a running
process's stdin).

Read `d2118ab` separately — it's a real bug that was found in the runner, and
understanding what broke is worth more than the feature commits.

**Stage 10 — PR automation** (`3d06b11`)

`gh pr create` on success, fully best-effort: no `gh`, no auth, no remote —
all swallowed silently. Never blocks or changes task status. Short module,
good lesson in designing something that's allowed to fail.

---

## Phase C — API surface (stages 11–13)

**Stage 11 — Tasks REST API** (`1b6a31a`). Ten endpoints; the table is in
FEATURES.md. Write the validation helpers first (`parseRequiredString`,
`parseTokenBudget`, `parsePermissionMode`) and note the status-code
discipline: `400` bad input, `404` missing, `409` wrong state, `202` for
accepted-but-async starts.

**Stage 12 — Workspace + analytics** (`6cc8cf7`). Stats, budget cap
get/set, timeline, and an `/analytics` aggregate.

**Stage 13 — Socket event contract** (`145ae2f`). Extract the event-name
strings you've been scattering into a single `shared/events.ts` with typed
payloads, then refactor every emitter to use it. Doing this *after* living
with raw strings for nine stages is the point — you'll feel why it matters.

*Phase C checkpoint:* drive the whole product from the terminal — create a
task with `curl`, start it, watch a tiny socket.io-client script print the
live event stream, stop it, delete it. **If this works, the product works.**
Everything after this is presentation.

---

## Phase D — Frontend (stages 14–21)

**Stage 14** (`4a0331f`) — Next 14 App Router with `output: "export"`,
Tailwind, shadcn/ui init, and a static five-column board. Generate the
`components/ui/*` primitives with the shadcn CLI rather than typing them —
they're vendored library code, not your project's logic.

**Stage 15** (`20a52f2`) — the create-task modal (title, prompt, budget,
permission mode), plus `lib/types.ts`, `lib/api.ts`, `lib/store.ts`.

**Stage 16** (`01ab67c`) — `task-card.tsx` grows to ~500 lines because each
of the five states renders differently, with different actions. FEATURES.md
specifies each one; build from that spec.

**Stage 17** (`00d37ca`) — wire Socket.io into Zustand so cards update live,
plus the inline step feed and mid-task message input. *Watch for:* event
de-duplication (you'll receive the same event via both fetch and socket),
and cleaning up listeners on unmount.

**Stage 18** (`e656e79`) — the detail drawer (~600 lines) and
`event-helpers.ts`, which turns raw stream-json blobs into human-readable
steps. The most intricate frontend work in the project.

**Stages 19–21** (`d061b39`, `06f04ce`, `3a99c79`) — top bar with session
stats and budget control, the activity timeline, and the analytics dialog.

---

## Phase E — Ship it (stage 22)

**Stage 22** (`1ba2739`) — `cli.ts` (preflight → data dir → migrate → serve →
open browser), the tsup shebang banner, `assemble-dist.js`,
`verify-dist.js`, `postinstall.js`, and the prod/dev detection in `server.ts`
that decides whether to serve `dist/web/` statically or defer to the Next dev
server. `docs/build-and-publish.md` in this repo covers the whole pipeline.

*Checkpoint:* `npm pack`, install the resulting tarball globally in a
different directory, run `orchestrator`, and use your own build.

---

## Things that will actually be hard

Ranked, so you're not blindsided:

1. **Async ordering in the runner** (stage 7) — the promise chain, the
   `settled` flag, terminal-state races. This is where you'll lose the most
   time and learn the most.
2. **Stream-json's shape** (stage 5) — undocumented-feeling variation in
   where usage/session/model live. Log everything raw before you parse.
3. **Kill semantics** (stages 5, 7, 8) — idempotent, graceful-then-forced,
   and correct when three code paths race to kill the same process.
4. **ESM + Prisma + tsup interactions** (stages 2, 22) — `.js` import
   extensions, generated client resolution, `DATABASE_URL` timing.
5. **Socket/store consistency** (stage 17) — duplicate events, stale
   closures, listener leaks.

Everything else is mechanical by comparison.

---

## Deliberate deviations worth trying

Once you've matched a stage, changing it is where understanding gets proven:

- Add a `pnpm test` setup with real unit tests for `pricing.ts` and
  `slugify` — the original has none.
- Replace the promise chain in the runner with a proper async queue.
- Add a `paused` state, or per-task model selection.
- Swap SQLite for Postgres and see what `db.ts` and packaging assume.

If you do these, do them *after* matching the stage, not instead of it.

---

## Keep a log

One file, one entry per stage: what you got wrong, what the reference did
differently, and whether you agree with it. In three weeks that log will be
the thing you actually reread — not the code.
