"use client";
import { useState } from "react";
import { useAgents } from "./hooks/use-agents";
import { StatCards } from "./features/stat-cards";
import { AttentionPanel } from "./features/attention-panel";
import { AgentGrid } from "./features/agent-grid";
import { AgentDrawer } from "./features/agent-drawer";

export default function Home() {
  const { agents, loading, refetch } = useAgents();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-6 p-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Orchestrator</h1>
        <p className="text-sm text-muted-foreground">Monitor your AI agents in real time</p>
      </header>

      <StatCards agents={agents} loading={loading} />
      <AttentionPanel agents={agents} onResolve={refetch} />
      <AgentGrid agents={agents} loading={loading} onSelect={setSelectedId} />
      <AgentDrawer agentId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}
