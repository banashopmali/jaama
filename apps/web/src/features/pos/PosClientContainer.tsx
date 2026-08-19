"use client";

import React from "react";
import { PosView } from "./components/PosView";
import { PosStateMode } from "./pos.types";
import { useWorkspace } from "@/context/WorkspaceContext";

export function PosClientContainer({ posState = "ready" }: { posState?: PosStateMode }) {
  const { config } = useWorkspace();

  const apiContext = config
    ? {
        apiUrl: config.apiUrl,
        sessionToken: config.sessionToken,
        organizationId: config.organizationId,
      }
    : undefined;

  return <PosView posState={posState} apiContext={apiContext} />;
}
