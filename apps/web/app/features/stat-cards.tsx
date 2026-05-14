import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Agent } from "@/app/hooks/use-agents";

const CARDS = [
  { label: "Total", filter: (_: Agent) => true },
  { label: "Running", filter: (a: Agent) => a.status === "running" },
  { label: "Needs Attention", filter: (a: Agent) => a.needsAttention },
  { label: "Done", filter: (a: Agent) => a.status === "done" },
];

export function StatCards({ agents }: { agents: Agent[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {CARDS.map(({ label, filter }) => (
        <Card key={label}>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold tracking-tight">
              {agents.filter(filter).length}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
