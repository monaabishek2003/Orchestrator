"use client";

import { X } from "lucide-react";

import { useTaskStore } from "@/lib/store";

import { Button } from "./ui/button";

export function BudgetExceededBanner() {
  const exceeded = useTaskStore((s) => s.budgetExceeded);
  const dismiss = useTaskStore((s) => s.setBudgetExceeded);

  if (!exceeded) return null;

  return (
    <div className="flex items-center justify-between gap-2 border-b border-destructive/30 bg-destructive/10 px-4 py-2">
      <p className="text-sm font-medium text-destructive">
        Workspace budget exceeded — all running tasks have been stopped.
      </p>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0 text-destructive hover:text-destructive"
        onClick={() => dismiss(false)}
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
