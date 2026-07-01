import { existsSync } from "node:fs";
import { createServer, type Server as HttpServer } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import cors from "cors";
import express, { type Express } from "express";
import { Server as SocketIOServer } from "socket.io";

import { taskRouter } from "./routes/tasks.js";
import { workspaceRouter } from "./routes/workspace.js";
import { sendMessage } from "./services/task-lifecycle.js";
import {
  SocketEvents,
  type TaskSendMessagePayload,
} from "./shared/events.js";

const moduleDir = dirname(fileURLToPath(import.meta.url));

/** Port the HTTP server listens on. */
export const PORT = 8000;

/**
 * Detect production by checking if the bundled web static files exist next
 * to this module (dist/web/). This works regardless of NODE_ENV.
 */
const prodWebDir = resolve(moduleDir, "web");
const devWebDir = resolve(moduleDir, "..", "..", "web", "out");
const isProduction = existsSync(prodWebDir);
const webOutDir = isProduction ? prodWebDir : devWebDir;

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

app.use("/api", taskRouter);
app.use("/api", workspaceRouter);

if (isProduction) {
  app.use(express.static(webOutDir));
}

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Client acknowledges it wants real-time updates. No-op for now since all
  // connected clients already receive broadcasts; defined to establish the
  // contract for future scoping.
  socket.on(SocketEvents.WORKSPACE_SUBSCRIBE, () => {
    // intentionally empty
  });

  // Mid-task messaging over Socket.io (alternative to POST /:id/message).
  socket.on(
    SocketEvents.TASK_SEND_MESSAGE,
    (payload: TaskSendMessagePayload) => {
      void sendMessage(payload.taskId, payload.message).catch((err: unknown) => {
        console.error(
          `task:send-message failed for ${payload?.taskId}: ${String(err)}`,
        );
      });
    },
  );

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
