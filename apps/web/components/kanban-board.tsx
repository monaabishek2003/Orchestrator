"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTaskStore } from "@/lib/store";
import type { TaskStatus } from "@/lib/types";
import { CreateTaskModal } from "./create-task-modal";
import { KanbanColumn } from "./kanban-column";
import { TaskDetailDrawer } from "./task-detail-drawer";

const COLUMNS: { status: TaskStatus; title: string }[] = [
  { status: "todo", title: "Todo" },
  { status: "running", title: "Running" },
  { status: "done", title: "Done" },
  { status: "token_exceeded", title: "Token Exceeded" },
  { status: "failed", title: "Failed" },
];

export function KanbanBoard() {
  const tasks = useTaskStore((state) => state.tasks);
  const fetchTasks = useTaskStore((state) => state.fetchTasks);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks]);

  return (
    <>
      <div className="flex h-full gap-4 overflow-x-auto p-4">
        {COLUMNS.map(({ status, title }) => (
          <KanbanColumn
            key={status}
            title={title}
            tasks={tasks.filter((t) => t.status === status)}
            headerAction={
              status === "todo" ? (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  aria-label="Create task"
                  onClick={() => setCreateOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              ) : undefined
            }
          />
        ))}
      </div>
      <CreateTaskModal open={createOpen} onOpenChange={setCreateOpen} />
      <TaskDetailDrawer />
    </>
  );
}
