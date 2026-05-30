# Orchestrator Control Plane — Feature Documentation

## Overview

The control plane upgrade transforms The Orchestrator from a **read-only monitoring tool** into a **live control system**. You can now pause agents mid-execution, resume them, and inject new instructions — all without restarting the workflow. Agents also surface their current goal and task, giving you full visibility into what they are thinking right now.

---

## Architecture: How Controls Reach Agents

The core challenge was: **how does the dashboard talk back to a running agent process?**

### The Webhook Pattern

When an agent registers a control handler, the SDK starts a tiny HTTP server on a random local port and registers that URL with the Orchestrator server on startup.

```
Dashboard → POST /agent/:id/pause
               ↓
          Server updates DB
               ↓
          Server POSTs to agent's webhookUrl (e.g. http://127.0.0.1:54321)
               ↓
          SDK receives the event → calls your onControl() callback
```

**Why this approach:**
- No polling — controls are delivered instantly
- Zero npm dependencies — uses Node's built-in `http` module
- Fire-and-forget — if the agent process is no longer running, the server just silently ignores the failed POST
- Fully opt-in — if you don't pass `onControl`, the SDK works exactly as before

---

## New SDK API

### `onControl` Callback

Register a handler when constructing the agent. The SDK starts a local HTTP listener and gives its URL to the server.

```typescript
import { Agent } from 'orchestrator-sdk';

const agent = new Agent('my-agent', {
  onControl: async ({ type, payload }) => {
    if (type === 'pause') {
      // stop processing, set a flag, etc.
    }
    if (type === 'resume') {
      // continue processing
    }
    if (type === 'modify_instruction') {
      console.log('New instruction from user:', payload);
      // update your agent's context / system prompt
    }
  },
});

await agent.start();
```

**ControlEvent types:**

| type | payload | When fired |
|------|---------|------------|
| `pause` | — | User clicks Pause in dashboard |
| `resume` | — | User clicks Resume in dashboard |
| `modify_instruction` | instruction text | User submits a new instruction |

---

### `agent.setGoal(goal: string)`

Tell the server what high-level objective the agent is working toward. Displayed in the Agent Reasoning Panel in the drawer.

```typescript
await agent.setGoal('Build Coffee Inventory Platform');
```

---

### `agent.setTask(task: string)`

Tell the server what specific task the agent is executing right now. Call this before each step to keep the dashboard current.

```typescript
await agent.setTask('Implementing GET /inventory endpoint');
await agent.step('Created route handler and Pydantic response model', { tokens: 840, cost: 0.0084 });
```

---

### `agent.warn(message: string)`

Log a non-fatal warning. Appears in the timeline with an amber triangle icon. Useful for surfacing things the agent is uncertain about without triggering the full attention/error flow.

```typescript
await agent.warn('Multiple valid approaches detected — defaulting to REST, not GraphQL');
```

---

### `agent.close()`

Closes the local webhook HTTP server. Call this when the agent process is done if you want a clean shutdown. `end()` calls `close()` automatically.

---

## Full Example

```typescript
import { Agent } from 'orchestrator-sdk';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

let paused = false;

const agent = new Agent('database-agent', {
  onControl: async ({ type, payload }) => {
    if (type === 'pause')              paused = true;
    if (type === 'resume')             paused = false;
    if (type === 'modify_instruction') {
      // e.g. update system prompt, re-plan, etc.
      console.log('Updated instruction:', payload);
    }
  },
});

await agent.start();
await agent.setGoal('Design and migrate database schema');

const steps = [
  'Drafting schema tables',
  'Creating initial migration',
  'Evaluating storage options',
];

for (const step of steps) {
  // Honor pause signal between steps
  while (paused) await sleep(200);

  await agent.setTask(step);
  await agent.step(`Completed: ${step}`, { tokens: 500, cost: 0.005 });
  await sleep(2000);
}

await agent.end();
```

---

## New Server Endpoints

### `POST /agent/:id/pause`

Pauses an agent. Sets `status = 'paused'`, creates a `paused` event in the timeline, stores an Intervention record, and fires the webhook.

**Response:** Updated agent object.

---

### `POST /agent/:id/resume`

Resumes a paused agent. Sets `status = 'running'`, creates a `resumed` event, stores an Intervention record, and fires the webhook.

**Response:** Updated agent object.

---

### `POST /agent/:id/instruction`

Sends a new instruction to the agent without restarting it.

**Body:**
```json
{ "instruction": "Use PostgreSQL instead of SQLite" }
```

