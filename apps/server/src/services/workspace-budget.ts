import type { WorkspaceBudget } from "@prisma/client";

import { prisma } from "../db.js";
import { io } from "../server.js";
import { getAllRunningProcesses, unregisterProcess } from "./process-registry.js";
import { SocketEvents } from "../shared/events.js";

/** Fixed ID for the singleton WorkspaceBudget row. */
export const WORKSPACE_BUDGET_ID = "workspace-budget-singleton";

/** Broadcast the full workspace budget record after a write. */
function emitWorkspaceUpdate(budget: WorkspaceBudget): void {
  io.emit(SocketEvents.WORKSPACE_UPDATE, budget);
}

/**
 * Read the singleton WorkspaceBudget record, creating it (cap null, spent 0)
 * if it does not yet exist.
 */
export async function getWorkspaceBudget(): Promise<WorkspaceBudget> {
  const existing = await prisma.workspaceBudget.findUnique({
    where: { id: WORKSPACE_BUDGET_ID },
  });
  if (existing) return existing;

  return prisma.workspaceBudget.create({
    data: { id: WORKSPACE_BUDGET_ID, budgetCap: null, totalSpent: 0 },
  });
}

/** Set (or clear, with null) the workspace dollar cap. */
export async function setWorkspaceBudgetCap(
  cap: number | null,
): Promise<WorkspaceBudget> {
  await getWorkspaceBudget();
  const updated = await prisma.workspaceBudget.update({
    where: { id: WORKSPACE_BUDGET_ID },
    data: { budgetCap: cap },
  });
  emitWorkspaceUpdate(updated);
  return updated;
}

/** Add an incremental dollar amount to cumulative workspace spend. */
export async function addSpent(amount: number): Promise<WorkspaceBudget> {
  await getWorkspaceBudget();
  const updated = await prisma.workspaceBudget.update({
    where: { id: WORKSPACE_BUDGET_ID },
    data: { totalSpent: { increment: amount } },
  });
  emitWorkspaceUpdate(updated);
  return updated;
}

/** Reset cumulative workspace spend to 0 (e.g. for a new session). */
export async function resetWorkspaceBudget(): Promise<WorkspaceBudget> {
  await getWorkspaceBudget();
  const updated = await prisma.workspaceBudget.update({
    where: { id: WORKSPACE_BUDGET_ID },
    data: { totalSpent: 0 },
  });
  emitWorkspaceUpdate(updated);
  return updated;
}

/**
 * Kill every running task process and move each affected task to
 * `token_exceeded` with a "Workspace budget exceeded" error.
 */
async function killAll(budget: WorkspaceBudget): Promise<void> {
  const running = getAllRunningProcesses();
  const completedAt = new Date();

  for (const [taskId, handle] of running) {
    handle.kill();
    unregisterProcess(taskId);

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    const duration = task?.startedAt
      ? Math.round((completedAt.getTime() - task.startedAt.getTime()) / 1000)
      : null;

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: {
        status: "token_exceeded",
        completedAt,
        duration,
        errorInfo: "Workspace budget exceeded",
      },
    });
    io.emit(SocketEvents.TASKS_UPDATE, updated);
  }

  io.emit(SocketEvents.WORKSPACE_BUDGET_EXCEEDED, budget);
}

/**
 * Check the workspace cap. Returns true (and triggers the kill-all sequence)
 * when `totalSpent >= budgetCap`. Returns false when no cap is set or the cap
 * has not been reached.
 */
export async function checkWorkspaceBudget(): Promise<boolean> {
  const budget = await getWorkspaceBudget();
  if (budget.budgetCap === null) return false;
  if (budget.totalSpent < budget.budgetCap) return false;

  await killAll(budget);
  return true;
}
