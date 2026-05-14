import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { AttentionRow } from "./attention-row";
import type { Agent } from "@/types";

export function AttentionPanel({
  agents,
  onResolve,
}: {
  agents: Agent[];
  onResolve: () => void;
}) {
  const flagged = useMemo(
    () => agents.filter((a) => a.needsAttention),
    [agents]
  );

  if (flagged.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-500/40 bg-background p-4">
      <div className="mb-3 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <h2 className="text-sm font-semibold text-amber-500">
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
