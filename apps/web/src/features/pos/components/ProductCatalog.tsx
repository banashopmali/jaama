import React from "react";
import { FilterX, RotateCcw } from "lucide-react";
import { Button, Card } from "@jaama/ui";
import { PosCartLine, PosProduct } from "../pos.types";
import { posCategories } from "../pos.mock";
import { filterProducts } from "../pos.utils";
import { ProductSearch } from "./ProductSearch";
import { ProductCategories } from "./ProductCategories";
import { ProductCard } from "./ProductCard";

export interface ProductCatalogProps {
  products: PosProduct[];
  cart: PosCartLine[];
  searchQuery: string;
  selectedCategory: string;
  onSearchChange: (query: string) => void;
  onSelectCategory: (category: string) => void;
  onAddToCart: (product: PosProduct) => void;
  onResetSearch: () => void;
}

export const ProductCatalog: React.FC<ProductCatalogProps> = ({
  products,
  cart,
  searchQuery,
  selectedCategory,
  onSearchChange,
  onSelectCategory,
  onAddToCart,
  onResetSearch,
}) => {
  const filteredProducts = filterProducts(products, searchQuery, selectedCategory);
  const isFiltered = searchQuery.trim() !== "" || selectedCategory !== "Tous";

  const getCartQuantity = (productId: string): number => {
    const line = cart.find((l) => l.productId === productId);
    return line ? line.quantity : 0;
  };

  return (
    <div className="space-y-4">
      {/* Search & Category Filter Controls */}
      <div className="space-y-3 bg-surface-default p-4 rounded-xl border border-border-subtle shadow-xs">
        <ProductSearch
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
        />
        <ProductCategories
          categories={posCategories}
          selectedCategory={selectedCategory}
          onSelectCategory={onSelectCategory}
        />
      </div>

      {/* Catalog Grid or No-Results View */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              cartQuantity={getCartQuantity(product.id)}
              onAddToCart={onAddToCart}
            />
          ))}
        </div>
      ) : (
        <Card variant="default" className="p-8 text-center border-dashed border-border-subtle">
          <div className="max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-surface-subtle text-content-secondary flex items-center justify-center border border-border-subtle mx-auto">
              <FilterX className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-content-primary">
                Aucun produit ne correspond à votre recherche
              </h3>
              <p className="text-xs text-content-secondary leading-relaxed">
                Essayez de modifier votre recherche textuelle ou de sélectionner une autre catégorie.
              </p>
            </div>

            {isFiltered && (
              <div className="pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onResetSearch}
                  leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                >
                  Réinitialiser la recherche
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};
