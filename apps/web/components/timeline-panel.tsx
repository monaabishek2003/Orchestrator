"use client";

import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Play,
  XCircle,
} from "lucide-react";

import { formatCost, formatDuration } from "@/lib/format";
import { useTaskStore } from "@/lib/store";
import type { TimelineEntry } from "@/lib/types";
import { cn } from "@/lib/utils";

import { Button } from "./ui/button";

/* -------------------------------------------------------------------------- */
/*  Timeline entry rendering                                                   */
/* -------------------------------------------------------------------------- */

const ENTRY_CONFIG: Record<
  TimelineEntry["type"],
  { icon: typeof Play; className: string; verb: string }
> = {
  task_started: { icon: Play, className: "text-blue-400", verb: "started" },
  task_completed: {
    icon: CheckCircle2,
    className: "text-emerald-400",
    verb: "completed",
  },
  task_exceeded: {
    icon: AlertTriangle,
    className: "text-amber-400",
    verb: "exceeded token budget",
  },
  task_failed: { icon: XCircle, className: "text-destructive", verb: "failed" },
};

function formatTimelineTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  // Under 24 hours → relative time
  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;

  // Over 24 hours → absolute
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function TimelineRow({ entry }: { entry: TimelineEntry }) {
  const config = ENTRY_CONFIG[entry.type];
  const Icon = config.icon;

  const detail =
    entry.type === "task_completed" && (entry.cost || entry.duration)
      ? ` — ${entry.cost ? formatCost(entry.cost) : ""}${entry.cost && entry.duration ? ", " : ""}${entry.duration ? formatDuration(entry.duration) : ""}`
      : "";

  return (
    <div className="flex items-start gap-2 px-4 py-1.5">
      <Icon className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", config.className)} />
      <span className="min-w-0 flex-1 text-xs">
        <span className="font-medium text-foreground">
          &ldquo;{entry.taskTitle}&rdquo;
        </span>{" "}
        <span className="text-muted-foreground">
          {config.verb}
          {detail}
        </span>
      </span>
      <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
        {formatTimelineTimestamp(entry.timestamp)}
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Panel                                                                      */
/* -------------------------------------------------------------------------- */

export function TimelinePanel() {
  const [open, setOpen] = React.useState(false);
  const timeline = useTaskStore((s) => s.timeline);
  const fetchTimeline = useTaskStore((s) => s.fetchTimeline);
  const hasFetched = React.useRef(false);

  // Fetch timeline on first open.
  React.useEffect(() => {
    if (open && !hasFetched.current) {
      hasFetched.current = true;
      void fetchTimeline();
    }
  }, [open, fetchTimeline]);

  return (
    <div className="shrink-0 border-t">
      {/* Toggle bar */}
      <button
        type="button"
        className="flex w-full items-center gap-2 px-4 py-1.5 text-xs text-muted-foreground hover:bg-accent/40 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <Clock className="h-3.5 w-3.5" />
        <span className="font-medium">Timeline</span>
        {timeline.length > 0 ? (
          <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] tabular-nums">
            {timeline.length}
          </span>
        ) : null}
        <span className="flex-1" />
        {open ? (
          <ChevronDown className="h-3.5 w-3.5" />
        ) : (
          <ChevronUp className="h-3.5 w-3.5" />
        )}
      </button>

      {/* Content */}
      {open ? (
        <div className="h-[180px] overflow-y-auto border-t bg-background/50">
          {timeline.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">
              No activity yet. Start a task to see the timeline.
            </p>
          ) : (
            <div className="py-1">
              {timeline.map((entry, idx) => (
                <TimelineRow key={`${entry.taskId}-${entry.type}-${entry.timestamp}-${idx}`} entry={entry} />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
