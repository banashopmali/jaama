import React from "react";
import { PosStateMode } from "../pos.types";
import { PosHeader } from "./PosHeader";
import { PosInteractiveSection, PosInteractiveSectionProps } from "./PosInteractiveSection";
import { PosLoading } from "./PosLoading";
import { PosErrorState } from "./PosErrorState";
import { PosNoCatalogState } from "./PosNoCatalogState";
import { PosApiContext } from "../pos.api";

export interface PosViewProps {
  posState?: PosStateMode;
  apiContext?: PosApiContext;
  apiAdapter?: PosInteractiveSectionProps["apiAdapter"];
}

export const PosView: React.FC<PosViewProps> = ({
  posState = "ready",
  apiContext,
  apiAdapter,
}) => {
  // 1. Loading State
  if (posState === "loading") {
    return <PosLoading />;
  }

  // 2. Empty Catalog State
  if (posState === "empty-catalog") {
    return (
      <div className="space-y-6">
        <PosHeader />
        <PosNoCatalogState />
      </div>
    );
  }

  // 3. Error State
  if (posState === "error") {
    return (
      <div className="space-y-6">
        <PosHeader />
        <PosErrorState retryHref="/ventes/nouvelle" />
      </div>
    );
  }

  // 4. Ready State (Default)
  return <PosInteractiveSection apiContext={apiContext} apiAdapter={apiAdapter} />;
};
