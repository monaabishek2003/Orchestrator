"use client";

import * as React from "react";
import { BarChart3, Pencil, X } from "lucide-react";

import { AnalyticsDialog } from "./analytics-dialog";

import { setWorkspaceBudgetCap } from "@/lib/api";
import { formatCost, formatNumber } from "@/lib/format";
import { useTaskStore } from "@/lib/store";
import type { TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Progress } from "./ui/progress";

/* -------------------------------------------------------------------------- */
/*  Left — session stats                                                       */
/* -------------------------------------------------------------------------- */

const STATUS_CONFIG: {
  status: TaskStatus;
  label: string;
  className: string;
}[] = [
  {
    status: "todo",
    label: "Todo",
    className: "bg-secondary text-secondary-foreground",
  },
  {
    status: "running",
    label: "Running",
    className: "bg-blue-500/15 text-blue-400",
  },
  {
    status: "done",
    label: "Done",
    className: "bg-emerald-600/15 text-emerald-400",
  },
  {
    status: "token_exceeded",
    label: "Exceeded",
    className: "bg-amber-500/15 text-amber-400",
  },
  {
    status: "failed",
    label: "Failed",
    className: "bg-destructive/15 text-destructive",
  },
];

function SessionStats() {
  const tasks = useTaskStore((s) => s.tasks);

  const counts = React.useMemo(() => {
    const map: Record<TaskStatus, number> = {
      todo: 0,
      running: 0,
      done: 0,
      token_exceeded: 0,
      failed: 0,
    };
    for (const t of tasks) {
      map[t.status] = (map[t.status] ?? 0) + 1;
    }
    return map;
  }, [tasks]);

  const totalTokens = React.useMemo(
    () => tasks.reduce((sum, t) => sum + t.totalTokens, 0),
    [tasks],
  );
  const totalCost = React.useMemo(
    () => tasks.reduce((sum, t) => sum + t.totalCost, 0),
    [tasks],
  );

  return (
    <div className="flex items-center gap-3">
      {/* Status counts */}
      <div className="flex items-center gap-1.5">
        {STATUS_CONFIG.map(({ status, label, className }) => {
          const count = counts[status];
          if (count === 0) return null;
          return (
            <span
              key={status}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium",
                className,
              )}
            >
              {count} {label}
            </span>
          );
        })}
      </div>

      {/* Separator */}
      {tasks.length > 0 ? (
        <span className="h-4 w-px bg-border" aria-hidden="true" />
      ) : null}

      {/* Aggregates */}
      {totalTokens > 0 ? (
        <span className="text-xs tabular-nums text-muted-foreground">
          {formatNumber(totalTokens)} tokens
        </span>
      ) : null}
      {totalCost > 0 ? (
        <span className="text-xs font-medium tabular-nums text-foreground">
          {formatCost(totalCost)}
        </span>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Right — workspace budget                                                   */
/* -------------------------------------------------------------------------- */

const PRESETS = [1, 5, 10, 25, 50];

function BudgetSetter({
  currentCap,
  onClose,
}: {
  currentCap: number | null;
  onClose: () => void;
}) {
  const [value, setValue] = React.useState(
    currentCap !== null ? String(currentCap) : "",
  );
  const [submitting, setSubmitting] = React.useState(false);

  const parsed = parseFloat(value);
  const isValid = value.trim() !== "" && Number.isFinite(parsed) && parsed > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || submitting) return;
    setSubmitting(true);
    try {
      const budget = await setWorkspaceBudgetCap(parsed);
      useTaskStore.getState().setWorkspaceBudget(budget);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3">
      <p className="text-sm font-medium">Set workspace budget</p>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">$</span>
        <Input
          type="number"
          step="0.01"
          min={0.01}
          placeholder="10.00"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-8"
          autoFocus
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <Button
            key={p}
            type="button"
            variant={parsed === p ? "default" : "outline"}
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setValue(String(p))}
          >
            ${p}
          </Button>
        ))}
      </div>
      <Button
        type="submit"
        size="sm"
        className="w-full"
        disabled={!isValid || submitting}
      >
        {submitting ? "Setting..." : "Set"}
      </Button>
    </form>
  );
}

function WorkspaceBudgetSection() {
  const workspaceBudget = useTaskStore((s) => s.workspaceBudget);
  const [popoverOpen, setPopoverOpen] = React.useState(false);
  const [confirmRemove, setConfirmRemove] = React.useState(false);

  const { budgetCap, totalSpent } = workspaceBudget;

  async function handleRemoveCap() {
    try {
      const budget = await setWorkspaceBudgetCap(null);
      useTaskStore.getState().setWorkspaceBudget(budget);
    } catch (err) {
      console.error(err);
    }
    setConfirmRemove(false);
  }

  if (budgetCap === null) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs tabular-nums text-muted-foreground">
          {formatCost(totalSpent)} spent (no cap)
        </span>
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs">
              Set Budget
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64">
            <BudgetSetter
              currentCap={null}
              onClose={() => setPopoverOpen(false)}
            />
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  const percent = Math.min(100, (totalSpent / budgetCap) * 100);
  const progressColor =
    percent >= 85
      ? "[&>div]:bg-destructive"
      : percent >= 60
        ? "[&>div]:bg-amber-500"
        : "[&>div]:bg-emerald-500";

  return (
    <div className="flex items-center gap-2">
      <div className="flex w-40 flex-col gap-0.5">
        <Progress value={percent} className={cn("h-2", progressColor)} />
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {formatCost(totalSpent)} / {formatCost(budgetCap)}
        </span>
      </div>

      {/* Edit budget */}
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            aria-label="Edit budget"
          >
            <Pencil className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-64">
          <BudgetSetter
            currentCap={budgetCap}
            onClose={() => setPopoverOpen(false)}
          />
        </PopoverContent>
      </Popover>

      {/* Remove budget */}
      {confirmRemove ? (
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-muted-foreground">Remove cap?</span>
          <Button
            variant="destructive"
            size="sm"
            className="h-6 px-2 text-[11px]"
            onClick={() => void handleRemoveCap()}
          >
            Yes
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[11px]"
            onClick={() => setConfirmRemove(false)}
          >
            No
          </Button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          aria-label="Remove budget"
          onClick={() => setConfirmRemove(true)}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Top bar                                                                    */
/* -------------------------------------------------------------------------- */

export function TopBar() {
  const [analyticsOpen, setAnalyticsOpen] = React.useState(false);

  return (
    <div className="flex h-full items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <span className="text-sm font-semibold tracking-tight">
          Orchestrator
        </span>
        <SessionStats />
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => setAnalyticsOpen(true)}
        >
          <BarChart3 className="h-3.5 w-3.5" />
          Analytics
        </Button>
        <WorkspaceBudgetSection />
      </div>
      <AnalyticsDialog open={analyticsOpen} onOpenChange={setAnalyticsOpen} />
    </div>
  );
}
