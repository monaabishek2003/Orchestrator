/**
 * Assemble the publishable dist/ folder at the repo root by copying:
 * - Server dist → dist/ (includes cli.js and all server modules)
 * - Web out → dist/web/ (static files the server serves)
 * - Prisma migrations → dist/prisma/migrations/
 * - Prisma schema → dist/prisma/schema.prisma
 */
import { cpSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const dist = resolve(root, "dist");

// Clean previous dist
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

// 1. Copy server dist → dist/
cpSync(resolve(root, "apps", "server", "dist"), dist, { recursive: true });

// 2. Copy web out → dist/web/
cpSync(resolve(root, "apps", "web", "out"), resolve(dist, "web"), {
  recursive: true,
});

// 3. Copy prisma migrations → dist/prisma/migrations/
mkdirSync(resolve(dist, "prisma"), { recursive: true });
cpSync(
  resolve(root, "apps", "server", "prisma", "migrations"),
  resolve(dist, "prisma", "migrations"),
  { recursive: true },
);

// 4. Copy prisma schema → dist/prisma/schema.prisma
cpSync(
  resolve(root, "apps", "server", "prisma", "schema.prisma"),
  resolve(dist, "prisma", "schema.prisma"),
);

console.log("✓ dist/ assembled successfully");
