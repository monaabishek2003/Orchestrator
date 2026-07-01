"use client";

import { useSocket } from "@/lib/socket";

/** Initializes the singleton Socket.io connection for the app. */
export function SocketProvider({ children }: { children: React.ReactNode }) {
  useSocket();
  return <>{children}</>;
}
