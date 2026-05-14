"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { Event } from "@/app/hooks/use-agents";

const SERVER = "http://localhost:8000";

type AgentDetail = {
  id: string;
  name: string;
  status: string;
  attentionReason: string | null;
  createdAt: string;
  events: Event[];
};

export function AgentDrawer({
  agentId,
  onClose,
}: {
  agentId: string | null;
  onClose: () => void;
}) {
  const [agent, setAgent] = useState<AgentDetail | null>(null);

  useEffect(() => {
    if (!agentId) { setAgent(null); return; }
    fetch(`${SERVER}/agent/${agentId}`)
      .then((r) => r.json())
      .then(setAgent);
  }, [agentId]);

  return (
    <Sheet open={!!agentId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{agent?.name ?? "Loading…"}</SheetTitle>
          <SheetDescription>
            {agent && (
              <span className="flex items-center gap-2">
                <StatusBadge status={agent.status} />
                {agent.attentionReason && (
                  <span className="text-red-600">{agent.attentionReason}</span>
                )}
              </span>
            )}
          </SheetDescription>
        </SheetHeader>

        <Separator />

        <div className="flex flex-col gap-2 p-4">
          {agent
            ? [...agent.events].reverse().map((event) => (
                <EventRow key={event.id} event={event} />
              ))
            : Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 rounded-md bg-muted animate-pulse" />
              ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function EventRow({ event }: { event: Event }) {
  const isError = event.type === "error";
  return (
    <div
      className={`rounded-lg px-3 py-2 text-sm ${
        isError
          ? "bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-300"
          : "bg-muted/50 text-foreground"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="flex-1">{event.message}</p>
        <span className="shrink-0 text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
        </span>
      </div>
      {(event.tokens != null || event.cost != null) && (
        <p className="mt-1 text-xs text-muted-foreground">
          {event.tokens != null && <span>{event.tokens} tokens</span>}
          {event.tokens != null && event.cost != null && <span> · </span>}
          {event.cost != null && <span>${event.cost.toFixed(4)}</span>}
        </p>
      )}
    </div>
  );
}

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
