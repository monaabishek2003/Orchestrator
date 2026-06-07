import type { Ticket, OrchestratorAgent } from '../hooks/useDemo';
import { TicketCard } from './TicketCard';
import { ReasoningStream } from './ReasoningStream';

const COLUMNS: { key: string; label: string; color: string }[] = [
  { key: 'backlog', label: 'Backlog', color: 'text-neutral-400' },
  { key: 'in_progress', label: 'In Progress', color: 'text-blue-400' },
  { key: 'needs_input', label: 'Needs Input', color: 'text-red-400' },
  { key: 'done', label: 'Done', color: 'text-green-400' },
];

function getLatestMessage(ticket: Ticket, agents: OrchestratorAgent[]): string | undefined {
  const agentName = ticket.assignedRole === 'frontend' ? 'Frontend Agent' : 'Backend Agent';
  const matchingAgents = agents.filter((a) => a.name === agentName && a.events?.length > 0);
  if (matchingAgents.length === 0) return undefined;

  // Get the most recently active matching agent
  const sorted = matchingAgents.sort((a, b) => {
    const aLast = a.events[a.events.length - 1]?.timestamp ?? '';
    const bLast = b.events[b.events.length - 1]?.timestamp ?? '';
    return bLast.localeCompare(aLast);
  });

  const latest = sorted[0];
  const lastEvent = latest.events[latest.events.length - 1];
  return lastEvent?.message;
}

export function KanbanBoard({
  tickets,
  agents,
}: {
  tickets: Ticket[];
  agents: OrchestratorAgent[];
}) {
  const doneCount = tickets.filter((t) => t.status === 'done').length;

  return (
    <div className="p-6">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <h1
          className="text-2xl font-bold text-white tracking-tight"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Orchestrator
        </h1>
        <span className="text-sm text-neutral-400">
          {doneCount} of {tickets.length} complete
        </span>
      </div>

      {/* Kanban columns */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {COLUMNS.map((col) => {
          const colTickets = tickets.filter((t) => t.status === col.key);
          return (
            <div
              key={col.key}
              className="bg-neutral-900 rounded-xl border border-neutral-800 p-3 min-h-[300px]"
            >
              <div className="flex items-center justify-between mb-3 px-1">
                <span className={`text-xs font-semibold uppercase tracking-wider ${col.color}`}>
                  {col.label}
                </span>
                <span className="text-[10px] bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded-full">
                  {colTickets.length}
                </span>
              </div>
              <div className="space-y-2">
                {colTickets.map((ticket) => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    latestMessage={getLatestMessage(ticket, agents)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Reasoning stream */}
      <ReasoningStream agents={agents} />
    </div>
  );
}
