import { exec } from "node:child_process";
import { platform } from "node:os";

import { ensureDataDir, runMigrations } from "./db.js";
import { gitPreflight } from "./git.js";
import { httpServer, PORT, startServer } from "./server.js";
import { getAllRunningProcesses } from "./services/process-registry.js";

console.log("Orchestrator v0.3.3");

// 1. Git preflight — exits with code 1 on failure.
gitPreflight();

// 2. Bootstrap ~/.orchestrator and run Prisma migrations.
ensureDataDir();
runMigrations();

// 3. Start server.
startServer();

// 4. Open user's default browser.
function openBrowser(url: string): void {
  const os = platform();
  let cmd: string;
  if (os === "darwin") cmd = `open "${url}"`;
  else if (os === "win32") cmd = `start "" "${url}"`;
  else cmd = `xdg-open "${url}"`;

  exec(cmd, (err) => {
    if (err) {
      // Headless or no browser available — just log.
      console.log(`Open your browser at ${url}`);
    }
  });
}

openBrowser(`http://localhost:${PORT}`);

// 5. Graceful shutdown on SIGINT / SIGTERM.
function shutdown(): void {
  console.log("\nShutting down...");

  // Kill all running Claude processes.
  const running = getAllRunningProcesses();
  for (const [, handle] of running) {
    try {
      handle.kill();
    } catch {
      // Process may have already exited.
    }
  }

  // Close the HTTP server.
  httpServer.close(() => {
    process.exit(0);
  });

  // If server.close hangs, force-exit after 3s.
  setTimeout(() => process.exit(0), 3000).unref();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
