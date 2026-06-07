import { useState } from 'react';
import type { Ticket } from '../hooks/useDemo';

export function NeedsInputModal({
  ticket,
  onAnswer,
}: {
  ticket: Ticket;
  onAnswer: (ticketId: string, answer: string) => void;
}) {
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = () => {
    if (!answer.trim() || submitting) return;
    setSubmitting(true);
    onAnswer(ticket.id, answer);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-neutral-900 rounded-2xl border border-neutral-700 max-w-lg w-full mx-4 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-blue-500/15 flex items-center justify-center">
            <span className="text-blue-400 text-sm">🤖</span>
          </div>
          <h2 className="text-white font-semibold">Frontend Agent needs your input</h2>
        </div>

        <p className="text-neutral-400 text-sm mb-4">{ticket.title}</p>

        <div className="border-l-4 border-blue-500 pl-4 mb-5">
          <p className="text-white text-lg leading-relaxed">{ticket.question}</p>
        </div>

        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          rows={4}
          placeholder="Type your answer..."
          className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-white text-sm resize-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors placeholder:text-neutral-500 mb-4"
        />

        <button
          onClick={handleSubmit}
          disabled={!answer.trim() || submitting}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-neutral-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg py-2.5 transition-colors cursor-pointer"
        >
          {submitting ? 'Submitting...' : 'Submit Answer'}
        </button>
      </div>
    </div>
  );
}
