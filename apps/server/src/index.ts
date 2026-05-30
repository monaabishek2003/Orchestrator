import http from 'http';
import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';
import express from 'express';
import cors from 'cors';
import agentsRouter from './routes/agents';
import { startStuckMonitor } from './jobs/stuck-monitor';
import { initSocket } from './socket';

// Apply schema directly via better-sqlite3 — no Prisma CLI needed at runtime.
// DATABASE_URL is set as a side effect of importing agentsRouter → prisma.ts.
{
  const dbPath = process.env.DATABASE_URL!.replace(/^file:/, '');
  const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS "Agent" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'running',
      "needsAttention" BOOLEAN NOT NULL DEFAULT false,
      "attentionReason" TEXT,
      "webhookUrl" TEXT,
      "currentGoal" TEXT,
      "currentTask" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "endedAt" DATETIME,
      "lastUpdateAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS "Event" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "agentId" TEXT NOT NULL,
      "type" TEXT NOT NULL,
      "message" TEXT NOT NULL,
      "tokens" INTEGER,
      "cost" REAL,
      "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Event_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );
    CREATE TABLE IF NOT EXISTS "Intervention" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "agentId" TEXT NOT NULL,
      "type" TEXT NOT NULL,
      "payload" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Intervention_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );
  `);
  // Add new columns to existing Agent tables (ALTER TABLE IF NOT EXISTS column not supported in SQLite)
  for (const col of ['webhookUrl TEXT', 'currentGoal TEXT', 'currentTask TEXT']) {
    try { db.exec(`ALTER TABLE "Agent" ADD COLUMN ${col}`); } catch { /* column already exists */ }
  }
  db.close();
}

const app = express();
const httpServer = http.createServer(app);
initSocket(httpServer);

app.use(cors());
app.use(express.json());
app.use(agentsRouter);

// Serve static dashboard only if public/ exists (production build)
const publicDir = path.join(import.meta.dirname, '..', 'public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.get('/{*splat}', (_req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });
}

startStuckMonitor();

const port = Number(process.env.PORT) || 8000;
httpServer.listen(port, () => console.log(`Orchestrator server running on http://localhost:${port}`));
