import { useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "./status-badge";
import { EmptyState } from "./empty-state";
import type { Agent } from "@/types";

function AgentGridSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Last message</TableHead>
          <TableHead className="text-right">Last update</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 4 }).map((_, i) => (
          <TableRow key={i}>
            <TableCell>
              <Skeleton className="h-4 w-28" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-5 w-16 rounded-full" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-48" />
            </TableCell>
            <TableCell className="text-right">
              <Skeleton className="ml-auto h-4 w-24" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
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
  const sorted = useMemo(
    () =>
      [...agents].sort(
        (a, b) =>
          new Date(b.lastUpdateAt).getTime() -
          new Date(a.lastUpdateAt).getTime()
      ),
    [agents]
  );

  if (loading) return <AgentGridSkeleton />;
  if (agents.length === 0) return <EmptyState />;

  return (
    <div className="rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last message</TableHead>
            <TableHead className="text-right">Last update</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((agent) => (
            <TableRow
              key={agent.id}
              className="cursor-pointer transition-colors"
              onClick={() => onSelect(agent.id)}
              tabIndex={0}
              role="button"
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(agent.id);
                }
              }}
            >
              <TableCell className="font-medium">{agent.name}</TableCell>
              <TableCell>
                <StatusBadge status={agent.status} />
              </TableCell>
              <TableCell className="max-w-xs truncate text-muted-foreground">
                {agent.events[0]?.message ?? "—"}
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                {formatDistanceToNow(new Date(agent.lastUpdateAt), {
                  addSuffix: true,
                })}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
