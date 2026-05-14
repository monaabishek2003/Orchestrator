"use client";
import { useAgents } from "./hooks/use-agents";
import { StatCards } from "./components/stat-cards";
import { AttentionPanel } from "./components/attention-panel";

export default function Home() {
  const { agents, loading, refetch } = useAgents();
  if (loading) return <p className="p-8">loading...</p>;
  return (
    <div className="flex flex-col gap-6 p-8">
      <StatCards agents={agents} />
      <AttentionPanel agents={agents} onResolve={refetch} />
    </div>
  );
}
