"use client";
import { useState } from "react";
import { useAgents } from "./hooks/use-agents";
import { StatCards } from "./features/stat-cards";
import { AttentionPanel } from "./features/attention-panel";
import { AgentGrid } from "./features/agent-grid";

export default function Home() {
  const { agents, loading, refetch } = useAgents();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (loading) return <p className="p-8">loading...</p>;
  return (
    <div className="flex flex-col gap-6 p-8">
      <StatCards agents={agents} />
      <AttentionPanel agents={agents} onResolve={refetch} />
      <AgentGrid agents={agents} onSelect={setSelectedId} />
      {selectedId && <p className="text-sm text-muted-foreground">Selected: {selectedId}</p>}
    </div>
  );
}
