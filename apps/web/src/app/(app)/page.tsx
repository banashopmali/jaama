import React, { Suspense } from "react";
import { DashboardView, DashboardLoading } from "@/features/dashboard";

export default function DashboardHomePage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardView />
    </Suspense>
  );
}
