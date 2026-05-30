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

export async function pauseAgent(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/agent/${id}/pause`, { method: "POST" });
  if (!res.ok) throw new Error(`Failed to pause agent: ${res.status}`);
}

export async function resumeAgent(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/agent/${id}/resume`, { method: "POST" });
  if (!res.ok) throw new Error(`Failed to resume agent: ${res.status}`);
}

export async function sendInstruction(id: string, instruction: string): Promise<void> {
  const res = await fetch(`${API_URL}/agent/${id}/instruction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ instruction }),
  });
  if (!res.ok) throw new Error(`Failed to send instruction: ${res.status}`);
}

