import { BudgetExceededBanner } from "@/components/budget-exceeded-banner";
import { KanbanBoard } from "@/components/kanban-board";
import { TopBar } from "@/components/top-bar";

export default function Home() {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex h-14 shrink-0 items-center border-b px-4">
        <TopBar />
      </header>
      <BudgetExceededBanner />
      <main className="min-h-0 flex-1">
        <KanbanBoard />
      </main>
    </div>
  );
}
