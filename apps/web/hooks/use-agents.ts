"use client";

import { useEffect, useCallback, useState } from "react";
import { fetchAgents } from "@/lib/api";
import { useSocketEvent } from "./use-socket-event";
import type { Agent } from "@/types";

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      const data = await fetchAgents();
      setAgents(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useSocketEvent("agents:update", refetch);

  return { agents, loading, error, refetch };
}
