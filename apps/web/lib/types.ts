/** Task status values, mirroring the server's state model. */
export type TaskStatus =
  | "todo"
  | "running"
  | "done"
  | "token_exceeded"
  | "failed";

/** Permission mode passed to Claude. */
export type PermissionMode = "bypassPermissions" | "acceptEdits";

/** A task record, mirroring the server's Prisma Task model. */
export interface Task {
  id: string;
  title: string;
  prompt: string;
  tokenBudget: number;
  permissionMode: string;
  status: TaskStatus;
  sessionId: string | null;
  worktreePath: string | null;
  branchName: string | null;
  totalTokens: number;
  totalCost: number;
  totalSteps: number;
  duration: number | null;
  errorInfo: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** A Claude stream event record, mirroring the server's Prisma Event model. */
export interface TaskEvent {
  id: string;
  taskId: string;
  type: string;
  content: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  timestamp: string;
}

/** The workspace budget singleton. */
export interface WorkspaceBudget {
  budgetCap: number | null;
  totalSpent: number;
}
