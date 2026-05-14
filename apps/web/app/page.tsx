"use client";

import { useState, useCallback } from "react";
import { useAgents } from "@/hooks/use-agents";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
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
      <DashboardHeader error={error} onRetry={refetch} />

      <StatCards agents={agents} loading={loading} />
      <AttentionPanel agents={agents} onResolve={refetch} />
      <AgentGrid agents={agents} loading={loading} onSelect={setSelectedId} />
      <AgentDrawer agentId={selectedId} onClose={closeDrawer} />
    </div>
  );
}
