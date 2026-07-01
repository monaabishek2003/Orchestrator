/**
 * Verify the dist/ folder is correct before publishing.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const dist = resolve(root, "dist");

let ok = true;

function check(label, condition) {
  if (!condition) {
    console.error(`✗ ${label}`);
    ok = false;
  } else {
    console.log(`✓ ${label}`);
  }
}

// 1. dist/cli.js exists and starts with shebang
const cliPath = resolve(dist, "cli.js");
check("dist/cli.js exists", existsSync(cliPath));
if (existsSync(cliPath)) {
  const content = readFileSync(cliPath, "utf8");
  check("dist/cli.js starts with shebang", content.startsWith("#!/usr/bin/env node"));
}

// 2. dist/web/index.html exists
check("dist/web/index.html exists", existsSync(resolve(dist, "web", "index.html")));

// 3. dist/prisma/migrations/ exists and has migration files
const migrationsDir = resolve(dist, "prisma", "migrations");
check("dist/prisma/migrations/ exists", existsSync(migrationsDir));
if (existsSync(migrationsDir)) {
  const entries = readdirSync(migrationsDir);
  check("dist/prisma/migrations/ has entries", entries.length > 0);
}

// 4. dist/prisma/schema.prisma exists
check("dist/prisma/schema.prisma exists", existsSync(resolve(dist, "prisma", "schema.prisma")));

if (!ok) {
  console.error("\nDist verification failed.");
  process.exit(1);
}

console.log("\nAll checks passed.");
