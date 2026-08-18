"use client";

import React, { useState } from "react";
import { SaleListItem, SalesFilterState } from "../sales.types";
import { filterSales } from "../sales.utils";
import { SalesFilters } from "./SalesFilters";
import { SalesTable } from "./SalesTable";
import { SalesMobileList } from "./SalesMobileList";
import { SalesNoResultsState } from "./SalesNoResultsState";

export interface SalesListInteractiveSectionProps {
  initialSales: SaleListItem[];
}

const initialFilterState: SalesFilterState = {
  searchQuery: "",
  paymentStatus: "all",
  paymentMethod: "all",
  saleStatus: "all",
};

export const SalesListInteractiveSection: React.FC<SalesListInteractiveSectionProps> = ({
  initialSales,
}) => {
  const [filters, setFilters] = useState<SalesFilterState>(initialFilterState);

  const handleFilterChange = (updated: Partial<SalesFilterState>) => {
    setFilters((prev) => ({ ...prev, ...updated }));
  };

  const handleReset = () => {
    setFilters(initialFilterState);
  };

  const filteredSales = filterSales(initialSales, filters);

  return (
    <div className="space-y-4">
      {/* 1. Search & Filter Bar */}
      <SalesFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleReset}
        resultCount={filteredSales.length}
      />

      {/* 2. Filtered Dataset View (Table or Mobile Cards or No Results State) */}
      {filteredSales.length > 0 ? (
        <>
          <SalesTable sales={filteredSales} />
          <SalesMobileList sales={filteredSales} />
        </>
      ) : (
        <SalesNoResultsState onReset={handleReset} />
      )}
    </div>
  );
};
