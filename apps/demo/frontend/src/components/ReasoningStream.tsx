import { useEffect, useRef } from 'react';
import type { OrchestratorAgent, AgentEvent } from '../hooks/useDemo';

type EventWithAgent = AgentEvent & { agentName: string };

export function ReasoningStream({ agents }: { agents: OrchestratorAgent[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const allEvents: EventWithAgent[] = agents
    .flatMap((a) =>
      (a.events ?? []).map((e) => ({ ...e, agentName: a.name }))
    )
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    .slice(-30);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [allEvents.length]);

  return (
    <div className="bg-neutral-950 rounded-lg border border-neutral-800">
      <div className="px-3 py-2 border-b border-neutral-800">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
          Agent Activity
        </span>
      </div>
      <div
        ref={scrollRef}
        className="max-h-48 overflow-y-auto p-3 space-y-1"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {allEvents.length === 0 ? (
          <p className="text-neutral-600 text-xs">Waiting for agent activity...</p>
        ) : (
          allEvents.map((event) => {
            const time = new Date(event.timestamp).toLocaleTimeString('en-US', {
              hour12: false,
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });
            const nameColor =
              event.agentName === 'Backend Agent' ? 'text-emerald-400' : 'text-blue-400';

            return (
              <div key={event.id} className="text-xs leading-relaxed">
                <span className="text-neutral-600">[{time}]</span>{' '}
                <span className={nameColor}>{event.agentName}:</span>{' '}
                <span className="text-neutral-300">{event.message}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
