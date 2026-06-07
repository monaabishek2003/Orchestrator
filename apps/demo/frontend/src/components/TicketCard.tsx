import type { Ticket } from '../hooks/useDemo';

const borderColors: Record<string, string> = {
  backlog: 'border-l-neutral-600',
  in_progress: 'border-l-blue-500',
  needs_input: 'border-l-red-500',
  done: 'border-l-green-500',
};

export function TicketCard({
  ticket,
  latestMessage,
}: {
  ticket: Ticket;
  latestMessage?: string;
}) {
  const isNeedsInput = ticket.status === 'needs_input';
  const isDone = ticket.status === 'done';

  return (
    <div
      className={`
        bg-neutral-800 rounded-lg p-4 border-l-4 transition-all duration-300
        ${borderColors[ticket.status] ?? 'border-l-neutral-600'}
        ${isNeedsInput ? 'shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-pulse' : ''}
        ${isDone ? 'opacity-70' : ''}
      `}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-white font-medium text-sm leading-tight">{ticket.title}</h3>
        <span
          className={`
            text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0
            ${ticket.assignedRole === 'frontend' ? 'bg-blue-500/15 text-blue-400' : 'bg-emerald-500/15 text-emerald-400'}
          `}
        >
          {ticket.assignedRole === 'frontend' ? 'Frontend' : 'Backend'}
        </span>
      </div>

      {ticket.status === 'in_progress' && latestMessage && (
        <p className="text-xs text-neutral-400 italic mt-2 leading-relaxed">{latestMessage}</p>
      )}

      {isNeedsInput && ticket.question && (
        <p className="text-xs text-red-400 mt-2 leading-relaxed">⚠ Needs input</p>
      )}
    </div>
  );
}
