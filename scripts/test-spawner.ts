import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { spawnNewTask } from "../apps/server/src/agent/spawner.js";

const workdir = mkdtempSync(join(tmpdir(), "orch-spawn-"));
console.log("workdir:", workdir);

let eventCount = 0;
let capturedSessionId: string | undefined;

const handle = spawnNewTask(
  {
    prompt: "Say hello in exactly one short sentence. Do not use any tools.",
    worktreePath: workdir,
    permissionMode: "bypassPermissions",
  },
  {
    onSessionId: (sessionId) => {
      capturedSessionId = sessionId;
      console.log(">>> session id captured:", sessionId);
    },
    onEvent: (event) => {
      eventCount += 1;
      console.log(
        `[event ${eventCount}] type=${event.type} in=${event.inputTokens} out=${event.outputTokens}`,
      );
      // The task's turn is complete on the `result` event. Closing stdin lets
      // the bidirectional process exit naturally.
      if (event.type === "result") {
        handle.stdin.end();
      }
    },
    onError: (error) => {
      console.error("[stderr/error]", error.message);
    },
    onExit: (code, signal) => {
      console.log(`>>> process exited code=${code} signal=${signal}`);
      console.log(`>>> total events parsed: ${eventCount}`);
      console.log(`>>> session id captured: ${capturedSessionId ?? "NONE"}`);
      process.exit(0);
    },
  },
);

// Safety net: kill if it runs too long.
setTimeout(() => {
  console.log(">>> timeout reached, killing process");
  handle.kill();
}, 60000);
