export type AgentStatus = "running" | "paused" | "waiting" | "error" | "done";

export type AgentEvent = {
  id: string;
  agentId: string;
  type: "info" | "error" | "warning" | "paused" | "resumed" | "instruction_modified";
  message: string;
  tokens: number | null;
  cost: number | null;
  timestamp: string;
};

export type Intervention = {
  id: string;
  agentId: string;
  type: "pause" | "resume" | "modify_instruction";
  payload: string | null;
  createdAt: string;
};

export type Agent = {
  id: string;
  name: string;
  status: AgentStatus;
  needsAttention: boolean;
  attentionReason: string | null;
  webhookUrl: string | null;
  currentGoal: string | null;
  currentTask: string | null;
  createdAt: string;
  endedAt: string | null;
  lastUpdateAt: string;
  events: AgentEvent[];
  interventions?: Intervention[];
};
