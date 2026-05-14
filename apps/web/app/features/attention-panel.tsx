import { Button } from "@/components/ui/button";
import type { Agent } from "@/app/hooks/use-agents";

const SERVER = "http://localhost:8000";

export function AttentionPanel({ agents, onResolve }: { agents: Agent[]; onResolve: () => void }) {
  const flagged = agents.filter((a) => a.needsAttention);
  if (flagged.length === 0) return null;

  async function resolve(id: string) {
    await fetch(`${SERVER}/agent/${id}/resolve`, { method: "POST" });
    onResolve();
  }

  return (
    <div className="rounded-xl border border-red-300 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/30">
      <h2 className="mb-3 text-sm font-semibold text-red-700 dark:text-red-400">
        Needs Attention ({flagged.length})
      </h2>
      <div className="flex flex-col gap-2">
        {flagged.map((agent) => (
          <div
            key={agent.id}
            className="flex items-center justify-between gap-4 rounded-lg bg-white px-4 py-2 dark:bg-red-950/40"
          >
            <span className="font-medium">{agent.name}</span>
            <span className="flex-1 text-sm text-muted-foreground">{agent.attentionReason}</span>
            <Button size="sm" variant="outline" onClick={() => resolve(agent.id)}>
              Resolve
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
