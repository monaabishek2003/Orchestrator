# Build Plan — Task Checklist

> Track progress here. Update checkboxes as tasks complete.

---

## PART 1 — SDK (`packages/sdk`)

### Package Setup
- [x] `cd packages/sdk && pnpm init`
- [x] `pnpm add -D typescript tsup @types/node`
- [x] package.json: name, version, main, module, types, files fields
- [x] Build script: `"build": "tsup src/index.ts --format cjs,esm --dts"`
- [x] tsconfig.json extending base

### Agent Class (`src/index.ts`)
- [x] Create `src/index.ts`
- [x] Constructor: `(name: string, baseUrl?: string)` — default `http://localhost:8000`
- [x] `start()` → POST `/agent/start`, store returned `id`
- [x] `step(message, options?)` → POST `/agent/step` with `{ agentId, message, tokens?, cost? }`
- [x] `error(message)` → POST `/agent/error`
- [x] `end()` → POST `/agent/end`
- [x] Every method in try/catch — on failure, do nothing
- [x] Skip POSTs if `agentId` is unset — same silent behavior
- [x] `pnpm build` → verify dist/ has index.js, index.mjs, index.d.ts

### Test Scripts (`examples/`)
- [x] Init examples dir, link local SDK, add tsx
- [x] `agent-ok.ts`: starts, 5 steps with 3s delay, ends cleanly
- [x] `agent-error.ts`: starts, 2 steps, calls `.error('Rate limit hit')`
- [x] `agent-stuck.ts`: starts, 1 step, sleeps 120s (attention engine flags at 45s)
- [x] Run all three against server, verify correct status in DB

### Publish SDK
- [x] `npm publish --access public` from `packages/sdk/`
- [x] Fallback to scoped name if taken
- [x] Verify with `npm info orchestrator-sdk`

---

## PART 2 — SERVER additions (`apps/server`)

### Already Done
- [x] Monorepo with pnpm workspaces
- [x] Prisma schema (Agent + Event tables) + SQLite
- [x] Six REST endpoints
- [x] Attention engine timer (45s stuck detection)

### Step 1 — Socket.io Wiring
- [x] `pnpm --filter @orchestrator/server add socket.io`
- [x] Wrap Express in `http.createServer()`
- [x] Attach Socket.io with `cors: { origin: '*' }` for dev
- [x] Export `io` instance for routes to import
- [x] Add `io.emit('agents:update')` after each prisma write in POST routes
- [x] Also emit from attention engine when agent gets flagged
- [x] Test: curl endpoints, confirm server responds normally

### Step 2 — Resolve Endpoint
- [x] `POST /agent/:id/resolve` → sets `needsAttention=false`, `attentionReason=null` → emits `agents:update`

### Step 3 — Static File Serving (after FE is built)
- [x] `express.static('public')` middleware
- [x] Wildcard `app.get('*')` returning `public/index.html`
- [x] Both only active if `public/` directory exists

### Step 4 — npx Support (after FE is bundled)
- [x] package.json: `"bin": { "orchestrator-server": "./dist/index.js" }`
- [x] Add shebang `#!/usr/bin/env node` to entry file
- [x] DB path: `~/.orchestrator/dev.db`, ensure dir exists on startup
- [x] Run `prisma migrate deploy` on startup if needed
- [x] tsup build: `src/` → `dist/`
- [x] `"files": ["dist", "prisma", "public"]`

### Step 5 — Publish Server
- [x] Copy `apps/web/out/` → `apps/server/public/`
- [x] Build server
- [x] Test with `npm pack` from fresh folder
- [ ] `npm publish --access public`
- [ ] Verify `npx orchestrator-server` from fresh folder

---

## PART 3 — FRONTEND (`apps/web`)

### Step 1 — Scaffold
- [x] `pnpm create next-app@latest .` (TS, Tailwind, App Router)
- [x] `pnpm dlx shadcn@latest init` (default style, slate)
- [x] Add components: button, card, badge, table, sheet, separator, skeleton
- [x] `pnpm add socket.io-client date-fns`
- [x] next.config.js: `output: 'export'`, `images: { unoptimized: true }`
- [x] Confirm `:3000` loads

### Step 2 — useAgents Hook
- [x] `app/hooks/use-agents.ts`
- [x] On mount: fetch `/agents`, set state
- [x] Connect Socket.io, refetch on `'agents:update'`
- [x] Cleanup on unmount
- [x] Return `{ agents, loading, refetch }`

### Step 3 — StatCards
- [x] 4 cards: total, running, needsAttention, done
- [x] Responsive grid, big bold numbers

### Step 4 — AttentionPanel
- [x] Filter to `needsAttention === true`, return null if empty
- [x] Red-tinted border, one row per agent: name, reason, resolve button
- [x] Resolve button POSTs to `/agent/:id/resolve`

### Step 5 — AgentGrid
- [x] shadcn Table: Name, Status (Badge), Last message, Last update (relative)
- [x] Sort by lastUpdateAt desc
- [x] Badge colors: running=blue, error=red, done=gray
- [x] Rows clickable → set selectedAgentId

### Step 6 — AgentDrawer
- [x] shadcn Sheet, slides from right
- [x] Fetches `/agent/:id` on open
- [x] Events in reverse-chronological order
- [x] Color-coded: info=neutral, error=red
- [x] Shows tokens/cost when present

### Step 7 — Wire Up page.tsx
- [x] Client component with useAgents
- [x] Header → StatCards → AttentionPanel → AgentGrid → AgentDrawer

### Step 8 — Polish
- [x] Empty state with install command + code snippet
- [x] Skeleton loaders
- [x] Page title + emoji favicon

### Step 9 — Static Export
- [x] `pnpm --filter @orchestrator/web build` → `apps/web/out/`
- [x] Verify out/ has index.html + JS chunks
- [x] Script to copy out/ → server/public/

---

## Definition of Done

- [ ] `npm install orchestrator-sdk` works from any machine
- [ ] `npx orchestrator-server` works, opens at localhost:8000
- [ ] Agent appears live in dashboard when SDK script runs
- [ ] Attention panel lights up on agent error
- [ ] Drawer shows full event log on row click
- [ ] Repo on GitHub with README + screenshot + 3-bullet pitch
