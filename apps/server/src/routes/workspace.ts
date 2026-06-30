import { Router, type Request, type Response } from "express";

import { prisma } from "../db.js";
import { io } from "../server.js";
import {
  getWorkspaceBudget,
  setWorkspaceBudgetCap,
} from "../services/workspace-budget.js";
import { SocketEvents } from "../shared/events.js";

export const workspaceRouter: Router = Router();

const STATUSES = ["todo", "running", "done", "token_exceeded", "failed"] as const;
type StatusCounts = Record<(typeof STATUSES)[number], number>;

/** Build a zeroed status-count object filled from a groupBy result. */
async function getStatusCounts(): Promise<StatusCounts> {
  const grouped = await prisma.task.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  const counts: StatusCounts = {
    todo: 0,
    running: 0,
    done: 0,
    token_exceeded: 0,
    failed: 0,
  };
  for (const row of grouped) {
    if ((STATUSES as readonly string[]).includes(row.status)) {
      counts[row.status as (typeof STATUSES)[number]] = row._count._all;
    }
  }
  return counts;
}

/** Standard error response. */
function sendError(res: Response, status: number, message: string): void {
  res.status(status).json({ error: message });
}

// 1. Session stats for the top bar
workspaceRouter.get(
  "/workspace/stats",
  async (_req: Request, res: Response) => {
    try {
      const [taskCounts, totals, workspaceBudget] = await Promise.all([
        getStatusCounts(),
        prisma.task.aggregate({
          _sum: { totalTokens: true, totalCost: true },
        }),
        getWorkspaceBudget(),
      ]);

      return res.status(200).json({
        taskCounts,
        totalTokens: totals._sum.totalTokens ?? 0,
        totalCost: totals._sum.totalCost ?? 0,
        workspaceBudget,
      });
    } catch (error) {
      return sendError(res, 500, (error as Error).message);
    }
  },
);

// 2. Set the workspace budget cap
workspaceRouter.put(
  "/workspace/budget",
  async (req: Request, res: Response) => {
    try {
      const { budgetCap } = req.body ?? {};

      if (budgetCap !== null) {
        if (typeof budgetCap !== "number" || !(budgetCap > 0)) {
          return sendError(
            res,
            400,
            "budgetCap must be a positive number or null",
          );
        }
      }

      const updated = await setWorkspaceBudgetCap(budgetCap);
      io.emit(SocketEvents.WORKSPACE_UPDATE, updated);
      return res.status(200).json(updated);
    } catch (error) {
      return sendError(res, 500, (error as Error).message);
    }
  },
);

// 3. Cross-task activity feed
workspaceRouter.get(
  "/workspace/timeline",
  async (_req: Request, res: Response) => {
    try {
      const tasks = await prisma.task.findMany();

      type TimelineEntry = {
        type: string;
        taskId: string;
        taskTitle: string;
        timestamp: Date;
      };
      const entries: TimelineEntry[] = [];

      for (const task of tasks) {
        if (task.startedAt) {
          entries.push({
            type: "task_started",
            taskId: task.id,
            taskTitle: task.title,
            timestamp: task.startedAt,
          });
        }
        if (task.completedAt) {
          const type =
            task.status === "done"
              ? "task_completed"
              : task.status === "token_exceeded"
                ? "task_exceeded"
                : task.status === "failed"
                  ? "task_failed"
                  : null;
          if (type) {
            entries.push({
              type,
              taskId: task.id,
              taskTitle: task.title,
              timestamp: task.completedAt,
            });
          }
        }
      }

      entries.sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
      );

      return res.status(200).json(entries.slice(0, 100));
    } catch (error) {
      return sendError(res, 500, (error as Error).message);
    }
  },
);

// 4. Historical all-time stats
workspaceRouter.get("/analytics", async (_req: Request, res: Response) => {
  try {
    const [totalTasksAllTime, totals, durationAgg, tasksByStatus, recent] =
      await Promise.all([
        prisma.task.count(),
        prisma.task.aggregate({ _sum: { totalCost: true } }),
        prisma.task.aggregate({
          _avg: { duration: true },
          where: { duration: { not: null } },
        }),
        getStatusCounts(),
        prisma.task.findMany({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          },
          select: { createdAt: true, totalCost: true },
        }),
      ]);

    const totalCostAllTime = totals._sum.totalCost ?? 0;
    const averageCostPerTask =
      totalTasksAllTime > 0 ? totalCostAllTime / totalTasksAllTime : 0;
    const averageDurationPerTask = durationAgg._avg.duration ?? 0;

    // Aggregate cost by day (YYYY-MM-DD) over the last 30 days.
    const costMap = new Map<string, number>();
    for (const row of recent) {
      const day = row.createdAt.toISOString().slice(0, 10);
      costMap.set(day, (costMap.get(day) ?? 0) + row.totalCost);
    }
    const costByDay = [...costMap.entries()]
      .map(([date, cost]) => ({ date, cost }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return res.status(200).json({
      totalTasksAllTime,
      totalCostAllTime,
      averageCostPerTask,
      averageDurationPerTask,
      tasksByStatus,
      costByDay,
    });
  } catch (error) {
    return sendError(res, 500, (error as Error).message);
  }
});
