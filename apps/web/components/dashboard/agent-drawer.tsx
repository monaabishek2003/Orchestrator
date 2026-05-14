"use client";

import { formatDistanceToNow, format } from "date-fns";
import { Info, AlertCircle, Coins } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "./status-badge";
import { useAgentDetail } from "@/hooks/use-agent-detail";
import { cn } from "@/lib/utils";
import type { AgentEvent } from "@/types";

export function AgentDrawer({
  agentId,
  onClose,
}: {
  agentId: string | null;
  onClose: () => void;
}) {
  const { agent, loading } = useAgentDetail(agentId);

  return (
    <Sheet open={!!agentId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex w-full flex-col sm:max-w-lg">
        <SheetHeader>
          {loading || !agent ? (
            <>
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-24" />
            </>
          ) : (
            <>
              <SheetTitle className="flex items-center gap-3">
                {agent.name}
                <StatusBadge status={agent.status} />
              </SheetTitle>
              <SheetDescription>
                <span className="flex items-center gap-2">
                  Started {format(new Date(agent.createdAt), "MMM d, h:mm a")}
                  {agent.attentionReason && (
                    <>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-amber-600 dark:text-amber-400">
                        {agent.attentionReason}
                      </span>
                    </>
                  )}
                </span>
              </SheetDescription>
            </>
          )}
        </SheetHeader>

        <Separator />

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {loading || !agent ? (
            <DrawerSkeleton />
          ) : agent.events.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No events recorded
            </p>
          ) : (
            <EventTimeline events={agent.events} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DrawerSkeleton() {
  return (
    <div className="flex flex-col gap-3 pt-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-lg" />
      ))}
    </div>
  );
}

function EventTimeline({ events }: { events: AgentEvent[] }) {
  const reversed = [...events].reverse();

  return (
    <div className="relative flex flex-col gap-0 pt-2">
      <div className="absolute left-[11px] top-6 bottom-2 w-px bg-border" />

      {reversed.map((event) => (
        <EventRow key={event.id} event={event} />
      ))}
    </div>
  );
}

function EventRow({ event }: { event: AgentEvent }) {
  const isError = event.type === "error";

  return (
    <div className="relative flex gap-3 py-2 pl-0">
      <div
        className={cn(
          "relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ring-4 ring-background",
          isError
            ? "bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400"
            : "bg-muted text-muted-foreground"
        )}
      >
        {isError ? (
          <AlertCircle className="h-3 w-3" />
        ) : (
          <Info className="h-3 w-3" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm leading-relaxed",
            isError
              ? "font-medium text-red-700 dark:text-red-300"
              : "text-foreground"
          )}
        >
          {event.message}
        </p>

        <div className="mt-1 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(event.timestamp), {
              addSuffix: true,
            })}
          </span>

          {(event.tokens != null || event.cost != null) && (
            <>
              <span className="text-xs text-muted-foreground/50">·</span>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Coins className="h-3 w-3" />
                {event.tokens != null && <span>{event.tokens} tokens</span>}
                {event.tokens != null && event.cost != null && (
                  <span>·</span>
                )}
                {event.cost != null && <span>${event.cost.toFixed(4)}</span>}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
