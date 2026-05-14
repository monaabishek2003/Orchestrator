import { useMemo } from "react";
import { Activity, AlertTriangle, CheckCircle2, Layers } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Agent } from "@/types";

const STATS = [
  {
    label: "Total Agents",
    icon: Layers,
    color: "text-foreground",
    iconBg: "bg-muted",
  },
  {
    label: "Running",
    icon: Activity,
    color: "text-blue-600 dark:text-blue-400",
    iconBg: "bg-blue-50 dark:bg-blue-950/30",
  },
  {
    label: "Needs Attention",
    icon: AlertTriangle,
    color: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-amber-50 dark:bg-amber-950/30",
  },
  {
    label: "Completed",
    icon: CheckCircle2,
    color: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-50 dark:bg-emerald-950/30",
  },
] as const;

function computeCounts(agents: Agent[]) {
  let running = 0,
    attention = 0,
    done = 0;
  for (const a of agents) {
    if (a.status === "running") running++;
    if (a.needsAttention) attention++;
    if (a.status === "done") done++;
  }
  return [agents.length, running, attention, done];
}

export function StatCards({
  agents,
  loading,
}: {
  agents: Agent[];
  loading: boolean;
}) {
  const counts = useMemo(() => computeCounts(agents), [agents]);

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {STATS.map(({ label, icon: Icon, color, iconBg }, i) => (
        <Card key={label}>
          <CardContent className="flex items-center gap-4 p-5">
            <div className={cn("rounded-lg p-2.5", iconBg, color)}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted-foreground">
                {label}
              </p>
              {loading ? (
                <Skeleton className="mt-1 h-7 w-10" />
              ) : (
                <p className="text-2xl font-semibold tracking-tight tabular-nums">
                  {counts[i]}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
