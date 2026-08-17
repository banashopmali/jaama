"use client";

import React from "react";
import { Skeleton, Card } from "@jaama/ui";

export const DashboardLoading: React.FC = () => {
  return (
    <div className="space-y-6 select-none">
      {/* Header Skeleton */}
      <div className="border-b border-border-subtle pb-5 space-y-2">
        <Skeleton variant="rectangular" className="w-32 h-5 rounded-lg" />
        <Skeleton variant="rectangular" className="w-72 h-8 rounded-xl" />
        <Skeleton variant="text" className="w-56 h-4 rounded-md" />
      </div>

      {/* 4 KPI Cards Skeletons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} variant="default" className="p-5 space-y-3">
            <div className="flex justify-between items-center">
              <Skeleton variant="text" className="w-28 h-4 rounded" />
              <Skeleton variant="rectangular" className="w-7 h-7 rounded-lg" />
            </div>
            <Skeleton variant="rectangular" className="w-40 h-8 rounded-lg" />
            <Skeleton variant="text" className="w-24 h-4 rounded" />
          </Card>
        ))}
      </div>

      {/* Main Grid Skeletons */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend Skeleton */}
        <div className="lg:col-span-2">
          <Card variant="default" className="p-6 space-y-4 h-full">
            <div className="flex justify-between items-center">
              <Skeleton variant="text" className="w-44 h-6 rounded-lg" />
              <Skeleton variant="rectangular" className="w-20 h-6 rounded-lg" />
            </div>
            <Skeleton variant="rectangular" className="w-full h-52 rounded-xl" />
          </Card>
        </div>

        {/* Attention Panel Skeleton */}
        <div className="lg:col-span-1">
          <Card variant="default" className="p-6 space-y-4 h-full">
            <Skeleton variant="text" className="w-36 h-6 rounded-lg" />
            <div className="space-y-3">
              <Skeleton variant="rectangular" className="w-full h-20 rounded-xl" />
              <Skeleton variant="rectangular" className="w-full h-20 rounded-xl" />
              <Skeleton variant="rectangular" className="w-full h-20 rounded-xl" />
            </div>
          </Card>
        </div>
      </div>

      {/* Recent Sales Skeleton */}
      <Card variant="default" className="p-6 space-y-4">
        <Skeleton variant="text" className="w-40 h-6 rounded-lg" />
        <Skeleton variant="rectangular" className="w-full h-44 rounded-xl" />
      </Card>
    </div>
  );
};
