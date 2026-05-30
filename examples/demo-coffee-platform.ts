/**
 * Coffee Inventory Platform — Multi-Agent Demo
 *
 * Simulates 4 AI agents collaborating to build a full-stack application.
 * Showcases every feature of the Orchestrator control plane:
 *
 *   • Live goal/task updates (Reasoning Panel)
 *   • Pause / Resume (try it on Frontend Agent)
 *   • Modify Instruction (Database Agent will wait for YOUR decision!)
 *   • Auto-attention detection (stuck monitor flags blocked agents at 40s)
 *   • Multiple statuses: running, paused, waiting, error, done
 *
 * Usage:
 *   1. Start the server:    pnpm --filter @orchestrator/server dev
 *   2. Open the dashboard:  http://localhost:8000
 *   3. Run this demo:       cd examples && npx tsx demo-coffee-platform.ts
 */

import { Agent } from "@orchestrator/sdk";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const jitter = (base: number, spread = 800) =>
  base + Math.floor(Math.random() * spread);

function log(agent: string, message: string) {
  const colors: Record<string, string> = {
    Frontend: "\x1b[36m",
    Backend: "\x1b[35m",
    Database: "\x1b[33m",
    Testing: "\x1b[32m",
  };
  const c = colors[agent] ?? "";
  console.log(`${c}[${agent}]\x1b[0m ${message}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Frontend Agent — builds the React UI
//    Demonstrates: setGoal, setTask, pause/resume
// ─────────────────────────────────────────────────────────────────────────────

async function runFrontendAgent() {
  let paused = false;
  let pauseAck = false;

  const agent = new Agent("Frontend Agent", {
    onControl: async ({ type }) => {
      if (type === "pause") {
        paused = true;
        pauseAck = false;
        log("Frontend", "⏸  Pause signal received — finishing current step");
      } else if (type === "resume") {
        paused = false;
        log("Frontend", "▶  Resume signal received — continuing");
      }
    },
  });

  await agent.start();
  await agent.setGoal("Build Coffee Inventory Platform — React frontend");

  const steps: Array<[string, string, number, number]> = [
    ["Scaffolding project", "Created Vite + React + TypeScript project", 320, 0.0032],
    ["Installing UI library", "Added TailwindCSS, shadcn/ui, lucide-react", 180, 0.0018],
    ["Designing layout", "Built Sidebar, Navbar, PageContainer components", 1240, 0.0124],
    ["Inventory dashboard page", "Implemented summary cards + product table", 2100, 0.021],
    ["Buyer management page", "Implemented buyer list with search and pagination", 1850, 0.0185],
    ["Wiring API client", "Generated TS types from backend OpenAPI spec", 920, 0.0092],
    ["Adding form validation", "Integrated react-hook-form + zod schemas", 1100, 0.011],
    ["Loading & error states", "Added skeletons, retry logic, toast notifications", 780, 0.0078],
    ["Optimizing bundle", "Code-split routes, lazy-loaded charts library", 540, 0.0054],
    ["Final review", "All pages working, lighthouse score 94", 220, 0.0022],
  ];

  for (const [task, message, tokens, cost] of steps) {
    while (paused) {
      if (!pauseAck) {
        await agent.setTask("Paused — awaiting resume");
        pauseAck = true;
      }
      await sleep(500);
    }
    await agent.setTask(task);
    await sleep(jitter(1200));
    await agent.step(message, { tokens, cost });
    log("Frontend", `✓ ${task}`);
    await sleep(jitter(1500));
  }

  await agent.end();
  log("Frontend", "🎉 Done — React frontend ready to ship");
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Backend Agent — builds the FastAPI REST API
// ─────────────────────────────────────────────────────────────────────────────

async function runBackendAgent() {
  let paused = false;

  const agent = new Agent("Backend Agent", {
    onControl: async ({ type }) => {
      if (type === "pause") {
        paused = true;
        log("Backend", "⏸  Paused");
      } else if (type === "resume") {
        paused = false;
        log("Backend", "▶  Resumed");
      }
    },
  });

  await agent.start();
  await agent.setGoal("Build Coffee Inventory Platform — FastAPI REST backend");

  const steps: Array<[string, string, number, number]> = [
    ["Scaffolding FastAPI", "Created project structure with /app, /routers, /models", 280, 0.0028],
    ["Defining models", "Created Pydantic schemas: Buyer, Product, InventoryItem", 1350, 0.0135],
    ["Setting up SQLAlchemy", "Configured async session and connection pool", 720, 0.0072],
    ["Inventory endpoints", "Implemented GET, POST, PATCH, DELETE /inventory", 2200, 0.022],
    ["Buyer endpoints", "Implemented full CRUD for /buyers", 1950, 0.0195],
    ["Pagination + filtering", "Added query params: limit, offset, sort, search", 880, 0.0088],
    ["Validation middleware", "Added rate limiting and request body validation", 640, 0.0064],
    ["OpenAPI spec", "Generated swagger.json with full schemas + examples", 410, 0.0041],
    ["Final tests", "All endpoints return 200, validation works correctly", 320, 0.0032],
  ];

  for (const [task, message, tokens, cost] of steps) {
    while (paused) await sleep(500);
    await agent.setTask(task);
    await sleep(jitter(1400));
    await agent.step(message, { tokens, cost });
    log("Backend", `✓ ${task}`);
    await sleep(jitter(1700));
  }

  await agent.end();
  log("Backend", "🎉 Done — FastAPI backend ready");
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Database Agent — THE STAR OF THE DEMO
//    Hits a decision point and waits for YOU to send an instruction.
//    Demonstrates: warn(), modify_instruction, auto-attention (40s stuck)
// ─────────────────────────────────────────────────────────────────────────────

async function runDatabaseAgent() {
  let paused = false;
  let instruction: string | null = null;

  const agent = new Agent("Database Agent", {
    onControl: async ({ type, payload }) => {
      if (type === "pause") paused = true;
      else if (type === "resume") paused = false;
      else if (type === "modify_instruction") {
        instruction = payload ?? "";
        log("Database", `📩 Instruction received: "${instruction}"`);
      }
    },
  });

  await agent.start();
  await agent.setGoal("Design and migrate the database schema");

  // Initial steps proceed normally
  const initial: Array<[string, string, number, number]> = [
    ["Drafting schema", "Designed tables: buyers, products, inventory, transactions", 1100, 0.011],
    ["Defining relationships", "Foreign keys + indexes for query performance", 980, 0.0098],
    ["Initial migration script", "Generated 001_initial_schema.sql", 1400, 0.014],
  ];

  for (const [task, message, tokens, cost] of initial) {
    while (paused) await sleep(500);
    await agent.setTask(task);
    await sleep(jitter(1500));
    await agent.step(message, { tokens, cost });
    log("Database", `✓ ${task}`);
    await sleep(jitter(1800));
  }

  // ─── DECISION POINT ─── needs human input
  await agent.setTask(
    "Awaiting storage engine decision — open me in the dashboard and click Modify Instruction"
  );
  await agent.warn(
    "Multiple valid approaches detected: SQLite (simple, embedded) vs PostgreSQL (production-grade). Awaiting decision from human."
  );
  log("Database", "");
  log("Database", "  ╔══════════════════════════════════════════════════════════════╗");
  log("Database", "  ║  👋  WAITING FOR YOU                                         ║");
  log("Database", "  ║                                                              ║");
  log("Database", "  ║  Open the Database Agent in the dashboard and click          ║");
  log("Database", "  ║  'Modify Instruction'. Try sending:                          ║");
  log("Database", "  ║                                                              ║");
  log("Database", "  ║      Use PostgreSQL — production-grade required              ║");
  log("Database", "  ║                                                              ║");
  log("Database", "  ║  After 40s of inactivity the stuck monitor will also flag    ║");
  log("Database", "  ║  this agent in the Attention Panel — that's automatic.      ║");
  log("Database", "  ╚══════════════════════════════════════════════════════════════╝");
  log("Database", "");

  // Busy-wait for instruction (with periodic heartbeat)
  let waitedSeconds = 0;
  while (!instruction) {
    await sleep(2000);
    waitedSeconds += 2;
    if (waitedSeconds % 20 === 0) {
      await agent.setTask(
        `Still waiting for instruction… (${waitedSeconds}s elapsed)`
      );
    }
  }

  // Apply the human's instruction
  await agent.setTask(`Acting on instruction: ${instruction}`);
  await sleep(jitter(1200));
  await agent.step(
    `Acknowledged human input — proceeding with: "${instruction}"`,
    { tokens: 240, cost: 0.0024 }
  );

  // Continue with the chosen storage
  const isPostgres = /postgres/i.test(instruction);
  const followUp: Array<[string, string, number, number]> = isPostgres
    ? [
        ["Connecting to PostgreSQL", "Established connection pool to local PG instance", 380, 0.0038],
        ["Applying migrations", "Ran 001_initial_schema.sql successfully", 720, 0.0072],
        ["Seeding sample data", "Inserted 50 buyers, 200 products, 1000 inventory rows", 1100, 0.011],
        ["Verifying integrity", "All foreign keys valid, no orphan records", 410, 0.0041],
      ]
    : [
        ["Initializing SQLite", "Created dev.db file with WAL mode enabled", 220, 0.0022],
        ["Applying migrations", "Ran 001_initial_schema.sql successfully", 540, 0.0054],
        ["Seeding sample data", "Inserted 50 buyers, 200 products, 1000 inventory rows", 980, 0.0098],
        ["Verifying integrity", "All foreign keys valid, no orphan records", 380, 0.0038],
      ];

  for (const [task, message, tokens, cost] of followUp) {
    while (paused) await sleep(500);
    await agent.setTask(task);
    await sleep(jitter(1400));
    await agent.step(message, { tokens, cost });
    log("Database", `✓ ${task}`);
    await sleep(jitter(1600));
  }

  await agent.end();
  log("Database", "🎉 Done — schema migrated and seeded");
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Testing Agent — waits for backend, then runs tests
//    Demonstrates: 'waiting' status
// ─────────────────────────────────────────────────────────────────────────────

async function runTestingAgent() {
  const agent = new Agent("Testing Agent", {
    onControl: async () => {
      // Testing agent doesn't support pause for simplicity
    },
  });

  await agent.start();
  await agent.setGoal("Write integration tests for the full stack");
  await agent.setTask("Waiting for Backend Agent to finish before testing");
  await agent.step(
    "Initialized — waiting for backend endpoints to be ready before generating tests",
    { tokens: 95, cost: 0.001 }
  );

  // Simulate waiting for backend (~80 seconds in real demo)
  log("Testing", "⏳ Waiting for backend agent to complete...");
  await sleep(75_000);

  const steps: Array<[string, string, number, number]> = [
    ["Setting up pytest", "Configured pytest + httpx + factory-boy", 320, 0.0032],
    ["Inventory tests", "Wrote 14 test cases for /inventory CRUD", 1240, 0.0124],
    ["Buyer tests", "Wrote 11 test cases for /buyers CRUD", 1080, 0.0108],
    ["Edge case tests", "Tests for pagination, validation errors, empty results", 720, 0.0072],
    ["Running test suite", "All 38 tests pass in 4.2s", 180, 0.0018],
  ];

  for (const [task, message, tokens, cost] of steps) {
    await agent.setTask(task);
    await sleep(jitter(1200));
    await agent.step(message, { tokens, cost });
    log("Testing", `✓ ${task}`);
    await sleep(jitter(1500));
  }

  await agent.end();
  log("Testing", "🎉 Done — 38/38 tests passing");
}

// ─────────────────────────────────────────────────────────────────────────────
// Main — kick off all four agents in parallel
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n☕  Coffee Inventory Platform — Multi-Agent Build");
  console.log("─────────────────────────────────────────────────────");
  console.log("Open http://localhost:8000 in your browser to watch.");
  console.log("Try: pause Frontend Agent, then send Database Agent");
  console.log("an instruction like 'Use PostgreSQL'.\n");

  await Promise.all([
    runFrontendAgent(),
    runBackendAgent(),
    runDatabaseAgent(),
    runTestingAgent(),
  ]);

  console.log("\n✨  All agents finished. Demo complete.\n");
  process.exit(0);
}

main().catch((err) => {
  console.error("Demo failed:", err);
  process.exit(1);
});
