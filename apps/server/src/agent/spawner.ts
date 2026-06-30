import { spawn, type ChildProcess } from "node:child_process";
import { createInterface } from "node:readline";
import type { Writable } from "node:stream";

/** Permission mode for a Claude task. */
export type PermissionMode = "bypassPermissions" | "acceptEdits";

/** A single parsed NDJSON event from Claude's stream-json output. */
export interface ParsedEvent {
  /** Event type string, passed through verbatim (e.g. "assistant", "system"). */
  type: string;
  /** Full raw JSON string of the event, for later persistence/detail view. */
  content: string;
  /** Input tokens reported by this event, or 0 if none present. */
  inputTokens: number;
  /** Output tokens reported by this event, or 0 if none present. */
  outputTokens: number;
  /** The parsed JSON object, for consumers that want structured access. */
  raw: unknown;
}

/** Lifecycle callbacks fired by a spawned Claude process. */
export interface SpawnCallbacks {
  /** Fired for every successfully parsed NDJSON line. */
  onEvent?: (event: ParsedEvent) => void;
  /** Fired once, when the session ID is first captured from the stream. */
  onSessionId?: (sessionId: string) => void;
  /** Fired when the process exits. */
  onExit?: (code: number | null, signal: NodeJS.Signals | null) => void;
  /** Fired on spawn failure or when stderr produces output. */
  onError?: (error: Error) => void;
}

/** Options for spawning a brand-new task. */
export interface SpawnNewOptions {
  prompt: string;
  worktreePath: string;
  permissionMode: PermissionMode;
}

/** Options for resuming a prior task by session ID. */
export interface SpawnResumeOptions {
  sessionId: string;
  worktreePath: string;
  permissionMode: PermissionMode;
}

/** Handle to a running Claude process. */
export interface ProcessHandle {
  /** The underlying child process. */
  child: ChildProcess;
  /** The process's stdin stream. */
  stdin: Writable;
  /** Write a user message to the process via stream-json stdin. */
  sendMessage: (text: string) => void;
  /** Terminate the process (SIGTERM, then SIGKILL after 5s). Idempotent. */
  kill: () => void;
}

const CLAUDE_BIN = "claude";
const STREAM_FLAGS = [
  "--output-format",
  "stream-json",
  "--input-format",
  "stream-json",
  "--verbose",
];
const KILL_GRACE_MS = 5000;

/** Append the permission flag for the given mode (none for acceptEdits). */
function permissionArgs(mode: PermissionMode): string[] {
  return mode === "bypassPermissions"
    ? ["--dangerously-skip-permissions"]
    : [];
}

/** Build CLI args for a brand-new task. */
function buildNewArgs(options: SpawnNewOptions): string[] {
  return [
    "-p",
    options.prompt,
    ...STREAM_FLAGS,
    ...permissionArgs(options.permissionMode),
  ];
}

/** Build CLI args for a resumed task. */
function buildResumeArgs(options: SpawnResumeOptions): string[] {
  return [
    "--resume",
    options.sessionId,
    ...STREAM_FLAGS,
    ...permissionArgs(options.permissionMode),
  ];
}

/** Safely read a string field from an unknown object. */
function readString(obj: unknown, key: string): string | undefined {
  if (obj !== null && typeof obj === "object" && key in obj) {
    const value = (obj as Record<string, unknown>)[key];
    if (typeof value === "string") return value;
  }
  return undefined;
}

/** Safely read a nested object field. */
function readObject(obj: unknown, key: string): unknown {
  if (obj !== null && typeof obj === "object" && key in obj) {
    return (obj as Record<string, unknown>)[key];
  }
  return undefined;
}

