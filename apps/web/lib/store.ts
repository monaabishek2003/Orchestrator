"use client";

import { create } from "zustand";

import { getTimeline, getTasks, getWorkspaceStats } from "./api";
import type { Task, TaskEvent, TimelineEntry, WorkspaceBudget } from "./types";

const MAX_TIMELINE = 100;

interface TaskState {
  tasks: Task[];
  events: Record<string, TaskEvent[]>;
  workspaceBudget: WorkspaceBudget;
  selectedTaskId: string | null;
  budgetExceeded: boolean;
  timeline: TimelineEntry[];

  setTasks: (tasks: Task[]) => void;
  updateTask: (task: Task) => void;
  removeTask: (id: string) => void;
  addEvent: (taskId: string, event: TaskEvent) => void;
  setEvents: (taskId: string, events: TaskEvent[]) => void;
  clearEvents: (taskId: string) => void;
  setWorkspaceBudget: (budget: WorkspaceBudget) => void;
  setSelectedTaskId: (id: string | null) => void;
  setBudgetExceeded: (exceeded: boolean) => void;
  setTimeline: (entries: TimelineEntry[]) => void;
  addTimelineEntry: (entry: TimelineEntry) => void;

  fetchTasks: () => Promise<void>;
  fetchWorkspaceStats: () => Promise<void>;
  fetchTimeline: () => Promise<void>;
}

export const useTaskStore = create<TaskState>((set) => ({
  tasks: [],
  events: {},
  workspaceBudget: { budgetCap: null, totalSpent: 0 },
  selectedTaskId: null,
  budgetExceeded: false,
  timeline: [],

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
      if (existing.some((e) => e.id === event.id)) return {};
      return { events: { ...state.events, [taskId]: [...existing, event] } };
    }),

  setEvents: (taskId, incoming) =>
    set((state) => {
      const byId = new Map<string, TaskEvent>();
      for (const e of incoming) byId.set(e.id, e);
      for (const e of state.events[taskId] ?? []) byId.set(e.id, e);
      const merged = Array.from(byId.values()).sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );
      return { events: { ...state.events, [taskId]: merged } };
    }),

  clearEvents: (taskId) =>
    set((state) => {
      if (!(taskId in state.events)) return {};
      const next = { ...state.events };
      delete next[taskId];
      return { events: next };
    }),

  setWorkspaceBudget: (budget) => set({ workspaceBudget: budget }),

  setSelectedTaskId: (id) => set({ selectedTaskId: id }),

  setBudgetExceeded: (exceeded) => set({ budgetExceeded: exceeded }),

  setTimeline: (entries) => set({ timeline: entries.slice(0, MAX_TIMELINE) }),

  addTimelineEntry: (entry) =>
    set((state) => ({
      timeline: [entry, ...state.timeline].slice(0, MAX_TIMELINE),
    })),

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

  fetchTimeline: async () => {
    const entries = await getTimeline();
    set({ timeline: entries.slice(0, MAX_TIMELINE) });
  },
}));
