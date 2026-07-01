import type { Metadata } from "next";

import "./globals.css";
import { SocketProvider } from "@/components/socket-provider";

export const metadata: Metadata = {
  title: "Orchestrator",
  description: "Kanban board for budget-controlled Claude Code agents",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-foreground antialiased">
        <SocketProvider>{children}</SocketProvider>
      </body>
    </html>
  );
}