/** Safely read a non-negative integer field, defaulting to 0. */
function readInt(obj: unknown, key: string): number {
  if (obj !== null && typeof obj === "object" && key in obj) {
    const value = (obj as Record<string, unknown>)[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return 0;
}

/**
 * Extract a session ID from a parsed event. Looks at top-level `session_id`
 * and nested `session.id` / `session.session_id`.
 */
function extractSessionId(parsed: unknown): string | undefined {
  const top = readString(parsed, "session_id");
  if (top) return top;

  const session = readObject(parsed, "session");
  if (session) {
    return readString(session, "id") ?? readString(session, "session_id");
  }
  return undefined;
}

/**
 * Extract input/output token counts from a parsed event. Usage data may live
 * at the top level or nested under `message.usage` / `usage`.
 */
function extractUsage(parsed: unknown): {
  inputTokens: number;
  outputTokens: number;
} {
  const candidates: unknown[] = [
    readObject(parsed, "usage"),
    readObject(readObject(parsed, "message"), "usage"),
    parsed,
  ];

  for (const candidate of candidates) {
    const inputTokens = readInt(candidate, "input_tokens");
    const outputTokens = readInt(candidate, "output_tokens");
    if (inputTokens > 0 || outputTokens > 0) {
      return { inputTokens, outputTokens };
    }
  }
  return { inputTokens: 0, outputTokens: 0 };
}

/** Turn a raw NDJSON line into a {@link ParsedEvent}, or undefined if invalid. */
function parseLine(line: string): ParsedEvent | undefined {
  const trimmed = line.trim();
  if (trimmed === "") return undefined;

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    console.warn(`Skipping malformed stream-json line: ${trimmed.slice(0, 200)}`);
    return undefined;
  }

  const type = readString(parsed, "type") ?? "unknown";
  const { inputTokens, outputTokens } = extractUsage(parsed);

  return { type, content: trimmed, inputTokens, outputTokens, raw: parsed };
}

/**
 * Spawn a Claude process with the given args and wire up streaming callbacks.
 * In stream-json input mode Claude reads the conversation from stdin, so an
 * `initialPrompt` (for new tasks) is written as the first user message.
 */
function spawnProcess(
  args: string[],
  worktreePath: string,
  callbacks: SpawnCallbacks,
  initialPrompt?: string,
): ProcessHandle {
  const child = spawn(CLAUDE_BIN, args, {
    cwd: worktreePath,
    stdio: ["pipe", "pipe", "pipe"],
  });

  let sessionCaptured = false;
  let killTimer: NodeJS.Timeout | undefined;
  let exited = false;

  if (child.stdout) {
    const rl = createInterface({ input: child.stdout });
    rl.on("line", (line) => {
      const event = parseLine(line);
      if (!event) return;

      if (!sessionCaptured) {
        const sessionId = extractSessionId(event.raw);
        if (sessionId) {
          sessionCaptured = true;
          callbacks.onSessionId?.(sessionId);
        }
      }

      callbacks.onEvent?.(event);
    });
  }

  if (child.stderr) {
    child.stderr.on("data", (chunk: Buffer) => {
      const text = chunk.toString().trim();
      if (text !== "") {
        callbacks.onError?.(new Error(text));
      }
    });
  }

  child.on("error", (error) => {
    callbacks.onError?.(error);
  });

  child.on("exit", (code, signal) => {
    exited = true;
    if (killTimer) {
      clearTimeout(killTimer);
      killTimer = undefined;
    }
    callbacks.onExit?.(code, signal);
  });

  const stdin = child.stdin;
  if (!stdin) {
    throw new Error("Spawned Claude process has no stdin stream.");
  }

  const sendMessage = (text: string): void => {
    const message = {
      type: "user",
      message: {
        role: "user",
        content: [{ type: "text", text }],
      },
    };
    stdin.write(`${JSON.stringify(message)}\n`);
  };

  const kill = (): void => {
    if (exited || child.killed) return;
    child.kill("SIGTERM");
    killTimer = setTimeout(() => {
      if (!exited) child.kill("SIGKILL");
    }, KILL_GRACE_MS);
  };

  // Deliver the initial prompt over stdin (the positional `-p` prompt is not
  // consumed in stream-json input mode). stdin stays open for mid-task messages.
  if (initialPrompt !== undefined) {
    sendMessage(initialPrompt);
  }

  return { child, stdin, sendMessage, kill };
}

/** Spawn a brand-new Claude task. */
export function spawnNewTask(
  options: SpawnNewOptions,
  callbacks: SpawnCallbacks,
): ProcessHandle {
  return spawnProcess(
    buildNewArgs(options),
    options.worktreePath,
    callbacks,
    options.prompt,
  );
}

/** Resume a prior Claude task by session ID. */
export function spawnResumeTask(
  options: SpawnResumeOptions,
  callbacks: SpawnCallbacks,
): ProcessHandle {
  return spawnProcess(
    buildResumeArgs(options),
    options.worktreePath,
    callbacks,
  );
}
