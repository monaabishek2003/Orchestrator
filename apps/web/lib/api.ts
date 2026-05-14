import { API_URL } from "./constants";
import type { Agent } from "@/types";

export async function fetchAgents(): Promise<Agent[]> {
  const res = await fetch(`${API_URL}/agents`);
  if (!res.ok) throw new Error(`Failed to fetch agents: ${res.status}`);
  return res.json();
}

export async function fetchAgentDetail(id: string): Promise<Agent> {
  const res = await fetch(`${API_URL}/agent/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch agent: ${res.status}`);
  return res.json();
}

export async function resolveAgent(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/agent/${id}/resolve`, { method: "POST" });
  if (!res.ok) throw new Error(`Failed to resolve agent: ${res.status}`);
}
