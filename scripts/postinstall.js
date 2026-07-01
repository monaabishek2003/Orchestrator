/**
 * postinstall script: generate Prisma client if the dist schema exists.
 * Skips silently during local dev (before first build) when dist/ doesn't exist.
 */
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
// Package root is one level up from scripts/
const packageRoot = resolve(scriptDir, "..");
const schemaPath = resolve(packageRoot, "dist", "prisma", "schema.prisma");

if (!existsSync(schemaPath)) {
  // In local dev before first build — nothing to generate.
  process.exit(0);
}

try {
  execSync(`npx prisma generate --schema "${schemaPath}"`, {
    stdio: "inherit",
    cwd: packageRoot,
  });
} catch {
  // Don't block install — the CLI will error at runtime with a clear message.
  console.warn(
    "Warning: prisma generate failed. Run manually: npx prisma generate --schema ./dist/prisma/schema.prisma",
  );
}
