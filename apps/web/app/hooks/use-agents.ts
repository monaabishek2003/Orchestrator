"use client";

import { useEffect, useCallback, useState } from "react";
import { io } from "socket.io-client";

export type Agent = {
  id: string;
  name: string;
  status: string;
  needsAttention: boolean;
  attentionReason: string | null;
  createdAt: string;
  endedAt: string | null;
  lastUpdateAt: string;
  events: { message: string; type: string }[];
};

export type Event = {
  id: string;
  agentId: string;
  type: string;
  message: string;
  tokens: number | null;
  cost: number | null;
  timestamp: string;
};

const SERVER = "http://localhost:8000";

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const res = await fetch(`${SERVER}/agents`);
    const data = await res.json();
    setAgents(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();

    const socket = io(SERVER);
    socket.on("agents:update", refetch);

    return () => {
      socket.disconnect();
    };
  }, [refetch]);

  return { agents, loading, refetch };
}
