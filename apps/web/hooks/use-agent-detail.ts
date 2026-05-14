"use client";

import { useEffect, useState } from "react";
import { fetchAgentDetail } from "@/lib/api";
import type { Agent } from "@/types";

export function useAgentDetail(agentId: string | null) {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!agentId) {
      setAgent(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    fetchAgentDetail(agentId)
      .then(setAgent)
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to fetch agent")
      )
      .finally(() => setLoading(false));
  }, [agentId]);

  return { agent, loading, error };
}
