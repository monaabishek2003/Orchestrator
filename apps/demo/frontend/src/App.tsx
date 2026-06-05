import { useDemo } from './hooks/useDemo';
import { UploadScreen } from './components/UploadScreen';
import { KanbanBoard } from './components/KanbanBoard';
import { NeedsInputModal } from './components/NeedsInputModal';
import { DeployReveal } from './components/DeployReveal';

export default function App() {
  const { phase, tickets, agents, submitPrd, answerQuestion } = useDemo();

  if (phase === 'upload' || phase === 'planning') {
    return <UploadScreen onSubmit={submitPrd} />;
  }

  const needsInputTicket = tickets.find((t) => t.status === 'needs_input');

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <KanbanBoard tickets={tickets} agents={agents} />
      {phase === 'needs_input' && needsInputTicket && (
        <NeedsInputModal ticket={needsInputTicket} onAnswer={answerQuestion} />
      )}
      {phase === 'complete' && <DeployReveal />}
    </div>
  );
}
