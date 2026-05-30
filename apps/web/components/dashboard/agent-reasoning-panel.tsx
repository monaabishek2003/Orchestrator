import { Target, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { Agent } from "@/types";

export function AgentReasoningPanel({ agent }: { agent: Agent }) {
  if (!agent.currentGoal && !agent.currentTask) return null;

  return (
    <Card className="mb-3 border-dashed">
      <CardContent className="grid gap-3 p-4">
        {agent.currentGoal && (
          <div className="flex gap-3">
            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400">
              <Target className="h-3 w-3" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Current Goal</p>
              <p className="text-sm text-foreground">{agent.currentGoal}</p>
            </div>
          </div>
        )}
        {agent.currentTask && (
          <div className="flex gap-3">
            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <Zap className="h-3 w-3" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Current Task</p>
              <p className="text-sm text-foreground">{agent.currentTask}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
