/**
 * Shared event-parsing utilities used by the card step feed and the detail drawer.
 */

import type { TaskEvent } from "./types";

export type DisplayType =
  | "assistant"
  | "tool_use"
  | "tool_result"
  | "thinking"
  | "other";

export const TYPE_STYLES: Record<DisplayType, string> = {
  assistant: "bg-blue-500/15 text-blue-400",
  tool_use: "bg-purple-500/15 text-purple-400",
  tool_result: "bg-emerald-500/15 text-emerald-400",
  thinking: "bg-muted text-muted-foreground",
  other: "bg-secondary text-secondary-foreground",
};

export const TYPE_LABELS: Record<DisplayType, string> = {
  assistant: "assistant",
  tool_use: "tool",
  tool_result: "result",
  thinking: "thinking",
  other: "event",
};

export function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/** Pull readable text out of a string or an array of `{ type: "text", text }` blocks. */
export function extractText(value: unknown): string {
  const direct = asString(value);
  if (direct !== undefined) return direct;
  const parts: string[] = [];
  for (const raw of asArray(value)) {
    const block = asRecord(raw);
    const text = block ? asString(block["text"]) : undefined;
    if (text) parts.push(text);
  }
  return parts.join(" ");
}

export interface EventDescription {
  type: DisplayType;
  preview: string;
}

/** Parse a stored event's raw JSON content into a display type + human preview. */
export function describeEvent(event: TaskEvent): EventDescription {
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(event.content);
  } catch {
    /* fall through to raw fallback */
  }

  const root = asRecord(parsed);
  const message = root ? asRecord(root["message"]) : null;
  const blocks = message ? asArray(message["content"]) : [];

  let text: string | undefined;
  for (const raw of blocks) {
    const block = asRecord(raw);
    if (!block) continue;
    const blockType = asString(block["type"]);

    if (blockType === "tool_use") {
      const name = asString(block["name"]) ?? "tool";
      return { type: "tool_use", preview: name };
    }
    if (blockType === "tool_result") {
      const content = extractText(block["content"]);
      return { type: "tool_result", preview: content || "tool result" };
    }
    if (blockType === "thinking") {
      return {
        type: "thinking",
        preview: asString(block["thinking"]) ?? "Thinking...",
      };
    }
    if (blockType === "text" && text === undefined) {
      text = asString(block["text"]);
    }
  }

  if (text !== undefined && text !== "") {
    return { type: "assistant", preview: text };
  }

  if (event.type === "system") {
    const subtype = root ? asString(root["subtype"]) : undefined;
    return {
      type: "other",
      preview: subtype ? `system: ${subtype}` : "system",
    };
  }
  if (event.type === "result") {
    const result = root ? asString(root["result"]) : undefined;
    return { type: "other", preview: result || "result" };
  }
  if (event.type === "user") {
    const content = message ? extractText(message["content"]) : "";
    if (content) return { type: "tool_result", preview: content };
  }

  return { type: "other", preview: event.type };
}

/** Truncate to a given character limit with "...". */
export function truncateText(value: string, maxLen = 100): string {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > maxLen ? `${clean.slice(0, maxLen)}...` : clean;
}
