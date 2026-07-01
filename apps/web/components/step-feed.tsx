"use client";

import * as React from "react";

import { getTask } from "@/lib/api";
import {
  describeEvent,
  truncateText,
  TYPE_LABELS,
  TYPE_STYLES,
} from "@/lib/event-helpers";
import { formatNumber } from "@/lib/format";
import { useTaskStore } from "@/lib/store";
import type { TaskEvent } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Only the most recent N events are rendered on the card (full history lives in the drawer). */
const MAX_RENDERED = 50;

function relativeTime(iso: string, now: number): string {
  const seconds = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

function StepRow({ event, now }: { event: TaskEvent; now: number }) {
  const { type, preview } = describeEvent(event);
  const tokens = event.inputTokens + event.outputTokens;

  return (
    <div className="flex items-start gap-2 text-[11px] leading-snug">
      <span
        className={cn(
          "mt-px shrink-0 rounded px-1.5 py-0.5 font-medium",
          TYPE_STYLES[type],
        )}
      >
        {TYPE_LABELS[type]}
      </span>
      <span className="min-w-0 flex-1 break-words text-foreground/90">
        {truncateText(preview) || "…"}
      </span>
      <span className="shrink-0 text-right text-muted-foreground">
        {tokens > 0 ? (
          <span className="block tabular-nums">+{formatNumber(tokens)} tokens</span>
        ) : null}
        <span className="block tabular-nums">
          {relativeTime(event.timestamp, now)}
        </span>
      </span>
    </div>
  );
}

/** Live, scrollable step feed for a running task's stream events. */
export function StepFeed({ taskId }: { taskId: string }) {
  const events = useTaskStore((state) => state.events[taskId]);
  const setEvents = useTaskStore((state) => state.setEvents);

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const atBottomRef = React.useRef(true);
  const [now, setNow] = React.useState(() => Date.now());

  // Backfill events that arrived before the socket connected.
  React.useEffect(() => {
    let cancelled = false;
    getTask(taskId)
      .then((data) => {
        if (!cancelled) setEvents(taskId, data.events);
      })
      .catch((err) => console.error(err));
    return () => {
      cancelled = true;
    };
  }, [taskId, setEvents]);

  // Tick for relative timestamps.
  React.useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(interval);
  }, []);

  const all = events ?? [];
  const rendered = all.slice(-MAX_RENDERED);

  // Auto-scroll to bottom on new events, unless the user scrolled up.
  React.useEffect(() => {
    const el = scrollRef.current;
    if (el && atBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [rendered.length]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    atBottomRef.current = distance < 24;
  }

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      onClick={(e) => e.stopPropagation()}
      className="max-h-[220px] min-h-[64px] space-y-1.5 overflow-y-auto rounded-md border bg-muted/20 p-2"
    >
      {rendered.length === 0 ? (
        <div className="flex items-center justify-center py-4 text-[11px] text-muted-foreground">
          <span className="animate-pulse">Waiting for response...</span>
        </div>
      ) : (
        rendered.map((event) => (
          <StepRow key={event.id} event={event} now={now} />
        ))
      )}
    </div>
  );
}