Creates an `instruction_modified` event in the timeline, stores an Intervention record, and fires the webhook with `{ type: 'modify_instruction', payload: '...' }`.

**Response:** `{ ok: true }`

---

### `PATCH /agent/:id`

Updates the agent's `currentGoal` and/or `currentTask`. Called by the SDK's `setGoal()` and `setTask()` methods.

**Body:**
```json
{ "currentGoal": "Build REST API", "currentTask": "Implement /users endpoint" }
```

---

### `POST /agent/warn`

Logs a `warning` event for the agent. Called by the SDK's `warn()` method.

**Body:**
```json
{ "agentId": "...", "message": "Rate limit approaching — throttling requests" }
```

---

## New Database Models

### `Intervention`

Every control action from the dashboard is recorded as an Intervention. This gives you a full audit trail of human-in-the-loop actions.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | CUID |
| `agentId` | string | Parent agent |
| `type` | string | `pause` \| `resume` \| `modify_instruction` |
| `payload` | string? | Instruction text (for modify_instruction only) |
| `createdAt` | datetime | When the action was taken |

---

### Updated `Agent` fields

| Field | Type | Description |
|-------|------|-------------|
| `webhookUrl` | string? | SDK's local HTTP server URL, set on `agent.start()` |
| `currentGoal` | string? | High-level objective, set by `agent.setGoal()` |
| `currentTask` | string? | Current step, set by `agent.setTask()` |

---

### Updated `Event` types

| type | Color | Triggered by |
|------|-------|-------------|
| `info` | neutral | `agent.step()` |
| `error` | red | `agent.error()` |
| `warning` | amber | `agent.warn()` |
| `paused` | amber | Dashboard Pause button |
| `resumed` | green | Dashboard Resume button |
| `instruction_modified` | blue | Dashboard Modify Instruction |

---

## Dashboard Changes

### Status Badges

Five statuses are now fully styled:

| Status | Color | Meaning |
|--------|-------|---------|
| `running` | blue (pulsing) | Actively executing |
| `paused` | amber | Paused by user, awaiting resume |
| `waiting` | indigo | Waiting on a dependency |
| `error` | red (pulsing) | Crashed or threw an error |
| `done` | gray | Completed successfully |

---

### Stat Cards

A fifth card — **Paused** — was added to the dashboard header grid. The grid now shows: Total → Running → Paused → Needs Attention → Completed.

---

### Agent Drawer — Control Buttons

When you open a running or paused agent's drawer, control buttons appear below the agent name:

- **Running agent:** shows a **Pause** button
- **Paused agent:** shows a **Resume** button (styled amber)
- **Both states:** shows a **Modify Instruction** button

Buttons disable while the action is in flight and re-enable after completion.

---

### Modify Instruction Modal

Clicking **Modify Instruction** opens a modal dialog with a textarea. Type the new instruction and submit. The agent receives it immediately via webhook and a blue `instruction_modified` event appears in the timeline.

---

### Agent Reasoning Panel

When `currentGoal` or `currentTask` is set on an agent, a panel appears at the top of the drawer (above the event timeline) showing:

- **Current Goal** — with a violet target icon
- **Current Task** — with a blue lightning bolt icon

This panel only renders when data is present — it is invisible for agents that don't call `setGoal`/`setTask`.

---

### Event Timeline — New Event Types

The timeline now renders distinct icons and colors for every event type:

| Event type | Icon | Color |
|------------|------|-------|
| `info` | Info circle | neutral |
| `error` | Alert circle | red |
| `warning` | Triangle alert | amber |
| `paused` | Pause circle | amber, italic text |
| `resumed` | Play circle | green, italic text |
| `instruction_modified` | Book marker | blue |

---

## What Has NOT Changed

- `agent.start()`, `agent.step()`, `agent.error()`, `agent.end()` — identical behavior
- Old `new Agent(name, baseUrl)` string constructor still works (backwards compatible)
- Attention engine (40s stuck detection) still runs unchanged
- Socket.io `agents:update` broadcast — same behavior, same event name
- All existing REST endpoints — unchanged responses

---

## Build Plan Checklist Update

| Feature | Status |
|---------|--------|
| Pause / Resume agent | ✅ Done |
| Modify Instruction (webhook delivery) | ✅ Done |
| Agent Reasoning Panel (Goal + Task) | ✅ Done |
| Warning events | ✅ Done |
| Intervention audit trail in DB | ✅ Done |
| New status badges (paused, waiting, error) | ✅ Done |
| Paused count in Stat Cards | ✅ Done |
| Backwards-compatible SDK | ✅ Done |
