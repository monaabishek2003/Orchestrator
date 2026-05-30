# 🎬 Coffee Inventory Platform Demo

A real-world demo that showcases every feature of The Orchestrator control plane — exactly the user story from the product vision: a founder building a Coffee Inventory Management Platform with four AI agents working in parallel.

---

## What You're Demoing

Four agents collaborate to build a full-stack application:

| Agent | Role | What it demos |
|-------|------|---------------|
| **Frontend Agent** | React + Vite + TailwindCSS | Live goal/task updates, **Pause / Resume** |
| **Backend Agent** | FastAPI REST API | Steady throughput of step events with tokens & cost |
| **Database Agent** | Schema design + migrations | **Modify Instruction** — waits for human decision! |
| **Testing Agent** | pytest integration suite | The `waiting` status (depends on backend) |

The whole demo runs for about **3–4 minutes** and produces ~40 timeline events across the four agents.

---

## Setup

### 1. Start the server

```bash
cd apps/server
pnpm dev
```

You should see: `Orchestrator server running on http://localhost:8000`

### 2. Open the dashboard

Open **http://localhost:8000** in your browser.

### 3. Run the demo (in another terminal)

```bash
cd examples
npx tsx demo-coffee-platform.ts
```

You'll see the four agents pop up live in the dashboard within a few seconds.

---

## The Demo Script (what to do, in order)

Time the demo around the Database Agent's decision point — that's the showstopper moment. The whole thing takes about 3–4 minutes.

### Beat 1 — Show the dashboard filling up (~10s after starting)

> "Four agents just spun up. Each one is building a different layer of the stack."

- Point at **Stat Cards** filling with live counts
- Point at the **Testing Agent** showing `waiting` status (purple) — it's blocked on the backend

### Beat 2 — Open the Frontend Agent (~30s in)

> "Click any agent to see what it's actually doing right now."

- Click **Frontend Agent**
- Point at the **Reasoning Panel** at the top: *Current Goal* and *Current Task* update in real time
- Scroll the **timeline** — every step shows tokens used and cost

### Beat 3 — Pause the Frontend Agent (~1 minute in)

> "Watch this — I can pause an agent mid-execution without killing it."

- With the Frontend Agent's drawer still open, click **Pause**
- The status badge turns **amber**, the **Paused** stat card increments
- A `paused` event appears in the timeline (amber pause icon)
- In the terminal you'll see `[Frontend] ⏸  Pause signal received`
- **Wait 5–10 seconds**, then click **Resume**
- A `resumed` event appears (green play icon), agent continues from where it stopped

### Beat 4 — The Database Agent decision point (~1.5 min in)

This is the moment.

> "Now look at the Database Agent — it's hit a decision point and is asking for clarification."

- Open the **Database Agent**
- The **timeline** shows an amber `warning` event:
  *"Multiple valid approaches detected: SQLite vs PostgreSQL. Awaiting decision."*
- The **Current Task** says: *"Awaiting storage engine decision…"*
- Wait ~40 seconds: the agent now appears in the **Attention Panel** (auto-detected by the stuck monitor)

> "I don't have to restart the agent. I can just tell it what to do."

- Click **Modify Instruction**
- Type: `Use PostgreSQL — production-grade required`
- Hit **Send Instruction**
- The terminal shows: `[Database] 📩 Instruction received: "Use PostgreSQL..."`
- A blue `instruction_modified` event appears in the timeline
- The agent **resumes immediately** with the new instruction — applying PostgreSQL migrations, seeding data, verifying integrity
- Status returns to `running`, attention flag clears

### Beat 5 — Testing Agent unblocks (~2.5 min in)

> "Once the backend is done, the Testing Agent starts on its own."

- The Testing Agent transitions from `waiting` → `running`
- Watch the test events stream into its timeline

### Beat 6 — Everything completes (~3.5 min in)

- All four agents end with `done` status (gray badge)
- The Stat Cards show: 4 Total / 0 Running / 0 Paused / 0 Attention / 4 Completed

---

## Variations to Try

### Multiple paused agents

Pause Frontend, Backend, AND Database at the same time. Watch the Paused stat card show **3**.

### Modify instructions multiple times

Send Database Agent: `"Use SQLite"` first, then change your mind: `"Actually use PostgreSQL"`. The agent acts on whichever arrives first — same behavior as a real LLM agent receiving redirected instructions.

### Let the stuck monitor fire

Don't send the Database Agent any instruction for 40+ seconds. You'll see it auto-flagged in the **Attention Panel** at the top of the dashboard. Click **Resolve** to clear it (this is a separate path from sending an instruction).

### Pause during tests

Once the Testing Agent starts running, pause it mid-suite. Resume it — picks up where it left off.

---

## Why This Demo Works

This demo hits every product pillar from the vision doc:

| Vision pillar | How the demo proves it |
|---------------|------------------------|
| **Visibility** | Reasoning Panel shows live goal/task; timeline shows full execution history |
| **Control** | Pause / Resume / Modify Instruction all work without restart |
| **Debugging** | Click any agent → see exactly what it did, in order, with token/cost data |
| **Multi-agent** | Four agents work in parallel, each with independent state |
| **Auto-attention** | Stuck monitor auto-flags the Database Agent at 40s |
| **Resume without restart** | Database Agent waits indefinitely for human input, then continues — never restarts |

The success metric from the vision doc:

> "When an agent requires intervention, the user should be able to inspect, understand, modify, and resume — without restarting the workflow."

The Database Agent moment is exactly this story — and it happens live on stage.

---

## Customizing the Demo

Open `demo-coffee-platform.ts` to tweak:

- **Step durations** — `jitter(base, spread)` controls per-step delay
- **Number of steps** — each agent has a `steps` array; add or remove entries
- **Agent names / project name** — search-and-replace "Coffee Inventory" if you want a different domain

For a longer demo, increase the `jitter()` base value. For a faster screencast, decrease it.
