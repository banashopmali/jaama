import React from "react";
import { Skeleton, Card } from "@jaama/ui";

export const PosLoading: React.FC = () => {
  return (
    <div className="space-y-6 select-none">
      {/* Header Skeleton */}
      <div className="border-b border-border-subtle pb-4 space-y-2">
        <Skeleton variant="text" className="w-36 h-4 rounded" />
        <Skeleton variant="rectangular" className="w-60 h-8 rounded-xl" />
      </div>

      {/* Main Two-Panel Layout Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Product Catalog Skeleton */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          <Card variant="default" className="p-4 space-y-3">
            <Skeleton variant="rectangular" className="w-full h-10 rounded-lg" />
            <div className="flex gap-2">
              <Skeleton variant="rectangular" className="w-16 h-8 rounded-lg" />
              <Skeleton variant="rectangular" className="w-20 h-8 rounded-lg" />
              <Skeleton variant="rectangular" className="w-24 h-8 rounded-lg" />
            </div>
          </Card>

          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Card key={i} variant="default" className="p-4 space-y-3">
                <Skeleton variant="text" className="w-16 h-3 rounded" />
                <Skeleton variant="rectangular" className="w-full h-10 rounded-lg" />
                <Skeleton variant="text" className="w-20 h-5 rounded" />
              </Card>
            ))}
          </div>
        </div>

        {/* Right: Cart Skeleton */}
        <div className="lg:col-span-5 xl:col-span-4">
          <Card variant="default" className="p-5 space-y-4">
            <Skeleton variant="rectangular" className="w-full h-8 rounded-lg" />
            <Skeleton variant="rectangular" className="w-full h-10 rounded-lg" />
            <Skeleton variant="rectangular" className="w-full h-40 rounded-xl" />
            <Skeleton variant="rectangular" className="w-full h-12 rounded-xl" />
          </Card>
        </div>
      </div>
    </div>
  );
};
