"use client";

import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import type { Task } from "@/lib/types";
import { TaskCard } from "./task-card";

interface KanbanColumnProps {
  title: string;
  tasks: Task[];
  headerAction?: ReactNode;
}

export function KanbanColumn({ title, tasks, headerAction }: KanbanColumnProps) {
  return (
    <div className="flex h-full min-w-0 flex-1 flex-col rounded-lg border bg-card/30">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">{title}</h2>
          <Badge variant="outline">{tasks.length}</Badge>
        </div>
        {headerAction}
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {tasks.length === 0 ? (
          <p className="px-1 py-6 text-center text-xs text-muted-foreground">
            No tasks
          </p>
        ) : (
          tasks.map((task) => <TaskCard key={task.id} task={task} />)
        )}
      </div>
    </div>
  );
}
