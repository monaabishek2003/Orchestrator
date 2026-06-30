import { createServer, type Server as HttpServer } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import cors from "cors";
import express, { type Express } from "express";
import { Server as SocketIOServer } from "socket.io";

const moduleDir = dirname(fileURLToPath(import.meta.url));

/** Port the HTTP server listens on. */
export const PORT = 8000;

const isProduction = process.env["NODE_ENV"] === "production";

/**
 * Absolute path to the web app's static export. Resolves the same way whether
 * this module runs from `src/` (dev) or the bundled `dist/` (production):
 * `<app>/server/{src,dist}` → `<app>/web/out`.
 */
const webOutDir = resolve(moduleDir, "..", "..", "web", "out");

export const app: Express = express();
export const httpServer: HttpServer = createServer(app);

export const io = new SocketIOServer(
  httpServer,
  isProduction
    ? {}
    : { cors: { origin: ["http://localhost:3000", "http://localhost:8000"] } },
);

if (!isProduction) {
  app.use(
    cors({ origin: ["http://localhost:3000", "http://localhost:8000"] }),
  );
}

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

if (isProduction) {
  app.use(express.static(webOutDir));
}

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);
  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

/** Start listening on {@link PORT} and log the startup URL. */
export function startServer(): void {
  httpServer.listen(PORT, () => {
    console.log(`Orchestrator running at http://localhost:${PORT}`);
  });
}
