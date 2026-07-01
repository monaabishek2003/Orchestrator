import { KanbanBoard } from "@/components/kanban-board";

export default function Home() {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Top bar — content added in a later section. */}
      <header className="flex h-14 shrink-0 items-center border-b px-4">
        <span className="text-sm font-semibold tracking-tight">
          Orchestrator
        </span>
      </header>
      <main className="min-h-0 flex-1">
        <KanbanBoard />
      </main>
    </div>
  );
}
