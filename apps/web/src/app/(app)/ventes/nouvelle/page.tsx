import React, { Suspense } from "react";
import { PosView, PosLoading, PosStateMode } from "@/features/pos";

export interface NouvelleVentePageProps {
  searchParams?: { posState?: string } | Promise<{ posState?: string }>;
}

export default async function NouvelleVentePage({ searchParams }: NouvelleVentePageProps) {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const posState = (resolvedSearchParams?.posState as PosStateMode) || "ready";

  return (
    <Suspense fallback={<PosLoading />}>
      <PosView posState={posState} />
    </Suspense>
  );
}
