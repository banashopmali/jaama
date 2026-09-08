import React, { Suspense } from "react";
import { SalesListView, SalesLoading, SalesStateMode } from "@/features/sales";

export interface VentesPageProps {
  searchParams?: { salesState?: string } | Promise<{ salesState?: string }>;
}

export default async function VentesPage({ searchParams }: VentesPageProps) {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const salesState = resolvedSearchParams?.salesState as SalesStateMode | undefined;

  return (
    <Suspense fallback={<SalesLoading />}>
      <SalesListView salesState={salesState} />
    </Suspense>
  );
}
