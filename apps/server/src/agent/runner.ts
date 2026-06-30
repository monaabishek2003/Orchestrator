import type { Task, Event } from "@prisma/client";
import { existsSync } from "node:fs";

import { prisma } from "../db.js";
import { createWorktree, slugify } from "../git.js";
import { io } from "../server.js";
import {
  registerProcess,
  unregisterProcess,
} from "../services/process-registry.js";
import {
  addSpent,
  checkWorkspaceBudget,
} from "../services/workspace-budget.js";
import {
  DEFAULT_MODEL,
  TokenAccumulator,
  calculateCost,
  detectModel,
} from "./pricing.js";
import {
  spawnNewTask,
  spawnResumeTask,
  type ParsedEvent,
  type PermissionMode,
  type ProcessHandle,
  type SpawnCallbacks,
} from "./spawner.js";

/** Options controlling how a task is started. */
export interface StartTaskOptions {
  /** When true, resume a `token_exceeded` task instead of starting fresh. */
  resume?: boolean;
}

/** Broadcast the full updated task after a DB write. */
function emitTaskUpdate(task: Task): void {
  io.emit("tasks:update", task);
}

/** Broadcast a newly persisted event for the live step feed. */
function emitTaskEvent(event: Event): void {
  io.emit("task:event", event);
}

/**
 * Run a single task end-to-end: create/reuse its worktree, spawn Claude,
 * persist every event, track tokens/cost, enforce the per-task budget, and
 * broadcast updates over Socket.io. Resolves once the process has been
 * spawned and wired up (the task continues running asynchronously).
 */
