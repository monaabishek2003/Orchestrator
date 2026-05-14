"use client";

import { useEffect } from "react";
import { getSocket } from "@/lib/socket";

/**
 * Subscribes to a Socket.io event for the component's lifetime.
 * Also re-fires the handler on socket reconnect so callers can re-sync state.
 */
export function useSocketEvent(event: string, handler: () => void): void {
  useEffect(() => {
    const socket = getSocket();
    socket.on(event, handler);
    socket.on("reconnect", handler);

    return () => {
      socket.off(event, handler);
      socket.off("reconnect", handler);
    };
  }, [event, handler]);
}
