import { Router, type Request, type Response } from "express";

import { prisma } from "../db.js";
import { io } from "../server.js";
import { startTask } from "../agent/runner.js";
import { removeWorktree } from "../git.js";
import {
  resumeTask,
  retryTask,
  sendMessage,
  stopTask,
} from "../services/task-lifecycle.js";

export const taskRouter: Router = Router();

const PERMISSION_MODES = ["bypassPermissions", "acceptEdits"] as const;

/** Validate a required, non-empty trimmed string. Returns the trimmed value. */
function parseRequiredString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/** Validate a positive integer token budget. */
function parseTokenBudget(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    return null;
  }
  return value;
}

/** Validate a permission mode string. */
function parsePermissionMode(value: unknown): (typeof PERMISSION_MODES)[number] | null {
  return PERMISSION_MODES.includes(value as never)
    ? (value as (typeof PERMISSION_MODES)[number])
    : null;
}

/** Standard error response. */
function sendError(res: Response, status: number, message: string): void {
  res.status(status).json({ error: message });
}

// 1. Create a task
taskRouter.post("/tasks", async (req: Request, res: Response) => {
  try {
    const title = parseRequiredString(req.body?.title);
    if (!title) return sendError(res, 400, "title is required");

    const prompt = parseRequiredString(req.body?.prompt);
    if (!prompt) return sendError(res, 400, "prompt is required");

    const tokenBudget = parseTokenBudget(req.body?.tokenBudget);
    if (tokenBudget === null) {
      return sendError(res, 400, "tokenBudget must be a positive integer");
    }

    const permissionMode = parsePermissionMode(req.body?.permissionMode);
    if (!permissionMode) {
      return sendError(
        res,
        400,
        'permissionMode must be "bypassPermissions" or "acceptEdits"',
      );
    }

    const task = await prisma.task.create({
      data: { title, prompt, tokenBudget, permissionMode, status: "todo" },
    });
    io.emit("tasks:update", task);
    return res.status(201).json(task);
  } catch (error) {
    return sendError(res, 500, (error as Error).message);
  }
});

// 2. List all tasks
taskRouter.get("/tasks", async (_req: Request, res: Response) => {
  try {
    const tasks = await prisma.task.findMany({
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json(tasks);
  } catch (error) {
    return sendError(res, 500, (error as Error).message);
  }
});

// 3. Get task detail with events
taskRouter.get("/tasks/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id ?? "";
    const task = await prisma.task.findUnique({
      where: { id },
    });
    if (!task) return sendError(res, 404, "Task not found");

    const events = await prisma.event.findMany({
      where: { taskId: task.id },
      orderBy: { timestamp: "asc" },
    });
    return res.status(200).json({ task, events });
  } catch (error) {
    return sendError(res, 500, (error as Error).message);
  }
});

// 4. Edit a task (todo only)
taskRouter.put("/tasks/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id ?? "";
    const task = await prisma.task.findUnique({
      where: { id },
    });
    if (!task) return sendError(res, 404, "Task not found");
    if (task.status !== "todo") {
      return sendError(res, 409, "Can only edit tasks in todo status");
    }

    const data: {
      title?: string;
      prompt?: string;
      tokenBudget?: number;
      permissionMode?: string;
    } = {};

    if (req.body?.title !== undefined) {
      const title = parseRequiredString(req.body.title);
      if (!title) return sendError(res, 400, "title is required");
      data.title = title;
    }
    if (req.body?.prompt !== undefined) {
      const prompt = parseRequiredString(req.body.prompt);
      if (!prompt) return sendError(res, 400, "prompt is required");
      data.prompt = prompt;
    }
    if (req.body?.tokenBudget !== undefined) {
      const tokenBudget = parseTokenBudget(req.body.tokenBudget);
      if (tokenBudget === null) {
        return sendError(res, 400, "tokenBudget must be a positive integer");
      }
      data.tokenBudget = tokenBudget;
    }
    if (req.body?.permissionMode !== undefined) {
      const permissionMode = parsePermissionMode(req.body.permissionMode);
      if (!permissionMode) {
        return sendError(
          res,
          400,
          'permissionMode must be "bypassPermissions" or "acceptEdits"',
        );
      }
      data.permissionMode = permissionMode;
    }

    const updated = await prisma.task.update({
      where: { id: task.id },
      data,
    });
    io.emit("tasks:update", updated);
    return res.status(200).json(updated);
  } catch (error) {
    return sendError(res, 500, (error as Error).message);
  }
});

