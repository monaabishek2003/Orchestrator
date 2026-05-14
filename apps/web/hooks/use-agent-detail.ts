"use client";

import { useEffect, useState } from "react";
import { fetchAgentDetail } from "@/lib/api";
import type { Agent } from "@/types";

export function useAgentDetail(agentId: string | null) {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!agentId) {
      setAgent(null);
      return;
    }
    setLoading(true);
    fetchAgentDetail(agentId)
      .then(setAgent)
      .finally(() => setLoading(false));
  }, [agentId]);

  return { agent, loading };
}
