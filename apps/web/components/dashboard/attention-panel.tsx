"use client";

import { useCallback, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resolveAgent } from "@/lib/api";
import type { Agent } from "@/types";

export function AttentionPanel({
  agents,
  onResolve,
}: {
  agents: Agent[];
  onResolve: () => void;
}) {
  const flagged = agents.filter((a) => a.needsAttention);
  if (flagged.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/40 dark:bg-amber-950/10">
      <div className="mb-3 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <h2 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
          Needs Attention ({flagged.length})
        </h2>
      </div>
      <div className="flex flex-col gap-2">
        {flagged.map((agent) => (
          <AttentionRow key={agent.id} agent={agent} onResolve={onResolve} />
        ))}
      </div>
    </div>
  );
}

function AttentionRow({
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
    <div className="flex items-center justify-between gap-4 rounded-lg bg-white px-4 py-2.5 ring-1 ring-amber-200/60 dark:bg-amber-950/20 dark:ring-amber-800/30">
      <span className="font-medium text-sm">{agent.name}</span>
      <span className="flex-1 truncate text-sm text-muted-foreground">
        {agent.attentionReason}
      </span>
      <Button
        size="sm"
        variant="outline"
        disabled={resolving}
        onClick={handleResolve}
        className="shrink-0"
      >
        {resolving ? "Resolving..." : "Resolve"}
      </Button>
    </div>
  );
}