// 5. Start a task
taskRouter.post("/tasks/:id/start", async (req: Request, res: Response) => {
  try {
    const id = req.params.id ?? "";
    const task = await prisma.task.findUnique({
      where: { id },
    });
    if (!task) return sendError(res, 404, "Task not found");
    if (task.status !== "todo") {
      return sendError(res, 409, "Task must be in todo status to start");
    }

    await startTask(task.id);

    const updated = await prisma.task.findUnique({ where: { id: task.id } });
    return res.status(202).json(updated);
  } catch (error) {
    return sendError(res, 500, (error as Error).message);
  }
});

// 6. Stop a running task
taskRouter.post("/tasks/:id/stop", async (req: Request, res: Response) => {
  try {
    const id = req.params.id ?? "";
    const task = await prisma.task.findUnique({
      where: { id },
    });
    if (!task) return sendError(res, 404, "Task not found");
    if (task.status !== "running") {
      return sendError(res, 409, "Task must be running to stop");
    }

    await stopTask(task.id);

    const updated = await prisma.task.findUnique({ where: { id: task.id } });
    return res.status(200).json(updated);
  } catch (error) {
    return sendError(res, 500, (error as Error).message);
  }
});

// 7. Resume from token_exceeded
taskRouter.post("/tasks/:id/resume", async (req: Request, res: Response) => {
  try {
    const id = req.params.id ?? "";
    const task = await prisma.task.findUnique({
      where: { id },
    });
    if (!task) return sendError(res, 404, "Task not found");
    if (task.status !== "token_exceeded") {
      return sendError(res, 409, "Task must be in token_exceeded status to resume");
    }

    const tokenBudget = parseTokenBudget(req.body?.tokenBudget);
    if (tokenBudget === null) {
      return sendError(res, 400, "tokenBudget must be a positive integer");
    }
    if (tokenBudget <= task.totalTokens) {
      return sendError(
        res,
        400,
        `tokenBudget must be greater than tokens already used (${task.totalTokens})`,
      );
    }

    await resumeTask(task.id, tokenBudget);

    const updated = await prisma.task.findUnique({ where: { id: task.id } });
    return res.status(202).json(updated);
  } catch (error) {
    return sendError(res, 500, (error as Error).message);
  }
});

// 8. Retry a failed task
taskRouter.post("/tasks/:id/retry", async (req: Request, res: Response) => {
  try {
    const id = req.params.id ?? "";
    const task = await prisma.task.findUnique({
      where: { id },
    });
    if (!task) return sendError(res, 404, "Task not found");
    if (task.status !== "failed") {
      return sendError(res, 409, "Task must be in failed status to retry");
    }

    await retryTask(task.id);

    const updated = await prisma.task.findUnique({ where: { id: task.id } });
    return res.status(202).json(updated);
  } catch (error) {
    return sendError(res, 500, (error as Error).message);
  }
});

// 9. Delete a task and clean up
taskRouter.delete("/tasks/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id ?? "";
    const task = await prisma.task.findUnique({
      where: { id },
    });
    if (!task) return sendError(res, 404, "Task not found");

    if (task.status === "running") {
      await stopTask(task.id);
    }

    if (task.branchName) {
      const slug = task.branchName.replace(/^orchestrator\//, "");
      try {
        removeWorktree(slug);
      } catch (err) {
        console.warn(`Failed to remove worktree for task ${task.id}: ${String(err)}`);
      }
    }

    await prisma.task.delete({ where: { id: task.id } });
    io.emit("tasks:delete", { id: task.id });
    return res.status(200).json({ success: true });
  } catch (error) {
    return sendError(res, 500, (error as Error).message);
  }
});

// 10. Send a message to a running task
taskRouter.post("/tasks/:id/message", async (req: Request, res: Response) => {
  try {
    const id = req.params.id ?? "";
    const task = await prisma.task.findUnique({
      where: { id },
    });
    if (!task) return sendError(res, 404, "Task not found");
    if (task.status !== "running") {
      return sendError(res, 409, "Task must be running to receive a message");
    }

    const message = parseRequiredString(req.body?.message);
    if (!message) return sendError(res, 400, "message is required");

    await sendMessage(task.id, message);
    return res.status(200).json({ success: true });
  } catch (error) {
    return sendError(res, 500, (error as Error).message);
  }
});
