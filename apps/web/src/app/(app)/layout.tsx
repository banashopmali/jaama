"use client";

import React from "react";
import { AppShell } from "@/components/app-shell";
import { WorkspaceProvider } from "@/context/WorkspaceContext";

export default function AuthenticatedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WorkspaceProvider>
      <AppShell>{children}</AppShell>
    </WorkspaceProvider>
  );
}
