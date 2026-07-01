"use client";

import * as React from "react";

import { getTask } from "@/lib/api";
import {
  describeEvent,
  truncateText,
  TYPE_LABELS,
  TYPE_STYLES,
  type DisplayType,
} from "@/lib/event-helpers";
import {
  formatCost,
  formatDuration,
  formatElapsed,
  formatNumber,
} from "@/lib/format";
import { useTaskStore } from "@/lib/store";
import type { Task, TaskEvent, TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "./ui/sheet";

/* -------------------------------------------------------------------------- */
/*  Hooks                                                                      */
/* -------------------------------------------------------------------------- */

function useElapsedSeconds(startedAt: string | null, active: boolean): number {
  const [seconds, setSeconds] = React.useState(() =>
    startedAt
      ? Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
      : 0,
  );

  React.useEffect(() => {
    if (!startedAt || !active) {
      if (startedAt) {
        setSeconds(
          Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000),
        );
      } else {
        setSeconds(0);
      }
      return;
    }
    const start = new Date(startedAt).getTime();
    const tick = () => setSeconds(Math.floor((Date.now() - start) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt, active]);

  return seconds;
}

/* -------------------------------------------------------------------------- */
/*  Status badge — same colors as the board cards                              */
/* -------------------------------------------------------------------------- */

const STATUS_BADGE: Record<
  TaskStatus,
  { label: string; className: string; variant?: "destructive" }
> = {
  todo: {
    label: "Todo",
    className: "border-transparent bg-secondary text-secondary-foreground",
  },
  running: {
    label: "Running",
    className: "border-transparent bg-blue-500/15 text-blue-400",
  },
  done: {
    label: "Done",
    className: "border-transparent bg-emerald-600/15 text-emerald-400",
  },
  token_exceeded: {
    label: "Budget Exceeded",
    className: "border-transparent bg-amber-500/15 text-amber-400",
  },
  failed: {
    label: "Failed",
    className: "",
    variant: "destructive",
  },
};

/* -------------------------------------------------------------------------- */
/*  Section 1 — Header                                                         */
/* -------------------------------------------------------------------------- */

function DrawerHeader({ task }: { task: Task }) {
  const isRunning = task.status === "running";
  const elapsed = useElapsedSeconds(task.startedAt, isRunning);
  const badge = STATUS_BADGE[task.status];

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-semibold leading-tight">{task.title}</h2>
        {isRunning ? (
          <span className="mt-1 block font-mono text-sm tabular-nums text-muted-foreground">
            {formatElapsed(elapsed)}
          </span>
        ) : null}
      </div>
      <Badge
        variant={badge.variant ?? "default"}
        className={cn("shrink-0", badge.className)}
      >
        {badge.label}
      </Badge>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Section 2 — Summary                                                        */
/* -------------------------------------------------------------------------- */

function SummarySection({ task }: { task: Task }) {
  const isRunning = task.status === "running";
  const elapsed = useElapsedSeconds(task.startedAt, isRunning);
  const events = useTaskStore((s) => s.events[task.id]) ?? [];

  const totalInput = events.reduce((sum, e) => sum + e.inputTokens, 0);
  const totalOutput = events.reduce((sum, e) => sum + e.outputTokens, 0);

  const durationLabel = isRunning
    ? `Running... (${formatElapsed(elapsed)})`
    : task.duration !== null
      ? formatDuration(task.duration)
      : "—";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatBox label="Tokens" value={formatNumber(task.totalTokens)} />
        <StatBox label="Cost" value={formatCost(task.totalCost)} />
        <StatBox label="Steps" value={String(task.totalSteps)} />
        <StatBox label="Duration" value={durationLabel} />
      </div>
      <p className="text-xs tabular-nums text-muted-foreground">
        Input: {formatNumber(totalInput)} &nbsp;|&nbsp; Output:{" "}
        {formatNumber(totalOutput)}
      </p>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/30 p-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Section 3 — Token bar                                                      */
/* -------------------------------------------------------------------------- */

function TokenBar({ task }: { task: Task }) {
  const percent =
    task.tokenBudget > 0
      ? Math.min(100, (task.totalTokens / task.tokenBudget) * 100)
      : 0;

  return (
    <div className="space-y-1">
      <Progress value={percent} />
      <div className="flex items-center justify-between text-xs tabular-nums text-muted-foreground">
        <span>
          {formatNumber(task.totalTokens)} / {formatNumber(task.tokenBudget)}{" "}
          tokens
        </span>
        <span>{percent.toFixed(1)}%</span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Section 4 — Bar chart (tokens per step)                                    */
/* -------------------------------------------------------------------------- */

const MAX_CHART_BARS = 30;

function TokenBarChart({ task }: { task: Task }) {
  const events = useTaskStore((s) => s.events[task.id]) ?? [];

  const tokenEvents = events
    .map((e, idx) => ({
      event: e,
      index: idx,
      tokens: e.inputTokens + e.outputTokens,
    }))
    .filter((e) => e.tokens > 0);

  if (tokenEvents.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No token-bearing events yet.
      </p>
    );
  }

  // Take the most recent N if too many.
  const display =
    tokenEvents.length > MAX_CHART_BARS
      ? tokenEvents.slice(-MAX_CHART_BARS)
      : tokenEvents;

  const maxTokens = Math.max(...display.map((d) => d.tokens));
  const mostExpensiveIdx = display.reduce(
    (best, cur, i) => (cur.tokens > display[best]!.tokens ? i : best),
    0,
  );

  const mostExpensive = display[mostExpensiveIdx]!;
  const { type: expType } = describeEvent(mostExpensive.event);

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-px" style={{ height: 120 }}>
        {display.map((d, i) => {
          const heightPct = (d.tokens / maxTokens) * 100;
          const isMostExpensive = i === mostExpensiveIdx;
          const { type } = describeEvent(d.event);
          return (
            <div
              key={d.event.id}
              className="group relative flex-1"
              style={{ height: "100%" }}
            >
              <div
                className={cn(
                  "absolute bottom-0 w-full rounded-t-sm transition-colors",
                  isMostExpensive
                    ? "bg-amber-500"
                    : "bg-blue-500/60 group-hover:bg-blue-500/80",
                )}
                style={{ height: `${heightPct}%`, minHeight: 2 }}
              />
              <div className="pointer-events-none absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded bg-popover px-2 py-1 text-[10px] text-popover-foreground shadow-md group-hover:block">
                {TYPE_LABELS[type]} — {formatNumber(d.tokens)}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        Most expensive:{" "}
        <span className="font-medium text-amber-400">
          {TYPE_LABELS[expType]} — {formatNumber(mostExpensive.tokens)} tokens
        </span>
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Section 5 — Full step history                                              */
/* -------------------------------------------------------------------------- */

function formatTimestamp(iso: string, firstIso: string | undefined): string {
  const d = new Date(iso);
  const first = firstIso ? new Date(firstIso) : d;
  const sameDay =
    d.getFullYear() === first.getFullYear() &&
    d.getMonth() === first.getMonth() &&
    d.getDate() === first.getDate();

  if (sameDay) {
    return d.toLocaleTimeString("en-US", { hour12: false });
  }
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function formatEventContent(content: string): React.ReactNode {
  try {
    const parsed = JSON.parse(content);
    return (
      <pre className="whitespace-pre-wrap break-words text-xs">
        {JSON.stringify(parsed, null, 2)}
      </pre>
    );
  } catch {
    return (
      <pre className="whitespace-pre-wrap break-words text-xs">{content}</pre>
    );
  }
}

function HistoryRow({
  event,
  index,
  firstTimestamp,
}: {
  event: TaskEvent;
  index: number;
  firstTimestamp: string | undefined;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const { type, preview } = describeEvent(event);
  const tokens = event.inputTokens + event.outputTokens;

  return (
    <div className="space-y-1 border-b border-border/50 py-2 last:border-b-0">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 shrink-0 text-xs tabular-nums text-muted-foreground">
          {index}
        </span>
        <span
          className={cn(
            "mt-px shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium",
            TYPE_STYLES[type],
          )}
        >
          {TYPE_LABELS[type]}
        </span>
        <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
          {formatTimestamp(event.timestamp, firstTimestamp)}
        </span>
        <span className="min-w-0 flex-1" />
        {tokens > 0 ? (
          <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
            In: {formatNumber(event.inputTokens)} | Out:{" "}
            {formatNumber(event.outputTokens)} | Total: {formatNumber(tokens)}
          </span>
        ) : null}
      </div>

      {event.cost > 0 ? (
        <p className="pl-6 text-[11px] tabular-nums text-muted-foreground">
          {formatCost(event.cost)}
        </p>
      ) : null}

      <div className="pl-6">
        {expanded ? (
          <>
            <div className="max-h-80 overflow-auto rounded-md bg-muted/30 p-2">
              {formatEventContent(event.content)}
            </div>
            <button
              type="button"
              className="mt-1 text-[11px] text-blue-400 hover:underline"
              onClick={() => setExpanded(false)}
            >
              Show less
            </button>
          </>
        ) : (
          <button
            type="button"
            className="text-left text-[11px] text-foreground/70 hover:text-foreground"
            onClick={() => setExpanded(true)}
          >
            {truncateText(preview, 150) || "…"}
            {preview.length > 150 ? (
              <span className="ml-1 text-blue-400">Show more</span>
            ) : null}
          </button>
        )}
      </div>
    </div>
  );
}

function StepHistory({ task }: { task: Task }) {
  const events = useTaskStore((s) => s.events[task.id]) ?? [];
  const isRunning = task.status === "running";
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const atBottomRef = React.useRef(true);
  const firstTimestamp = events[0]?.timestamp;

  // Auto-scroll for running tasks.
  React.useEffect(() => {
    const el = scrollRef.current;
    if (el && isRunning && atBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [events.length, isRunning]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    atBottomRef.current = distance < 24;
  }

  if (events.length === 0) {
    return (
      <p className="py-4 text-center text-xs text-muted-foreground">
        No events recorded.
      </p>
    );
  }

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="max-h-[400px] overflow-y-auto"
    >
      {events.map((event, idx) => (
        <HistoryRow
          key={event.id}
          event={event}
          index={idx + 1}
          firstTimestamp={firstTimestamp}
        />
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Section 6 — Task metadata                                                  */
/* -------------------------------------------------------------------------- */

function formatDatetime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function TaskMetadata({ task }: { task: Task }) {
  const [promptExpanded, setPromptExpanded] = React.useState(false);

  return (
    <div className="space-y-2 text-xs text-muted-foreground">
      <div>
        <span className="font-medium text-foreground">Prompt</span>
        {task.prompt.length > 200 && !promptExpanded ? (
          <>
            <p className="mt-1 whitespace-pre-wrap">
              {task.prompt.slice(0, 200)}...
            </p>
            <button
              type="button"
              className="text-blue-400 hover:underline"
              onClick={() => setPromptExpanded(true)}
            >
              Show full prompt
            </button>
          </>
        ) : (
          <>
            <p className="mt-1 whitespace-pre-wrap">{task.prompt}</p>
            {task.prompt.length > 200 ? (
              <button
                type="button"
                className="text-blue-400 hover:underline"
                onClick={() => setPromptExpanded(false)}
              >
                Collapse
              </button>
            ) : null}
          </>
        )}
      </div>

      <MetaRow label="Permission mode" value={task.permissionMode} />
      <MetaRow label="Worktree" value={task.worktreePath ?? "—"} />
      <MetaRow label="Branch" value={task.branchName ?? "—"} />
      <MetaRow label="Session ID" value={task.sessionId ?? "—"} />
      <MetaRow label="Created" value={formatDatetime(task.createdAt)} />
      <MetaRow label="Started" value={formatDatetime(task.startedAt)} />
      <MetaRow label="Completed" value={formatDatetime(task.completedAt)} />

      {task.errorInfo ? (
        <div>
          <span className="font-medium text-destructive">Error</span>
          <p className="mt-1 whitespace-pre-wrap text-destructive">
            {task.errorInfo}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="shrink-0 font-medium text-foreground">{label}:</span>
      <span className="min-w-0 break-all">{value}</span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main Drawer                                                                */
/* -------------------------------------------------------------------------- */

export function TaskDetailDrawer() {
  const selectedTaskId = useTaskStore((s) => s.selectedTaskId);
  const setSelectedTaskId = useTaskStore((s) => s.setSelectedTaskId);
  const task = useTaskStore((s) =>
    s.tasks.find((t) => t.id === selectedTaskId),
  );
  const setEvents = useTaskStore((s) => s.setEvents);

  const open = selectedTaskId !== null && task !== undefined;

  // Fetch full task + events on open.
  React.useEffect(() => {
    if (!selectedTaskId) return;
    let cancelled = false;
    getTask(selectedTaskId)
      .then((data) => {
        if (!cancelled) {
          setEvents(selectedTaskId, data.events);
        }
      })
      .catch((err: unknown) => console.error(err));
    return () => {
      cancelled = true;
    };
  }, [selectedTaskId, setEvents]);

  return (
    <Sheet
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) setSelectedTaskId(null);
      }}
    >
      <SheetContent
        side="right"
        className="flex w-[600px] max-w-[50vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-[600px]"
      >
        {task ? (
          <>
            <SheetHeader className="space-y-0 px-6 pt-6 pb-0">
              <SheetTitle className="sr-only">{task.title}</SheetTitle>
              <SheetDescription className="sr-only">
                Detail view for task {task.title}
              </SheetDescription>
              <DrawerHeader task={task} />
            </SheetHeader>

            <ScrollArea className="min-h-0 flex-1">
              <div className="space-y-0 px-6 pb-6">
                <Separator className="my-4" />
                <SummarySection task={task} />

                <Separator className="my-4" />
                <TokenBar task={task} />

                <Separator className="my-4" />
                <div>
                  <h3 className="mb-2 text-sm font-medium">
                    Tokens per step
                  </h3>
                  <TokenBarChart task={task} />
                </div>

                <Separator className="my-4" />
                <div>
                  <h3 className="mb-2 text-sm font-medium">Step history</h3>
                  <StepHistory task={task} />
                </div>

                <Separator className="my-4" />
                <div>
                  <h3 className="mb-2 text-sm font-medium">Metadata</h3>
                  <TaskMetadata task={task} />
                </div>
              </div>
            </ScrollArea>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
