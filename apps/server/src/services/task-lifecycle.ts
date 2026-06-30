import { prisma } from "../db.js";
import { startTask } from "../agent/runner.js";
import { io } from "../server.js";
import {
  getRunningProcess,
  unregisterProcess,
} from "./process-registry.js";

/**
 * Resume a budget-exceeded task with a higher total budget ceiling, continuing
 * the prior Claude session.
 */
export async function resumeTask(
  taskId: string,
  newBudget: number,
): Promise<void> {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) {
    throw new Error(`Task ${taskId} not found.`);
  }
  if (task.status !== "token_exceeded") {
    throw new Error(
      `Task ${taskId} is not resumable (status: ${task.status}).`,
    );
  }
  if (newBudget <= task.totalTokens) {
    throw new Error(
      `New budget (${newBudget}) must exceed tokens already used (${task.totalTokens}).`,
    );
  }
  if (!task.sessionId) {
    throw new Error(`Task ${taskId} has no session ID to resume.`);
  }

  await prisma.task.update({
    where: { id: taskId },
    data: { tokenBudget: newBudget },
  });

  await startTask(taskId, { resume: true });
}

/**
 * Retry a failed task from a clean slate: reset its runtime fields, clear its
 * events, and start fresh with the same prompt and budget.
 */
export async function retryTask(taskId: string): Promise<void> {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) {
    throw new Error(`Task ${taskId} not found.`);
  }
  if (task.status !== "failed") {
    throw new Error(`Task ${taskId} is not retryable (status: ${task.status}).`);
  }

  await prisma.event.deleteMany({ where: { taskId } });

  // Reset to a startable state, keeping the worktree/branch for reuse.
  await prisma.task.update({
    where: { id: taskId },
    data: {
      status: "todo",
      totalTokens: 0,
      totalCost: 0,
      totalSteps: 0,
      duration: null,
      sessionId: null,
      errorInfo: null,
      startedAt: null,
      completedAt: null,
    },
  });

  await startTask(taskId, { resume: false });
}

/**
 * Stop a running task: kill its process and move it to `failed` with a
 * "Manually stopped by user" error.
 */
export async function stopTask(taskId: string): Promise<void> {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) {
    throw new Error(`Task ${taskId} not found.`);
  }
  if (task.status !== "running") {
    throw new Error(`Task ${taskId} is not running (status: ${task.status}).`);
  }

  const handle = getRunningProcess(taskId);
  if (handle) {
    handle.kill();
  }

  const completedAt = new Date();
  const duration = task.startedAt
    ? Math.round((completedAt.getTime() - task.startedAt.getTime()) / 1000)
    : null;

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      status: "failed",
      completedAt,
      duration,
      errorInfo: "Manually stopped by user",
    },
  });

  unregisterProcess(taskId);
  io.emit("tasks:update", updated);
}

/**
 * Send a message to a running task's Claude process via stdin. Fire-and-forget;
 * any response arrives through the normal event stream.
 */
export async function sendMessage(
  taskId: string,
  message: string,
): Promise<void> {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) {
    throw new Error(`Task ${taskId} not found.`);
  }
  if (task.status !== "running") {
    throw new Error(`Task ${taskId} is not running (status: ${task.status}).`);
  }

  const handle = getRunningProcess(taskId);
  if (!handle) {
    throw new Error(`Task ${taskId} is no longer running.`);
  }

  handle.sendMessage(message);
}
