import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const DEMO_API = 'http://localhost:3001';
const ORCH_API = 'http://localhost:8000';

export type DemoPhase = 'upload' | 'planning' | 'building' | 'needs_input' | 'complete';

export type Ticket = {
  id: string;
  title: string;
  description: string;
  status: string;
  assignedRole: string | null;
  agentRunId: string | null;
  question: string | null;
  answer: string | null;
  sortOrder: number;
};

export type AgentEvent = {
  id: string;
  agentId: string;
  type: string;
  message: string;
  tokens: number | null;
  cost: number | null;
  timestamp: string;
};

export type OrchestratorAgent = {
  id: string;
  name: string;
  status: string;
  events: AgentEvent[];
};

export function useDemo() {
  const [phase, setPhase] = useState<DemoPhase>('upload');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [agents, setAgents] = useState<OrchestratorAgent[]>([]);
  const socketRef = useRef<Socket | null>(null);

  const fetchTickets = useCallback(async () => {
    try {
      const res = await fetch(`${DEMO_API}/tickets`);
      const data: Ticket[] = await res.json();
      setTickets(data);

      if (data.length === 0) return;
      const hasNeedsInput = data.some((t) => t.status === 'needs_input');
      const allDone = data.every((t) => t.status === 'done');
      const anyInProgress = data.some((t) => t.status === 'in_progress');

      if (allDone) setPhase('complete');
      else if (hasNeedsInput) setPhase('needs_input');
      else if (anyInProgress) setPhase('building');
    } catch {
      /* ignore */
    }
  }, []);

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch(`${ORCH_API}/agents`);
      const data = await res.json();
      const detailed = await Promise.all(
        data.slice(0, 10).map(async (a: OrchestratorAgent) => {
          const detail = await fetch(`${ORCH_API}/agent/${a.id}`);
          return detail.json();
        })
      );
      setAgents(detailed);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const socket = io(ORCH_API, { reconnection: true });
    socketRef.current = socket;
    socket.on('agents:update', () => {
      fetchAgents();
      fetchTickets();
    });
    return () => {
      socket.disconnect();
    };
  }, [fetchAgents, fetchTickets]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchTickets();
      fetchAgents();
    }, 2000);
    return () => clearInterval(interval);
  }, [fetchTickets, fetchAgents]);

  const submitPrd = useCallback(
    async (prd: string) => {
      setPhase('planning');
      await fetch(`${DEMO_API}/demo/reset`, { method: 'POST' });
      await fetch(`${DEMO_API}/planner/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prd }),
      });
      await fetchTickets();
      setPhase('building');
      fetch(`${DEMO_API}/demo/start`, { method: 'POST' });
    },
    [fetchTickets]
  );

  const answerQuestion = useCallback(async (ticketId: string, answer: string) => {
    await fetch(`${DEMO_API}/demo/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticketId, answer }),
    });
    setPhase('building');
  }, []);

  return { phase, setPhase, tickets, agents, submitPrd, answerQuestion, fetchTickets };
}
