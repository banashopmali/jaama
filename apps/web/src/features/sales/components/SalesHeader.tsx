import React from "react";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { Button, Badge } from "@jaama/ui";

export interface SalesHeaderProps {
  businessName?: string;
}

export const SalesHeader: React.FC<SalesHeaderProps> = ({
  businessName = "Diallo Commerce",
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-5">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="brand" size="sm">
            VENTES &amp; ENCAISSEMENTS
          </Badge>
          <span className="text-xs text-content-muted font-medium">·</span>
          <span className="text-xs font-semibold text-content-secondary">
            {businessName}
          </span>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-content-primary tracking-tight font-sans">
          Ventes
        </h1>

        <p className="text-sm text-content-secondary mt-1 leading-relaxed">
          Suivez vos ventes, vos encaissements et les montants restant à recevoir.
        </p>
      </div>

      <div className="self-start sm:self-auto">
        <Link href="/ventes/nouvelle">
          <Button
            variant="primary"
            size="md"
            leftIcon={<PlusCircle className="w-4 h-4" />}
          >
            Nouvelle vente
          </Button>
        </Link>
      </div>
    </div>
  );
};
