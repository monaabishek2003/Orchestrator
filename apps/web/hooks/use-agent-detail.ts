"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchAgentDetail } from "@/lib/api";
import { useSocketEvent } from "./use-socket-event";
import type { Agent } from "@/types";

export function useAgentDetail(agentId: string | null) {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    (id: string) => {
      setLoading(true);
      setError(null);
      fetchAgentDetail(id)
        .then(setAgent)
        .catch((e) =>
          setError(e instanceof Error ? e.message : "Failed to fetch agent")
        )
        .finally(() => setLoading(false));
    },
    []
  );

  useEffect(() => {
    if (!agentId) {
      setAgent(null);
      setError(null);
      return;
    }
    load(agentId);
  }, [agentId, load]);

  const refetch = useCallback(() => {
    if (agentId) load(agentId);
  }, [agentId, load]);

  useSocketEvent("agents:update", refetch);

  return { agent, loading, error, refetch };
}
