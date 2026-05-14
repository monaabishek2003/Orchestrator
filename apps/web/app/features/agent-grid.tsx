import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Agent } from "@/app/hooks/use-agents";

function StatusBadge({ status }: { status: string }) {
  if (status === "running")
    return (
      <Badge className="border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-400">
        running
      </Badge>
    );
  if (status === "error") return <Badge variant="destructive">error</Badge>;
  return <Badge variant="secondary">done</Badge>;
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed py-16 text-center">
      <p className="text-lg font-medium">No agents yet</p>
      <p className="text-sm text-muted-foreground">
        Install the SDK and start your first agent to see it here.
      </p>
      <code className="rounded-lg bg-muted px-4 py-2 text-sm">
        npm install orchestrator-sdk
      </code>
      <pre className="rounded-lg bg-muted px-6 py-4 text-left text-xs leading-relaxed">{`import { Agent } from "orchestrator-sdk";

const agent = new Agent("my-agent");
await agent.start();
await agent.step("doing something...");
await agent.end();`}</pre>
    </div>
  );
}

export function AgentGrid({
  agents,
  loading,
  onSelect,
}: {
  agents: Agent[];
  loading: boolean;
  onSelect: (id: string) => void;
}) {
  if (loading) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last message</TableHead>
            <TableHead>Last update</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 3 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-4 w-28" /></TableCell>
              <TableCell><Skeleton className="h-5 w-16" /></TableCell>
              <TableCell><Skeleton className="h-4 w-48" /></TableCell>
              <TableCell><Skeleton className="h-4 w-24" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  if (agents.length === 0) return <EmptyState />;

  const sorted = [...agents].sort(
    (a, b) => new Date(b.lastUpdateAt).getTime() - new Date(a.lastUpdateAt).getTime()
  );

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Last message</TableHead>
          <TableHead>Last update</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((agent) => (
          <TableRow
            key={agent.id}
            className="cursor-pointer"
            onClick={() => onSelect(agent.id)}
          >
            <TableCell className="font-medium">{agent.name}</TableCell>
            <TableCell>
              <StatusBadge status={agent.status} />
            </TableCell>
            <TableCell className="max-w-xs truncate text-muted-foreground">
              {agent.events[0]?.message ?? "—"}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {formatDistanceToNow(new Date(agent.lastUpdateAt), { addSuffix: true })}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
