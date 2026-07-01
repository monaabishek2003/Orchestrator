"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { createTask, updateTask } from "@/lib/api";
import type { PermissionMode, Task } from "@/lib/types";

interface CreateTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided, the modal is in edit mode for a `todo` task. */
  task?: Task;
}

interface FormErrors {
  title?: string;
  prompt?: string;
  tokenBudget?: string;
}

const BUDGET_PRESETS: { label: string; value: number }[] = [
  { label: "10K", value: 10_000 },
  { label: "50K", value: 50_000 },
  { label: "100K", value: 100_000 },
  { label: "200K", value: 200_000 },
];

const DEFAULT_PERMISSION: PermissionMode = "bypassPermissions";

function validate(
  title: string,
  prompt: string,
  tokenBudget: string,
): FormErrors {
  const errors: FormErrors = {};

  if (title.trim() === "") {
    errors.title = "Title is required";
  }

  if (prompt.trim() === "") {
    errors.prompt = "Prompt is required";
  }

  if (tokenBudget.trim() === "") {
    errors.tokenBudget = "Token budget is required";
  } else {
    const parsed = Number(tokenBudget);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      errors.tokenBudget = "Must be a positive number";
    }
  }

  return errors;
}

export function CreateTaskModal({
  open,
  onOpenChange,
  task,
}: CreateTaskModalProps) {
  const isEdit = task !== undefined;

  const [title, setTitle] = React.useState("");
  const [prompt, setPrompt] = React.useState("");
  const [tokenBudget, setTokenBudget] = React.useState("");
  const [permissionMode, setPermissionMode] =
    React.useState<PermissionMode>(DEFAULT_PERMISSION);

  const [errors, setErrors] = React.useState<FormErrors>({});
  const [hasValidated, setHasValidated] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [apiError, setApiError] = React.useState<string | null>(null);

  // Seed the form each time the modal opens.
  React.useEffect(() => {
    if (!open) return;
    setTitle(task?.title ?? "");
    setPrompt(task?.prompt ?? "");
    setTokenBudget(task ? String(task.tokenBudget) : "");
    setPermissionMode(
      (task?.permissionMode as PermissionMode | undefined) ??
        DEFAULT_PERMISSION,
    );
    setErrors({});
    setHasValidated(false);
    setSubmitting(false);
    setApiError(null);
  }, [open, task]);

  // Once the user has attempted a submit, re-validate as fields change.
  React.useEffect(() => {
    if (!hasValidated) return;
    setErrors(validate(title, prompt, tokenBudget));
  }, [hasValidated, title, prompt, tokenBudget]);

  const selectedPreset = BUDGET_PRESETS.find(
    (p) => String(p.value) === tokenBudget.trim(),
  )?.value;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setApiError(null);

    const nextErrors = validate(title, prompt, tokenBudget);
    setHasValidated(true);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const budget = Number(tokenBudget);
    setSubmitting(true);
    try {
      if (isEdit && task) {
        const changed: {
          title?: string;
          prompt?: string;
          tokenBudget?: number;
          permissionMode?: PermissionMode;
        } = {};
        if (title.trim() !== task.title) changed.title = title.trim();
        if (prompt !== task.prompt) changed.prompt = prompt;
        if (budget !== task.tokenBudget) changed.tokenBudget = budget;
        if (permissionMode !== task.permissionMode)
          changed.permissionMode = permissionMode;
        await updateTask(task.id, changed);
      } else {
        await createTask({
          title: title.trim(),
          prompt,
          tokenBudget: budget,
          permissionMode,
        });
      }
      onOpenChange(false);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  const isEmpty =
    title.trim() === "" ||
    prompt.trim() === "" ||
    tokenBudget.trim() === "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Task" : "Create Task"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Short name for the task"
              disabled={submitting}
            />
            {errors.title ? (
              <p className="text-xs text-destructive">{errors.title}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-prompt">Prompt</Label>
            <Textarea
              id="task-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="The instruction sent to Claude Code"
              rows={5}
              className="min-h-[120px] resize-y"
              disabled={submitting}
            />
            {errors.prompt ? (
              <p className="text-xs text-destructive">{errors.prompt}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-budget">Token Budget</Label>
            <div className="flex flex-wrap gap-2">
              {BUDGET_PRESETS.map((preset) => (
                <Button
                  key={preset.value}
                  type="button"
                  size="sm"
                  variant={
                    selectedPreset === preset.value ? "default" : "outline"
                  }
                  onClick={() => setTokenBudget(String(preset.value))}
                  disabled={submitting}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            <Input
              id="task-budget"
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={tokenBudget}
              onChange={(e) => setTokenBudget(e.target.value)}
              placeholder="Custom token budget"
              disabled={submitting}
            />
            {errors.tokenBudget ? (
              <p className="text-xs text-destructive">{errors.tokenBudget}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-permission">Permission Mode</Label>
            <Select
              value={permissionMode}
              onValueChange={(value) =>
                setPermissionMode(value as PermissionMode)
              }
              disabled={submitting}
            >
              <SelectTrigger id="task-permission">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bypassPermissions">
                  Bypass Permissions
                </SelectItem>
                <SelectItem value="acceptEdits">Accept Edits</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {apiError ? (
            <p className="text-sm text-destructive">{apiError}</p>
          ) : null}

          <DialogFooter>
            <Button
              type="submit"
              disabled={isEmpty || submitting}
              className={cn(submitting && "opacity-80")}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isEdit ? "Saving..." : "Creating..."}
                </>
              ) : isEdit ? (
                "Save Changes"
              ) : (
                "Create Task"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
