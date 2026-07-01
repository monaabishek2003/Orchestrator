"use client";

import { create } from "zustand";

import { getTasks, getWorkspaceStats } from "./api";
import type { Task, TaskEvent, WorkspaceBudget } from "./types";

interface TaskState {
  tasks: Task[];
  events: Record<string, TaskEvent[]>;
  workspaceBudget: WorkspaceBudget;

  setTasks: (tasks: Task[]) => void;
  updateTask: (task: Task) => void;
  removeTask: (id: string) => void;
  addEvent: (taskId: string, event: TaskEvent) => void;
  setWorkspaceBudget: (budget: WorkspaceBudget) => void;

  fetchTasks: () => Promise<void>;
  fetchWorkspaceStats: () => Promise<void>;
}

export const useTaskStore = create<TaskState>((set) => ({
  tasks: [],
  events: {},
  workspaceBudget: { budgetCap: null, totalSpent: 0 },

  setTasks: (tasks) => set({ tasks }),

  updateTask: (task) =>
    set((state) => {
      const index = state.tasks.findIndex((t) => t.id === task.id);
      if (index === -1) {
        return { tasks: [task, ...state.tasks] };
      }
      const next = [...state.tasks];
      next[index] = task;
      return { tasks: next };
    }),

  removeTask: (id) =>
    set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) })),

  addEvent: (taskId, event) =>
    set((state) => {
      const existing = state.events[taskId] ?? [];
      return { events: { ...state.events, [taskId]: [...existing, event] } };
    }),

  setWorkspaceBudget: (budget) => set({ workspaceBudget: budget }),

  fetchTasks: async () => {
    const tasks = await getTasks();
    set({ tasks });
  },

  fetchWorkspaceStats: async () => {
    const stats = await getWorkspaceStats();
    set({
      workspaceBudget: {
        budgetCap: stats.workspaceBudget.budgetCap,
        totalSpent: stats.workspaceBudget.totalSpent,
      },
    });
  },
}));
