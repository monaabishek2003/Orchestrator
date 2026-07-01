"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sendMessage } from "@/lib/api";

/** Mid-task message input that pipes text to the Claude process via stdin. */
export function MessageInput({ taskId }: { taskId: string }) {
  const [value, setValue] = React.useState("");
  const [sending, setSending] = React.useState(false);

  async function submit() {
    const text = value.trim();
    if (text === "" || sending) return;
    setSending(true);
    try {
      await sendMessage(taskId, text);
      setValue("");
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  }

  return (
    <form
      onClick={(e) => e.stopPropagation()}
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="flex items-center gap-2"
    >
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Send a message to the agent..."
        disabled={sending}
        className="h-8"
      />
      <Button
        type="submit"
        size="sm"
        disabled={sending || value.trim() === ""}
      >
        Send
      </Button>
    </form>
  );
}
