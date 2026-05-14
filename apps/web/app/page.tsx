"use client";

import { useState, useCallback } from "react";
import { useAgents } from "@/hooks/use-agents";
import { StatCards } from "@/components/dashboard/stat-cards";
import { AttentionPanel } from "@/components/dashboard/attention-panel";
import { AgentGrid } from "@/components/dashboard/agent-grid";
import { AgentDrawer } from "@/components/dashboard/agent-drawer";

export default function Home() {
  const { agents, loading, error, refetch } = useAgents();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const closeDrawer = useCallback(() => setSelectedId(null), []);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Orchestrator</h1>
          <p className="text-sm text-muted-foreground">
            Monitor your AI agents in real time
          </p>
        </div>
        {error && (
          <button
            onClick={refetch}
            className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50"
          >
            Connection error — retry
          </button>
        )}
      </header>

      <StatCards agents={agents} loading={loading} />
      <AttentionPanel agents={agents} onResolve={refetch} />
      <AgentGrid agents={agents} loading={loading} onSelect={setSelectedId} />
      <AgentDrawer agentId={selectedId} onClose={closeDrawer} />
    </div>
  );
}
