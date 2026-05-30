import 'dotenv/config';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../src/generated/prisma/client';

if (!process.env.DATABASE_URL) {
  const dir = path.join(os.homedir(), '.orchestrator');
  fs.mkdirSync(dir, { recursive: true });
  process.env.DATABASE_URL = `file:${path.join(dir, 'dev.db')}`;
}

if (process.env.DATABASE_URL.startsWith('file:./')) {
  const root = path.join(import.meta.dirname, '..');
  const rel = process.env.DATABASE_URL.slice('file:'.length);
  process.env.DATABASE_URL = `file:${path.resolve(root, rel)}`;
}

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function ago(minutes: number): Date {
  return new Date(Date.now() - minutes * 60 * 1000);
}

function agoSeconds(seconds: number): Date {
  return new Date(Date.now() - seconds * 1000);
}

async function main() {
  console.log('🌱  Seeding database...');

  await prisma.intervention.deleteMany();
  await prisma.event.deleteMany();
  await prisma.agent.deleteMany();

  // ── 1. Frontend Agent — running, with goal/task ───────────────────────────
  const frontend = await prisma.agent.create({
    data: {
      name: 'Frontend Agent',
      status: 'running',
      needsAttention: false,
      currentGoal: 'Build Coffee Inventory Platform UI',
      currentTask: 'Wire API client with backend schema types',
      createdAt: ago(18),
      lastUpdateAt: agoSeconds(30),
      events: {
        create: [
          { type: 'info', message: 'Agent started — Coffee Inventory Platform frontend', tokens: 120, cost: 0.0012, timestamp: ago(18) },
          { type: 'info', message: 'Scaffolded React + Vite project structure', tokens: 850, cost: 0.0085, timestamp: ago(16) },
          { type: 'info', message: 'Created layout components: Sidebar, Navbar, PageContainer', tokens: 1240, cost: 0.0124, timestamp: ago(13) },
          { type: 'info', message: 'Built InventoryDashboard page with summary cards', tokens: 2100, cost: 0.021, timestamp: ago(10) },
          { type: 'info', message: 'Added BuyerManagement table with pagination', tokens: 1800, cost: 0.018, timestamp: ago(7) },
          { type: 'info', message: 'Wiring API client — waiting on backend schema to complete types', tokens: 560, cost: 0.0056, timestamp: agoSeconds(30) },
        ],
      },
    },
  });
  console.log(`  ✓ ${frontend.name} (${frontend.id})`);

  // ── 2. Backend Agent — running, mid-task ─────────────────────────────────
  const backend = await prisma.agent.create({
    data: {
      name: 'Backend Agent',
      status: 'running',
      needsAttention: false,
      currentGoal: 'Implement FastAPI REST endpoints',
      currentTask: 'Generate OpenAPI spec and integration tests',
      createdAt: ago(17),
      lastUpdateAt: agoSeconds(90),
      events: {
        create: [
          { type: 'info', message: 'Agent started — FastAPI backend for Coffee Inventory Platform', tokens: 110, cost: 0.0011, timestamp: ago(17) },
          { type: 'info', message: 'Created project structure: /app, /models, /routers, /schemas', tokens: 780, cost: 0.0078, timestamp: ago(15) },
          { type: 'info', message: 'Defined Pydantic models: Buyer, Product, InventoryItem', tokens: 1350, cost: 0.0135, timestamp: ago(12) },
          { type: 'info', message: 'Implemented GET /inventory and POST /inventory endpoints', tokens: 2200, cost: 0.022, timestamp: ago(9) },
          { type: 'info', message: 'Implemented GET /buyers, POST /buyers, DELETE /buyers/{id}', tokens: 1950, cost: 0.0195, timestamp: ago(6) },
          { type: 'info', message: 'Generating OpenAPI spec and writing integration tests', tokens: 890, cost: 0.0089, timestamp: agoSeconds(90) },
        ],
      },
    },
  });
  console.log(`  ✓ ${backend.name} (${backend.id})`);

  // ── 3. Database Agent — paused after instruction ──────────────────────────
  const database = await prisma.agent.create({
    data: {
      name: 'Database Agent',
      status: 'paused',
      needsAttention: false,
      currentGoal: 'Design and migrate database schema',
      currentTask: 'Applying PostgreSQL migration after instruction update',
      createdAt: ago(16),
      lastUpdateAt: ago(2),
      events: {
        create: [
          { type: 'info', message: 'Agent started — database layer for Coffee Inventory Platform', tokens: 105, cost: 0.001, timestamp: ago(16) },
          { type: 'info', message: 'Drafting schema: tables for buyers, products, inventory, transactions', tokens: 1100, cost: 0.011, timestamp: ago(14) },
          { type: 'info', message: 'Created initial Alembic migration: 001_create_buyers_table', tokens: 1400, cost: 0.014, timestamp: ago(11) },
          { type: 'warning', message: 'Evaluating storage options: SQLite (simple) vs PostgreSQL (production-grade)', tokens: 620, cost: 0.0062, timestamp: ago(8) },
          { type: 'instruction_modified', message: 'Use PostgreSQL instead of SQLite — production-grade required', timestamp: ago(5) },
          { type: 'info', message: 'Acknowledged — switching to PostgreSQL, updating migration scripts', tokens: 410, cost: 0.0041, timestamp: ago(4) },
          { type: 'paused', message: 'Agent paused by user', timestamp: ago(2) },
        ],
      },
    },
  });
  await prisma.intervention.create({
    data: { agentId: database.id, type: 'modify_instruction', payload: 'Use PostgreSQL instead of SQLite — production-grade required', createdAt: ago(5) },
  });
  await prisma.intervention.create({
    data: { agentId: database.id, type: 'pause', createdAt: ago(2) },
  });
  console.log(`  ✓ ${database.name} (${database.id}) — paused`);

  // ── 4. Testing Agent — waiting ────────────────────────────────────────────
  const testing = await prisma.agent.create({
    data: {
      name: 'Testing Agent',
      status: 'waiting',
      needsAttention: false,
      createdAt: ago(15),
      lastUpdateAt: ago(15),
      events: {
        create: [
          { type: 'info', message: 'Agent started — waiting for Backend Agent and Database Agent to complete before writing tests', tokens: 95, cost: 0.001, timestamp: ago(15) },
        ],
      },
    },
  });
  console.log(`  ✓ ${testing.name} (${testing.id}) — waiting`);

  // ── 5. DevOps Agent — done ────────────────────────────────────────────────
  const devops = await prisma.agent.create({
    data: {
      name: 'DevOps Agent',
      status: 'done',
      needsAttention: false,
      createdAt: ago(60),
      endedAt: ago(40),
      lastUpdateAt: ago(40),
      events: {
        create: [
          { type: 'info', message: 'Agent started — CI/CD pipeline setup', tokens: 130, cost: 0.0013, timestamp: ago(60) },
          { type: 'info', message: 'Created Dockerfile for FastAPI backend', tokens: 1050, cost: 0.0105, timestamp: ago(56) },
          { type: 'info', message: 'Created docker-compose.yml with app + postgres services', tokens: 1300, cost: 0.013, timestamp: ago(52) },
          { type: 'info', message: 'Added GitHub Actions workflow: lint → test → build → push', tokens: 1800, cost: 0.018, timestamp: ago(47) },
          { type: 'info', message: 'Pipeline tested and passing. All checks green.', tokens: 400, cost: 0.004, timestamp: ago(41) },
          { type: 'info', message: 'Agent completed successfully', tokens: 80, cost: 0.0008, timestamp: ago(40) },
        ],
      },
    },
  });
  console.log(`  ✓ ${devops.name} (${devops.id}) — done`);

  // ── 6. Auth Agent — error ─────────────────────────────────────────────────
  const authAgent = await prisma.agent.create({
    data: {
      name: 'Auth Agent',
      status: 'error',
      needsAttention: true,
      attentionReason: 'Unhandled exception: JWT_SECRET not set in environment',
      createdAt: ago(30),
      lastUpdateAt: ago(22),
      events: {
        create: [
          { type: 'info', message: 'Agent started — implementing JWT authentication', tokens: 100, cost: 0.001, timestamp: ago(30) },
          { type: 'info', message: 'Created /auth/login and /auth/refresh endpoints', tokens: 1600, cost: 0.016, timestamp: ago(28) },
          { type: 'info', message: 'Writing token signing logic', tokens: 900, cost: 0.009, timestamp: ago(25) },
          { type: 'error', message: 'Unhandled exception: JWT_SECRET not set in environment', timestamp: ago(22) },
        ],
      },
    },
  });
  console.log(`  ✓ ${authAgent.name} (${authAgent.id}) — error`);

  console.log('\n✅  Seed complete. 6 agents written.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
