import "dotenv/config";
import os from 'os';
import path from 'path';
import fs from 'fs';
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../generated/prisma/client";

// In dev, .env provides DATABASE_URL (e.g. file:./dev.db).
// In production (npx), fall back to ~/.orchestrator/dev.db.
if (!process.env.DATABASE_URL) {
  const dir = path.join(os.homedir(), '.orchestrator');
  fs.mkdirSync(dir, { recursive: true });
  process.env.DATABASE_URL = `file:${path.join(dir, 'dev.db')}`;
}

// Resolve relative file: paths against the server package root so that running
// from `apps/server` vs the packed npx install both point to the right DB.
if (process.env.DATABASE_URL.startsWith('file:./')) {
  const root = path.join(import.meta.dirname, '..', '..');
  const rel = process.env.DATABASE_URL.slice('file:'.length);
  process.env.DATABASE_URL = `file:${path.resolve(root, rel)}`;
}

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export default prisma;
