import { Terminal } from "lucide-react";

const SNIPPET = `import { Agent } from "orchestrator-sdk";

const agent = new Agent("my-agent");
await agent.start();
await agent.step("doing something...");
await agent.end();`;

export function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-5 rounded-xl border border-dashed py-16 text-center">
      <div className="rounded-full bg-muted p-3">
        <Terminal className="h-6 w-6 text-muted-foreground" />
      </div>
      <div>
        <p className="text-base font-medium">No agents yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Install the SDK and start your first agent to see it here.
        </p>
      </div>
      <code className="rounded-lg bg-muted px-4 py-2 text-sm font-mono">
        npm install orchestrator-sdk
      </code>
      <pre className="max-w-sm rounded-lg bg-muted px-6 py-4 text-left text-xs leading-relaxed font-mono">
        {SNIPPET}
      </pre>
    </div>
  );
}
