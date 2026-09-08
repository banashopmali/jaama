import React, { Suspense } from "react";
import { PosLoading, PosStateMode } from "@/features/pos";
import { PosClientContainer } from "@/features/pos/PosClientContainer";

export interface NouvelleVentePageProps {
  searchParams?: { posState?: string } | Promise<{ posState?: string }>;
}

export default async function NouvelleVentePage({ searchParams }: NouvelleVentePageProps) {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const posState = (resolvedSearchParams?.posState as PosStateMode) || "ready";

  return (
    <Suspense fallback={<PosLoading />}>
      <PosClientContainer posState={posState} />
    </Suspense>
  );
}
