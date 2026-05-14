"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { API_URL } from "@/lib/constants";
import { fetchAgents } from "@/lib/api";
import type { Agent } from "@/types";

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

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

    const socket = io(API_URL, {
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    socketRef.current = socket;

    socket.on("agents:update", refetch);
    socket.on("reconnect", refetch);

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [refetch]);

  return { agents, loading, error, refetch };
}
