import React from "react";
import { Search } from "lucide-react";
import { Input } from "@jaama/ui";

export interface ProductSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const ProductSearch: React.FC<ProductSearchProps> = ({
  searchQuery,
  onSearchChange,
}) => {
  return (
    <Input
      type="text"
      size="sm"
      value={searchQuery}
      onChange={(e) => onSearchChange(e.target.value)}
      placeholder="Rechercher un produit ou un SKU…"
      leftSlot={<Search className="w-4 h-4 text-content-muted" />}
      aria-label="Rechercher un produit ou un SKU"
    />
  );
};
