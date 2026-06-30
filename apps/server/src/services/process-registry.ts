import type { ProcessHandle } from "../agent/spawner.js";

/**
 * In-memory map of currently running task processes. Reflects live OS
 * processes only — never persisted to the database.
 */
const registry = new Map<string, ProcessHandle>();

/** Register a running task's process handle. */
export function registerProcess(taskId: string, handle: ProcessHandle): void {
  registry.set(taskId, handle);
}

/** Remove a task from the registry (when it reaches a terminal state). */
export function unregisterProcess(taskId: string): void {
  registry.delete(taskId);
}

/** Get the process handle for a task, or undefined if not running. */
export function getRunningProcess(taskId: string): ProcessHandle | undefined {
  return registry.get(taskId);
}

/** Get all running task processes as [taskId, handle] pairs. */
export function getAllRunningProcesses(): Array<[string, ProcessHandle]> {
  return [...registry.entries()];
}

/** Number of currently running tasks. */
export function getRunningCount(): number {
  return registry.size;
}
