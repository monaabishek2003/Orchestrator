"use client";

import * as React from "react";
import { formatDistanceToNow, format } from "date-fns";
import {
  Info, AlertCircle, Coins, Pause, Play, MessageSquarePlus,
  PauseCircle, PlayCircle, TriangleAlert, BookMarked,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./status-badge";
import { AgentReasoningPanel } from "./agent-reasoning-panel";
import { ModifyInstructionModal } from "./modify-instruction-modal";
import { useAgentDetail } from "@/hooks/use-agent-detail";
import { pauseAgent, resumeAgent } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { AgentEvent } from "@/types";

export function AgentDrawer({
  agentId,
  onClose,
}: {
  agentId: string | null;
  onClose: () => void;
}) {
  const { agent, loading, refetch } = useAgentDetail(agentId);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [instructionOpen, setInstructionOpen] = React.useState(false);

  async function handlePause() {
    if (!agentId) return;
    setActionLoading("pause");
    try { await pauseAgent(agentId); await refetch(); } catch { /* ignore */ }
    setActionLoading(null);
  }

  async function handleResume() {
    if (!agentId) return;
    setActionLoading("resume");
    try { await resumeAgent(agentId); await refetch(); } catch { /* ignore */ }
    setActionLoading(null);
  }

  return (
    <>
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

                {(agent.status === "running" || agent.status === "paused") && (
                  <div className="flex items-center gap-2 pt-1">
                    {agent.status === "running" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={actionLoading === "pause"}
                        onClick={handlePause}
                        className="gap-1.5"
                      >
                        <Pause className="h-3.5 w-3.5" />
                        {actionLoading === "pause" ? "Pausing…" : "Pause"}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={actionLoading === "resume"}
                        onClick={handleResume}
                        className="gap-1.5 border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400"
                      >
                        <Play className="h-3.5 w-3.5" />
                        {actionLoading === "resume" ? "Resuming…" : "Resume"}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setInstructionOpen(true)}
                      className="gap-1.5"
                    >
                      <MessageSquarePlus className="h-3.5 w-3.5" />
                      Modify Instruction
                    </Button>
                  </div>
                )}
              </>
            )}
          </SheetHeader>

          <Separator />

          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {loading || !agent ? (
              <DrawerSkeleton />
            ) : (
              <>
                <AgentReasoningPanel agent={agent} />
                {agent.events.length === 0 ? (
                  <p className="py-12 text-center text-sm text-muted-foreground">
                    No events recorded
                  </p>
                ) : (
                  <EventTimeline events={agent.events} />
                )}
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {agentId && instructionOpen && (
        <ModifyInstructionModal
          agentId={agentId}
          open={instructionOpen}
          onClose={() => {
            setInstructionOpen(false);
            void refetch();
          }}
        />
      )}
    </>
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

type EventStyle = { icon: React.ElementType; iconClass: string; textClass: string };

function getEventStyle(type: AgentEvent["type"]): EventStyle {
  switch (type) {
    case "error":
      return { icon: AlertCircle, iconClass: "bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400", textClass: "font-medium text-red-700 dark:text-red-300" };
    case "warning":
      return { icon: TriangleAlert, iconClass: "bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400", textClass: "text-amber-700 dark:text-amber-300" };
    case "paused":
      return { icon: PauseCircle, iconClass: "bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400", textClass: "text-muted-foreground italic" };
    case "resumed":
      return { icon: PlayCircle, iconClass: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400", textClass: "text-muted-foreground italic" };
    case "instruction_modified":
      return { icon: BookMarked, iconClass: "bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400", textClass: "text-blue-700 dark:text-blue-300" };
    default:
      return { icon: Info, iconClass: "bg-muted text-muted-foreground", textClass: "text-foreground" };
  }
}

function EventRow({ event }: { event: AgentEvent }) {
  const { icon: Icon, iconClass, textClass } = getEventStyle(event.type);

  return (
    <div className="relative flex gap-3 py-2 pl-0">
      <div
        className={cn(
          "relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ring-4 ring-background",
          iconClass
        )}
      >
        <Icon className="h-3 w-3" />
      </div>

      <div className="min-w-0 flex-1">
        <p className={cn("text-sm leading-relaxed", textClass)}>
          {event.message}
        </p>

        <div className="mt-1 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
          </span>

          {(event.tokens != null || event.cost != null) && (
            <>
              <span className="text-xs text-muted-foreground/50">·</span>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Coins className="h-3 w-3" />
                {event.tokens != null && <span>{event.tokens} tokens</span>}
                {event.tokens != null && event.cost != null && <span>·</span>}
                {event.cost != null && <span>${event.cost.toFixed(4)}</span>}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
