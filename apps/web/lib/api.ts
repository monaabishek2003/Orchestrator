import type { PermissionMode, Task, TaskEvent, WorkspaceBudget } from "./types";

/** Resolve the API base URL for dev vs. production (static export). */
function getBaseUrl(): string {
  const envUrl = process.env["NEXT_PUBLIC_API_URL"];
  if (envUrl) return envUrl;

  if (typeof window !== "undefined") {
    // Served by the Express static host on port 8000 → use relative URLs.
    if (window.location.port === "8000") return "";
  }
  return "http://localhost:8000";
}

export const API_BASE_URL = getBaseUrl();

interface RequestOptions {
  method?: string;
  body?: unknown;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body } = options;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers:
      body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      /* ignore parse errors */
    }
    throw new Error(message);
  }

  return (await res.json()) as T;
}

export interface CreateTaskInput {
  title: string;
  prompt: string;
  tokenBudget: number;
  permissionMode: PermissionMode;
}

export type UpdateTaskInput = Partial<CreateTaskInput>;

export interface WorkspaceStats {
  taskCounts: Record<string, number>;
  totalTokens: number;
  totalCost: number;
  workspaceBudget: WorkspaceBudget & { id: string };
}

export function createTask(data: CreateTaskInput): Promise<Task> {
  return request<Task>("/api/tasks", { method: "POST", body: data });
}

export function getTasks(): Promise<Task[]> {
  return request<Task[]>("/api/tasks");
}

export function getTask(
  id: string,
): Promise<{ task: Task; events: TaskEvent[] }> {
  return request<{ task: Task; events: TaskEvent[] }>(`/api/tasks/${id}`);
}

export function updateTask(id: string, data: UpdateTaskInput): Promise<Task> {
  return request<Task>(`/api/tasks/${id}`, { method: "PUT", body: data });
}

export function deleteTask(id: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/api/tasks/${id}`, {
    method: "DELETE",
  });
}

export function startTask(id: string): Promise<Task> {
  return request<Task>(`/api/tasks/${id}/start`, { method: "POST" });
}

export function stopTask(id: string): Promise<Task> {
  return request<Task>(`/api/tasks/${id}/stop`, { method: "POST" });
}

export function resumeTask(
  id: string,
  data: { tokenBudget: number },
): Promise<Task> {
  return request<Task>(`/api/tasks/${id}/resume`, {
    method: "POST",
    body: data,
  });
}

export function retryTask(id: string): Promise<Task> {
  return request<Task>(`/api/tasks/${id}/retry`, { method: "POST" });
}

export function sendMessage(
  id: string,
  message: string,
): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/api/tasks/${id}/message`, {
    method: "POST",
    body: { message },
  });
}

export function getWorkspaceStats(): Promise<WorkspaceStats> {
  return request<WorkspaceStats>("/api/workspace/stats");
}
