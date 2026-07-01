"use client";

import { useEffect } from "react";
import { io, type Socket } from "socket.io-client";

import { API_BASE_URL } from "./api";
import { useTaskStore } from "./store";
import type { Task, TaskEvent, WorkspaceBudget } from "./types";

/** Socket.io event names — must match the server's contract. */
const Events = {
  TASKS_UPDATE: "tasks:update",
  TASKS_DELETE: "tasks:delete",
  TASK_EVENT: "task:event",
  WORKSPACE_UPDATE: "workspace:update",
  WORKSPACE_BUDGET_EXCEEDED: "workspace:budget-exceeded",
} as const;

let socket: Socket | null = null;

/** Lazily create the singleton Socket.io connection. */
function getSocket(): Socket {
  if (!socket) {
    socket = io(API_BASE_URL || undefined, {
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}

/**
 * Initialize the Socket.io connection once and wire incoming events into the
 * Zustand store. Safe to call from a top-level provider/component.
 */
export function useSocket(): void {
  useEffect(() => {
    const s = getSocket();
    const store = useTaskStore.getState();

    const onTaskUpdate = (task: Task): void => store.updateTask(task);
    const onTaskDelete = (payload: { id: string }): void =>
      store.removeTask(payload.id);
    const onTaskEvent = (event: TaskEvent): void =>
      store.addEvent(event.taskId, event);
    const onWorkspaceUpdate = (budget: WorkspaceBudget): void =>
      store.setWorkspaceBudget({
        budgetCap: budget.budgetCap,
        totalSpent: budget.totalSpent,
      });

    s.on(Events.TASKS_UPDATE, onTaskUpdate);
    s.on(Events.TASKS_DELETE, onTaskDelete);
    s.on(Events.TASK_EVENT, onTaskEvent);
    s.on(Events.WORKSPACE_UPDATE, onWorkspaceUpdate);
    s.on(Events.WORKSPACE_BUDGET_EXCEEDED, onWorkspaceUpdate);

    return () => {
      s.off(Events.TASKS_UPDATE, onTaskUpdate);
      s.off(Events.TASKS_DELETE, onTaskDelete);
      s.off(Events.TASK_EVENT, onTaskEvent);
      s.off(Events.WORKSPACE_UPDATE, onWorkspaceUpdate);
      s.off(Events.WORKSPACE_BUDGET_EXCEEDED, onWorkspaceUpdate);
    };
  }, []);
}
