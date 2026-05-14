import os from 'os';
import path from 'path';
import fs from 'fs';
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../generated/prisma/client";

// Set DATABASE_URL as a side effect so execSync in index.ts inherits it
if (!process.env.DATABASE_URL) {
  const dir = path.join(os.homedir(), '.orchestrator');
  fs.mkdirSync(dir, { recursive: true });
  process.env.DATABASE_URL = `file:${path.join(dir, 'dev.db')}`;
}

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export default prisma;
