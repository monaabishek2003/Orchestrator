import { cn } from "@/lib/utils";
import type { AgentStatus } from "@/types";

const styles: Record<
  AgentStatus,
  { label: string; dot: string; bg: string; text: string; border: string }
> = {
  running: {
    label: "Running",
    dot: "bg-blue-500 animate-pulse",
    bg: "bg-blue-50 dark:bg-blue-950/20",
    text: "text-blue-700 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-800/60",
  },
  done: {
    label: "Done",
    dot: "bg-neutral-400 dark:bg-neutral-500",
    bg: "bg-neutral-50 dark:bg-neutral-800/30",
    text: "text-neutral-600 dark:text-neutral-400",
    border: "border-neutral-200 dark:border-neutral-700/60",
  },
};

export function StatusBadge({ status }: { status: AgentStatus }) {
  const s = styles[status] ?? styles.done;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
        s.bg,
        s.text,
        s.border
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}
