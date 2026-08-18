import React from "react";
import { Skeleton, Card } from "@jaama/ui";

export const SalesLoading: React.FC = () => {
  return (
    <div className="space-y-6 select-none">
      {/* Header Skeleton */}
      <div className="border-b border-border-subtle pb-5 space-y-2">
        <Skeleton variant="rectangular" className="w-32 h-5 rounded-lg" />
        <Skeleton variant="rectangular" className="w-48 h-8 rounded-xl" />
        <Skeleton variant="text" className="w-72 h-4 rounded-md" />
      </div>

      {/* 4 Summary Cards Skeletons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} variant="default" className="p-5 space-y-3">
            <div className="flex justify-between items-center">
              <Skeleton variant="text" className="w-28 h-4 rounded" />
              <Skeleton variant="rectangular" className="w-7 h-7 rounded-lg" />
            </div>
            <Skeleton variant="rectangular" className="w-36 h-8 rounded-lg" />
            <Skeleton variant="text" className="w-24 h-4 rounded" />
          </Card>
        ))}
      </div>

      {/* Filter Bar Skeleton */}
      <Card variant="default" className="p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <Skeleton variant="rectangular" className="w-full sm:w-72 h-10 rounded-lg" />
          <Skeleton variant="rectangular" className="w-40 h-10 rounded-lg" />
          <Skeleton variant="rectangular" className="w-40 h-10 rounded-lg" />
        </div>
      </Card>

      {/* Table Skeleton */}
      <Card variant="default" className="p-6 space-y-4">
        <Skeleton variant="rectangular" className="w-full h-64 rounded-xl" />
      </Card>
    </div>
  );
};
