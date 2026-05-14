export type AgentStatus = "running" | "done";

export type AgentEvent = {
  id: string;
  agentId: string;
  type: "info" | "error";
  message: string;
  tokens: number | null;
  cost: number | null;
  timestamp: string;
};

export type Agent = {
  id: string;
  name: string;
  status: AgentStatus;
  needsAttention: boolean;
  attentionReason: string | null;
  createdAt: string;
  endedAt: string | null;
  lastUpdateAt: string;
  events: AgentEvent[];
};
