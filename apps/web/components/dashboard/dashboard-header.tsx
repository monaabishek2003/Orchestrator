export function DashboardHeader({
  error,
  onRetry,
}: {
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <header className="flex items-center justify-between">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Orchestrator</h1>
        <p className="text-sm text-muted-foreground">
          Monitor your AI agents in real time
        </p>
      </div>
      {error && (
        <button
          onClick={onRetry}
          className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50"
        >
          Connection error — retry
        </button>
      )}
    </header>
  );
}
