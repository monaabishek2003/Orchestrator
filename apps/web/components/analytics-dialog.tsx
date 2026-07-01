"use client";

import * as React from "react";

import { getAnalytics, getTasks } from "@/lib/api";
import { formatCost, formatDuration, formatNumber } from "@/lib/format";
import type { AnalyticsData, Task } from "@/lib/types";
import { cn } from "@/lib/utils";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

/* -------------------------------------------------------------------------- */
/*  Section 1 — Summary Cards                                                  */
/* -------------------------------------------------------------------------- */

function SummaryCards({ data }: { data: AnalyticsData }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard label="Total Tasks" value={`${data.totalTasksAllTime} tasks`} />
      <StatCard label="Total Cost" value={formatCost(data.totalCostAllTime)} />
      <StatCard
        label="Avg Cost / Task"
        value={formatCost(data.averageCostPerTask)}
      />
      <StatCard
        label="Avg Duration"
        value={
          data.averageDurationPerTask > 0
            ? formatDuration(data.averageDurationPerTask)
            : "—"
        }
      />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Section 2 — Tasks by Status                                                */
/* -------------------------------------------------------------------------- */

const STATUS_SEGMENTS: {
  key: keyof AnalyticsData["tasksByStatus"];
  label: string;
  className: string;
}[] = [
  { key: "done", label: "Done", className: "bg-emerald-500" },
  { key: "token_exceeded", label: "Exceeded", className: "bg-amber-500" },
  { key: "failed", label: "Failed", className: "bg-destructive" },
  { key: "running", label: "Running", className: "bg-blue-500" },
  { key: "todo", label: "Todo", className: "bg-secondary" },
];

function TasksByStatus({ data }: { data: AnalyticsData }) {
  const total = Object.values(data.tasksByStatus).reduce((a, b) => a + b, 0);

  if (total === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Tasks by Status</h3>

      {/* Bar */}
      <div className="flex h-4 overflow-hidden rounded-full">
        {STATUS_SEGMENTS.map(({ key, className }) => {
          const count = data.tasksByStatus[key];
          if (count === 0) return null;
          const pct = (count / total) * 100;
          return (
            <div
              key={key}
              className={cn("transition-all", className)}
              style={{ width: `${pct}%` }}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {STATUS_SEGMENTS.map(({ key, label, className }) => {
          const count = data.tasksByStatus[key];
          if (count === 0) return null;
          const pct = Math.round((count / total) * 100);
          return (
            <span key={key} className="flex items-center gap-1.5">
              <span
                className={cn("inline-block h-2.5 w-2.5 rounded-full", className)}
              />
              <span className="text-muted-foreground">
                {label}: {count} ({pct}%)
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Section 3 — Cost Over Time (last 30 days)                                  */
/* -------------------------------------------------------------------------- */

function CostOverTime({ data }: { data: AnalyticsData }) {
  const { costByDay } = data;

  if (costByDay.length === 0) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Cost Over Time (30 days)</h3>
        <p className="text-xs text-muted-foreground">No cost data yet.</p>
      </div>
    );
  }

  const maxCost = Math.max(...costByDay.map((d) => d.cost));

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Cost Over Time (30 days)</h3>
      <div className="flex items-end gap-px" style={{ height: 140 }}>
        {costByDay.map((day, idx) => {
          const heightPct = maxCost > 0 ? (day.cost / maxCost) * 100 : 0;
          return (
            <div
              key={day.date}
              className="group relative flex-1"
              style={{ height: "100%" }}
            >
              <div
                className="absolute bottom-0 w-full rounded-t-sm bg-blue-500/70 transition-colors group-hover:bg-blue-500"
                style={{ height: `${heightPct}%`, minHeight: day.cost > 0 ? 2 : 0 }}
              />
              <div className="pointer-events-none absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded bg-popover px-2 py-1 text-[10px] text-popover-foreground shadow-md group-hover:block">
                {day.date}: {formatCost(day.cost)}
              </div>
            </div>
          );
        })}
      </div>
      {/* X-axis labels — every 7th day */}
      <div className="flex text-[10px] text-muted-foreground">
        {costByDay.map((day, idx) => {
          const showLabel =
            idx === 0 ||
            idx === costByDay.length - 1 ||
            idx % 7 === 0;
          return (
            <span key={day.date} className="flex-1 text-center">
              {showLabel ? day.date.slice(5) : ""}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Section 4 — Insights                                                       */
/* -------------------------------------------------------------------------- */

function Insights({ tasks }: { tasks: Task[] }) {
  const completedTasks = tasks.filter(
    (t) => t.totalCost > 0 || (t.duration !== null && t.duration > 0),
  );

  if (completedTasks.length === 0) return null;

  const mostExpensive = completedTasks.reduce((best, t) =>
    t.totalCost > best.totalCost ? t : best,
  );

  const withDuration = completedTasks.filter(
    (t) => t.duration !== null && t.duration > 0,
  );
  const longest =
    withDuration.length > 0
      ? withDuration.reduce((best, t) =>
          (t.duration ?? 0) > (best.duration ?? 0) ? t : best,
        )
      : null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Insights</h3>
      <div className="space-y-1 text-xs text-muted-foreground">
        {mostExpensive.totalCost > 0 ? (
          <p>
            Most expensive task:{" "}
            <span className="font-medium text-foreground">
              &ldquo;{mostExpensive.title}&rdquo;
            </span>{" "}
            — {formatCost(mostExpensive.totalCost)}
          </p>
        ) : null}
        {longest && longest.duration ? (
          <p>
            Longest task:{" "}
            <span className="font-medium text-foreground">
              &ldquo;{longest.title}&rdquo;
            </span>{" "}
            — {formatDuration(longest.duration)}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Loading skeleton                                                            */
/* -------------------------------------------------------------------------- */

function Skeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-muted" />
        ))}
      </div>
      <div className="h-8 w-full rounded-full bg-muted" />
      <div className="h-36 rounded-lg bg-muted" />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main Dialog                                                                */
/* -------------------------------------------------------------------------- */

export function AnalyticsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [data, setData] = React.useState<AnalyticsData | null>(null);
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([getAnalytics(), getTasks()])
      .then(([analytics, allTasks]) => {
        setData(analytics);
        setTasks(allTasks);
      })
      .catch((err: unknown) => console.error(err))
      .finally(() => setLoading(false));
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Analytics</DialogTitle>
          <DialogDescription>
            All-time usage statistics and cost insights.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <Skeleton />
        ) : data === null || data.totalTasksAllTime === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No analytics yet. Complete some tasks to see your usage patterns
            here.
          </p>
        ) : (
          <div className="space-y-6 pt-2">
            <SummaryCards data={data} />
            <TasksByStatus data={data} />
            <CostOverTime data={data} />
            <Insights tasks={tasks} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
