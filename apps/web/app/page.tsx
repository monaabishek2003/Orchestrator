"use client";
import { useAgents } from "./hooks/use-agents";
import { StatCards } from "./components/stat-cards";

export default function Home() {
  const { agents, loading } = useAgents();
  if (loading) return <p className="p-8">loading...</p>;
  return (
    <div className="p-8">
      <StatCards agents={agents} />
    </div>
  );
}
