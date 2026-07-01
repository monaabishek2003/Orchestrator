"use client";

import * as React from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  deleteTask,
  resumeTask,
  retryTask,
  startTask,
  stopTask,
} from "@/lib/api";
import {
  formatCost,
  formatDuration,
  formatElapsed,
  formatNumber,
  formatTokensCompact,
  roundUpToNearest10K,
} from "@/lib/format";
import type { Task } from "@/lib/types";
import { CreateTaskModal } from "./create-task-modal";
import { MessageInput } from "./message-input";
import { StepFeed } from "./step-feed";

/** Stops a click from bubbling up to the card's open-detail handler. */
function stop(event: React.MouseEvent): void {
  event.stopPropagation();
}

/** Runs an async action while tracking an in-flight `pending` flag. */
function useAsyncAction(): {
  pending: boolean;
  run: (fn: () => Promise<unknown>) => Promise<void>;
} {
  const [pending, setPending] = React.useState(false);
  const mounted = React.useRef(true);
  React.useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = React.useCallback(async (fn: () => Promise<unknown>) => {
    setPending(true);
    try {
      await fn();
    } catch (err) {
      console.error(err);
    } finally {
      if (mounted.current) setPending(false);
    }
  }, []);

  return { pending, run };
}

/** A destructive/confirming action button backed by an AlertDialog. */
function ConfirmActionButton({
  label,
  variant = "destructive",
  size = "sm",
  className,
  title,
  description,
  confirmLabel,
  confirmClassName,
  onConfirm,
}: {
  label: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  className?: string;
  title: string;
  description: string;
  confirmLabel: string;
  confirmClassName?: string;
  onConfirm: () => Promise<unknown>;
}) {
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  async function handleConfirm() {
    setPending(true);
    try {
      await onConfirm();
      setOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setPending(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={className}
          onClick={stop}
        >
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent onClick={stop}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={confirmClassName}
            disabled={pending}
            onClick={(e) => {
              e.preventDefault();
              void handleConfirm();
            }}
          >
            {pending ? "Working..." : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Shared delete button + confirmation used by several card states. */
function DeleteButton({
  task,
  className,
}: {
  task: Task;
  className?: string;
}) {
  return (
    <ConfirmActionButton
      label="Delete"
      variant="outline"
      className={className}
      title="Delete task?"
      description="Are you sure you want to delete this task? This cannot be undone."
      confirmLabel="Delete"
      confirmClassName="bg-destructive text-destructive-foreground hover:bg-destructive/90"
      onConfirm={() => deleteTask(task.id)}
    />
  );
}

/** Card title, truncated to a single line. */
function CardTitleRow({ children }: { children: React.ReactNode }) {
  return (
    <h3
      className="truncate text-sm font-semibold leading-snug"
      title={String(children)}
    >
      {children}
    </h3>
  );
}

/** Compact summary grid of tokens / cost / steps / duration. */
function SummaryGrid({ task }: { task: Task }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
      <div className="flex justify-between gap-2">
        <dt className="text-muted-foreground">Tokens</dt>
        <dd className="font-medium tabular-nums">
          {formatNumber(task.totalTokens)}
        </dd>
      </div>
      <div className="flex justify-between gap-2">
        <dt className="text-muted-foreground">Cost</dt>
        <dd className="font-medium tabular-nums">
          {formatCost(task.totalCost)}
        </dd>
      </div>
      <div className="flex justify-between gap-2">
        <dt className="text-muted-foreground">Steps</dt>
        <dd className="font-medium tabular-nums">{task.totalSteps}</dd>
      </div>
      <div className="flex justify-between gap-2">
        <dt className="text-muted-foreground">Duration</dt>
        <dd className="font-medium tabular-nums">
          {task.duration != null ? formatDuration(task.duration) : "—"}
        </dd>
      </div>
    </dl>
  );
}

/** Live seconds elapsed since `startedAt`, updated every second. */
function useElapsedSeconds(startedAt: string | null): number {
  const [seconds, setSeconds] = React.useState(() =>
    startedAt
      ? Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
      : 0,
  );

  React.useEffect(() => {
    if (!startedAt) {
      setSeconds(0);
      return;
    }
    const start = new Date(startedAt).getTime();
    const tick = () => setSeconds(Math.floor((Date.now() - start) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return seconds;
}

function TodoCard({ task }: { task: Task }) {
  const { pending, run } = useAsyncAction();
  const [editOpen, setEditOpen] = React.useState(false);

  return (
    <>
      <div className="space-y-3">
        <CardTitleRow>{task.title}</CardTitleRow>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">
            {formatTokensCompact(task.tokenBudget)} tokens
          </Badge>
          <span className="text-xs text-muted-foreground">
            {task.permissionMode}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="flex-1 bg-emerald-600 text-white hover:bg-emerald-500"
            disabled={pending}
            onClick={(e) => {
              stop(e);
              void run(() => startTask(task.id));
            }}
          >
            {pending ? "Starting..." : "Start"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              stop(e);
              setEditOpen(true);
            }}
          >
            Edit
          </Button>
          <DeleteButton task={task} />
        </div>
      </div>
      <CreateTaskModal open={editOpen} onOpenChange={setEditOpen} task={task} />
    </>
  );
}

function RunningCard({ task }: { task: Task }) {
  const elapsed = useElapsedSeconds(task.startedAt);
  const percent =
    task.tokenBudget > 0
      ? Math.min(100, (task.totalTokens / task.tokenBudget) * 100)
      : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <CardTitleRow>{task.title}</CardTitleRow>
        <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
          {formatElapsed(elapsed)}
        </span>
      </div>

      <div className="space-y-1">
        <Progress value={percent} />
        <p className="text-xs tabular-nums text-muted-foreground">
          {formatNumber(task.totalTokens)} / {formatNumber(task.tokenBudget)}{" "}
          tokens
        </p>
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="font-medium tabular-nums">
          {formatCost(task.totalCost)}
        </span>
        <span className="tabular-nums text-muted-foreground">
          {task.totalSteps} steps
        </span>
      </div>

      <StepFeed taskId={task.id} />
      <MessageInput taskId={task.id} />

      <ConfirmActionButton
        label="Stop"
        className="w-full"
        title="Stop task?"
        description="Are you sure you want to stop this task? It will be marked as failed."
        confirmLabel="Stop"
        confirmClassName="bg-destructive text-destructive-foreground hover:bg-destructive/90"
        onConfirm={() => stopTask(task.id)}
      />
    </div>
  );
}

function DoneCard({ task }: { task: Task }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <CardTitleRow>{task.title}</CardTitleRow>
        <Badge className="shrink-0 border-transparent bg-emerald-600/15 text-emerald-400">
          Done
        </Badge>
      </div>
      <SummaryGrid task={task} />
      <div className="flex justify-end">
        <DeleteButton task={task} />
      </div>
    </div>
  );
}

function TokenExceededCard({ task }: { task: Task }) {
  const { pending, run } = useAsyncAction();
  const [budget, setBudget] = React.useState(() =>
    String(
      roundUpToNearest10K(
        Math.max(task.totalTokens * 2, task.totalTokens + 10_000),
      ),
    ),
  );

  const parsed = Number(budget);
  const isValid =
    budget.trim() !== "" &&
    Number.isInteger(parsed) &&
    parsed > task.totalTokens;
  const showError = budget.trim() !== "" && !isValid;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <CardTitleRow>{task.title}</CardTitleRow>
        <Badge className="shrink-0 border-transparent bg-amber-500/15 text-amber-400">
          Budget Exceeded
        </Badge>
      </div>

      <SummaryGrid task={task} />

      <div className="space-y-2 rounded-md border bg-muted/30 p-2">
        <p className="text-xs text-muted-foreground">
          Used:{" "}
          <span className="font-medium tabular-nums text-foreground">
            {formatNumber(task.totalTokens)} tokens
          </span>
        </p>
        <div className="space-y-1">
          <label
            className="text-xs text-muted-foreground"
            htmlFor={`budget-${task.id}`}
          >
            New token budget
          </label>
          <Input
            id={`budget-${task.id}`}
            type="number"
            min={task.totalTokens + 1}
            step={1}
            inputMode="numeric"
            value={budget}
            onClick={stop}
            onChange={(e) => setBudget(e.target.value)}
            disabled={pending}
            className="h-8"
          />
          {showError ? (
            <p className="text-xs text-destructive">
              Must be greater than {formatNumber(task.totalTokens)}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          className="flex-1"
          disabled={!isValid || pending}
          onClick={(e) => {
            stop(e);
            void run(() => resumeTask(task.id, { tokenBudget: parsed }));
          }}
        >
          {pending ? "Resuming..." : "Resume"}
        </Button>
        <DeleteButton task={task} />
      </div>
    </div>
  );
}

function FailedCard({ task }: { task: Task }) {
  const { pending, run } = useAsyncAction();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <CardTitleRow>{task.title}</CardTitleRow>
        <Badge variant="destructive" className="shrink-0">
          Failed
        </Badge>
      </div>

      {task.errorInfo ? (
        <p className="line-clamp-3 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
          {task.errorInfo}
        </p>
      ) : null}

      <SummaryGrid task={task} />

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          disabled={pending}
          onClick={(e) => {
            stop(e);
            void run(() => retryTask(task.id));
          }}
        >
          {pending ? "Retrying..." : "Retry"}
        </Button>
        <DeleteButton task={task} />
      </div>
    </div>
  );
}

function CardBody({ task }: { task: Task }) {
  switch (task.status) {
    case "todo":
      return <TodoCard task={task} />;
    case "running":
      return <RunningCard task={task} />;
    case "done":
      return <DoneCard task={task} />;
    case "token_exceeded":
      return <TokenExceededCard task={task} />;
    case "failed":
      return <FailedCard task={task} />;
    default:
      return null;
  }
}

export function TaskCard({ task }: { task: Task }) {
  return (
    <Card
      role="button"
      tabIndex={0}
      className="cursor-pointer p-3 transition-colors hover:bg-accent/40"
      onClick={() => {
        // Detail drawer wired in Section 18.
      }}
    >
      <CardBody task={task} />
    </Card>
  );
}
