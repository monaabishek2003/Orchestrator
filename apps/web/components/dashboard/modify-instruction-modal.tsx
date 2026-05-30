"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { sendInstruction } from "@/lib/api";

export function ModifyInstructionModal({
  agentId,
  open,
  onClose,
}: {
  agentId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [instruction, setInstruction] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!instruction.trim()) return;
    setLoading(true);
    try {
      await sendInstruction(agentId, instruction.trim());
      setInstruction("");
      onClose();
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop
          className={cn(
            "fixed inset-0 z-50 bg-black/40 transition-opacity duration-150",
            "data-ending-style:opacity-0 data-starting-style:opacity-0"
          )}
        />
        <DialogPrimitive.Popup
          className={cn(
            "fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
            "w-full max-w-md rounded-xl border bg-background p-6 shadow-xl",
            "transition duration-150 data-ending-style:opacity-0 data-ending-style:scale-95",
            "data-starting-style:opacity-0 data-starting-style:scale-95"
          )}
        >
          <DialogPrimitive.Title className="mb-1 text-base font-semibold text-foreground">
            Modify Instruction
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mb-4 text-sm text-muted-foreground">
            The agent will receive this instruction and adapt its execution.
          </DialogPrimitive.Description>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <textarea
              className={cn(
                "min-h-[100px] w-full resize-none rounded-lg border bg-muted/30 px-3 py-2",
                "text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              )}
              placeholder="e.g. Use PostgreSQL instead of SQLite"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              disabled={loading}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <DialogPrimitive.Close render={<Button type="button" variant="ghost" />}>
                Cancel
              </DialogPrimitive.Close>
              <Button type="submit" disabled={loading || !instruction.trim()}>
                {loading ? "Sending…" : "Send Instruction"}
              </Button>
            </div>
          </form>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
