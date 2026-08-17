import React, { Suspense } from "react";
import { DashboardView, DashboardLoading, DashboardStateMode } from "@/features/dashboard";

export interface DashboardPageProps {
  searchParams?: { dashboardState?: string } | Promise<{ dashboardState?: string }>;
}

export default async function DashboardHomePage({ searchParams }: DashboardPageProps) {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const stateMode = (resolvedSearchParams?.dashboardState as DashboardStateMode) || "populated";

  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardView stateMode={stateMode} />
    </Suspense>
  );
}
