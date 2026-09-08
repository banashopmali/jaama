import React, { Suspense } from "react";
import { DashboardLoading } from "@/features/dashboard";
import { DashboardClientContainer } from "@/features/dashboard/DashboardClientContainer";

export default function DashboardHomePage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardClientContainer />
    </Suspense>
  );
}