export async function startTask(
  taskId: string,
  options: StartTaskOptions = {},
): Promise<void> {
  const resume = options.resume ?? false;

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) {
    throw new Error(`Task ${taskId} not found.`);
  }

  if (resume) {
    if (task.status !== "token_exceeded") {
      throw new Error(
        `Task ${taskId} is not resumable (status: ${task.status}).`,
      );
    }
  } else if (task.status !== "todo") {
    throw new Error(`Task ${taskId} is not startable (status: ${task.status}).`);
  }

  // Resolve the worktree: reuse for resume, create fresh otherwise.
  let worktreePath: string;
  let branchName: string;
  if (resume) {
    if (!task.worktreePath || !task.branchName) {
      throw new Error(`Task ${taskId} has no worktree to resume.`);
    }
    if (!task.sessionId) {
      throw new Error(`Task ${taskId} has no session ID to resume.`);
    }
    worktreePath = task.worktreePath;
    branchName = task.branchName;
  } else if (
    task.worktreePath &&
    task.branchName &&
    existsSync(task.worktreePath)
  ) {
    // Reuse an existing worktree (e.g. on retry) instead of creating a new one.
    worktreePath = task.worktreePath;
    branchName = task.branchName;
  } else {
    const slug = slugify(task.title);
    worktreePath = createWorktree(slug);
    branchName = `orchestrator/${slug}`;
  }

  // Transition to running and persist worktree details.
  const startedAt = new Date();
  const runningTask = await prisma.task.update({
    where: { id: taskId },
    data: { status: "running", startedAt, worktreePath, branchName },
  });
  emitTaskUpdate(runningTask);

  // Seed the accumulator from prior totals when resuming. The Task schema does
  // not store the input/output split, so the baseline is folded into input.
  const accumulator = new TokenAccumulator(
    resume
      ? { inputTokens: task.totalTokens, outputTokens: 0, cost: task.totalCost }
      : {},
  );

  const permissionMode = task.permissionMode as PermissionMode;
  const tokenBudget = task.tokenBudget;

  let settled = false;
  let stepCount = resume ? task.totalSteps : 0;
  let currentModel = DEFAULT_MODEL;
  let chain: Promise<void> = Promise.resolve();
  let handle: ProcessHandle;

  const logError = (err: unknown): void => {
    console.error(`Task ${taskId} runner error:`, err);
  };

  async function handleSessionId(sessionId: string): Promise<void> {
    const updated = await prisma.task.update({
      where: { id: taskId },
      data: { sessionId },
    });
    emitTaskUpdate(updated);
  }

  async function handleEvent(event: ParsedEvent): Promise<void> {
    if (settled) return;

    const detected = detectModel(event.raw);
    if (detected) currentModel = detected;

    const { inputTokens, outputTokens } = event;
    accumulator.addUsage(inputTokens, outputTokens, currentModel);
    const incrementalCost = calculateCost(
      inputTokens,
      outputTokens,
      currentModel,
    );
    stepCount += 1;

    const record = await prisma.event.create({
      data: {
        taskId,
        type: event.type,
        content: event.content,
        inputTokens,
        outputTokens,
        cost: incrementalCost,
      },
    });

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        totalTokens: accumulator.totalTokens,
        totalCost: accumulator.totalCost,
        totalSteps: stepCount,
      },
    });

    // Per-task budget enforcement: kill immediately when the limit is reached.
    if (accumulator.totalTokens >= tokenBudget) {
      settled = true;
      handle.kill();
      const exceeded = await prisma.task.update({
        where: { id: taskId },
        data: { status: "token_exceeded", completedAt: new Date() },
      });
      unregisterProcess(taskId);
      emitTaskUpdate(exceeded);
      return;
    }

    emitTaskUpdate(updatedTask);
    emitTaskEvent(record);

    // Workspace-wide budget enforcement: add this event's cost to the shared
    // total and hard-stop ALL running tasks if the cap has been reached.
    await addSpent(incrementalCost);
    const workspaceExceeded = await checkWorkspaceBudget();
    if (workspaceExceeded) {
      // kill-all has already killed this task's process and settled its state.
      settled = true;
    }

    // The `result` event marks the end of the agent's turn. Closing stdin lets
    // the bidirectional process exit naturally (exit 0), driving the task to
    // `done` via onExit. This is event-driven, not a timer/heuristic.
    if (!settled && event.type === "result") {
      handle.stdin.end();
    }
  }

  async function handleExit(
    code: number | null,
    signal: NodeJS.Signals | null,
  ): Promise<void> {
    if (settled) return;

    // Skip if the task was already moved to a terminal state externally
    // (e.g. stopTask killed the process and set status itself).
    const current = await prisma.task.findUnique({ where: { id: taskId } });
    if (!current || current.status !== "running") {
      settled = true;
      unregisterProcess(taskId);
      return;
    }
    settled = true;

    const completedAt = new Date();
    const duration = Math.round(
      (completedAt.getTime() - startedAt.getTime()) / 1000,
    );

    const updated = await prisma.task.update({
      where: { id: taskId },
      data:
        code === 0
          ? { status: "done", completedAt, duration }
          : {
              status: "failed",
              completedAt,
              duration,
              errorInfo: `Process exited with code ${code}${
                signal ? `, signal ${signal}` : ""
              }`,
            },
    });
    unregisterProcess(taskId);
    emitTaskUpdate(updated);
  }

  async function handleError(error: Error): Promise<void> {
    if (settled) return;

    // Skip if the task was already moved to a terminal state externally.
    const current = await prisma.task.findUnique({ where: { id: taskId } });
    if (!current || current.status !== "running") {
      settled = true;
      unregisterProcess(taskId);
      return;
    }
    settled = true;

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: {
        status: "failed",
        errorInfo: error.message,
        completedAt: new Date(),
      },
    });
    unregisterProcess(taskId);
    emitTaskUpdate(updated);
  }

  const callbacks: SpawnCallbacks = {
    onSessionId: (sessionId) => {
      chain = chain.then(() => handleSessionId(sessionId)).catch(logError);
    },
    onEvent: (event) => {
      chain = chain.then(() => handleEvent(event)).catch(logError);
    },
    onExit: (code, signal) => {
      chain = chain.then(() => handleExit(code, signal)).catch(logError);
    },
    onError: (error) => {
      chain = chain.then(() => handleError(error)).catch(logError);
    },
  };

  handle = resume
    ? spawnResumeTask(
        { sessionId: task.sessionId as string, worktreePath, permissionMode },
        callbacks,
      )
    : spawnNewTask({ prompt: task.prompt, worktreePath, permissionMode }, callbacks);

  registerProcess(taskId, handle);
}
