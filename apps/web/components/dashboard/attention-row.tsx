"use client";

import { useCallback, useState } from "react";
import { resolveAgent } from "@/lib/api";
import type { Agent } from "@/types";

export function AttentionRow({
  agent,
  onResolve,
}: {
  agent: Agent;
  onResolve: () => void;
}) {
  const [resolving, setResolving] = useState(false);

  const handleResolve = useCallback(async () => {
    setResolving(true);
    try {
      await resolveAgent(agent.id);
      onResolve();
    } finally {
      setResolving(false);
    }
  }, [agent.id, onResolve]);

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-4 py-2.5">
      <span className="text-sm font-medium text-foreground">{agent.name}</span>
      <span className="flex-1 truncate text-sm text-muted-foreground">
        {agent.attentionReason}
      </span>
      <button
        type="button"
        disabled={resolving}
        onClick={handleResolve}
        className="shrink-0 rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary/80 disabled:opacity-50"
      >
        {resolving ? "Resolving..." : "Resolve"}
      </button>
    </div>
  );
}
