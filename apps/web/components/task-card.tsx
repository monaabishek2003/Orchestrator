"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Task } from "@/lib/types";

const STATUS_LABELS: Record<Task["status"], string> = {
  todo: "Todo",
  running: "Running",
  done: "Done",
  token_exceeded: "Token Exceeded",
  failed: "Failed",
};

export function TaskCard({ task }: { task: Task }) {
  return (
    <Card
      role="button"
      tabIndex={0}
      className="cursor-pointer p-3 transition-colors hover:bg-accent/50"
      onClick={() => {
        // Detail drawer wired in a later section.
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium leading-snug">{task.title}</span>
        <Badge variant="secondary" className="shrink-0">
          {STATUS_LABELS[task.status]}
        </Badge>
      </div>
    </Card>
  );
}
