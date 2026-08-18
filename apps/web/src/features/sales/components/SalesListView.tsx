import React from "react";
import { SalesStateMode } from "../sales.types";
import { mockPopulatedSales, mockSummaryData } from "../sales.mock";
import { SalesHeader } from "./SalesHeader";
import { SalesSummary } from "./SalesSummary";
import { SalesListInteractiveSection } from "./SalesListInteractiveSection";
import { SalesEmptyState } from "./SalesEmptyState";
import { SalesLoading } from "./SalesLoading";
import { SalesListError } from "./SalesListError";

export interface SalesListViewProps {
  salesState?: SalesStateMode;
}

export const SalesListView: React.FC<SalesListViewProps> = ({
  salesState = "populated",
}) => {
  // 1. Loading State
  if (salesState === "loading") {
    return <SalesLoading />;
  }

  // 2. Business Empty State (0 Sales)
  if (salesState === "empty") {
    return (
      <div className="space-y-6">
        <SalesHeader />
        <SalesSummary
          summary={{
            totalSalesCount: 0,
            totalSalesAmount: 0,
            totalCollectedAmount: 0,
            totalToCollectAmount: 0,
          }}
        />
        <SalesEmptyState />
      </div>
    );
  }

  // 3. Error State
  if (salesState === "error") {
    return (
      <div className="space-y-6">
        <SalesHeader />
        <SalesListError />
      </div>
    );
  }

  // 4. Populated State (Default)
  return (
    <div className="space-y-6">
      <SalesHeader />
      <SalesSummary summary={mockSummaryData} />
      <SalesListInteractiveSection initialSales={mockPopulatedSales} />
    </div>
  );
};
