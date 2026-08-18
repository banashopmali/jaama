import React from "react";
import { PosStateMode } from "../pos.types";
import { PosHeader } from "./PosHeader";
import { PosInteractiveSection } from "./PosInteractiveSection";
import { PosLoading } from "./PosLoading";
import { PosErrorState } from "./PosErrorState";
import { PosNoCatalogState } from "./PosNoCatalogState";

export interface PosViewProps {
  posState?: PosStateMode;
}

export const PosView: React.FC<PosViewProps> = ({ posState = "ready" }) => {
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
  return <PosInteractiveSection />;
};
