import type { Event, Task, WorkspaceBudget } from "@prisma/client";

/** Centralized Socket.io event names. Import these instead of raw strings. */
export const SocketEvents = {
  // Server → client
  TASKS_UPDATE: "tasks:update",
  TASKS_DELETE: "tasks:delete",
  TASK_EVENT: "task:event",
  WORKSPACE_UPDATE: "workspace:update",
  WORKSPACE_BUDGET_EXCEEDED: "workspace:budget-exceeded",

  // Client → server
  TASK_SEND_MESSAGE: "task:send-message",
  WORKSPACE_SUBSCRIBE: "workspace:subscribe",
} as const;

/** Payload for {@link SocketEvents.TASKS_UPDATE}: the full task record. */
export type TaskUpdatePayload = Task;

/** Payload for {@link SocketEvents.TASK_EVENT}: the full event record. */
export type TaskEventPayload = Event;

/** Payload for {@link SocketEvents.TASKS_DELETE}. */
export interface TaskDeletePayload {
  id: string;
}

/** Payload for {@link SocketEvents.WORKSPACE_UPDATE} and budget-exceeded. */
export type WorkspaceUpdatePayload = WorkspaceBudget;

/** Payload for the client→server {@link SocketEvents.TASK_SEND_MESSAGE}. */
export interface TaskSendMessagePayload {
  taskId: string;
  message: string;
}
