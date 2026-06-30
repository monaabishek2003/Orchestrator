import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);

const moduleDir = dirname(fileURLToPath(import.meta.url));

/** Absolute path to the Prisma schema, resolved relative to this module. */
const schemaPath = resolve(moduleDir, "..", "prisma", "schema.prisma");

/** `~/.orchestrator` directory that holds the SQLite database. */
export const dataDir = join(homedir(), ".orchestrator");

/** Absolute path to the SQLite database file. */
const dbPath = join(dataDir, "data.db");

/** Ensure the `~/.orchestrator` directory exists. */
export function ensureDataDir(): void {
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }
}

/**
 * Ensure the data directory exists and the DATABASE_URL environment variable
 * points at the SQLite file before the Prisma client is instantiated.
 */
function configureDatabaseUrl(): void {
  ensureDataDir();
  if (!process.env["DATABASE_URL"]) {
    process.env["DATABASE_URL"] = `file:${dbPath}`;
  }
}

configureDatabaseUrl();

// Imported after DATABASE_URL is configured so the client picks it up.
const { PrismaClient } = await import("@prisma/client");

export const prisma = new PrismaClient();

/**
 * Apply all pending migrations programmatically at startup by invoking the
 * Prisma CLI's `migrate deploy`. The user never runs a migrate command.
 */
export function runMigrations(): void {
  const prismaCli = join(
    dirname(require.resolve("prisma/package.json")),
    "build",
    "index.js",
  );

  execFileSync(
    process.execPath,
    [prismaCli, "migrate", "deploy", "--schema", schemaPath],
    {
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: process.env["DATABASE_URL"] },
    },
  );
}
