import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
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
  if (status === "error")
    return <Badge variant="destructive">error</Badge>;
  return <Badge variant="secondary">done</Badge>;
}

export function AgentGrid({
  agents,
  onSelect,
}: {
  agents: Agent[];
  onSelect: (id: string) => void;
}) {
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
