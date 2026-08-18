import React from "react";
import { cn } from "@jaama/ui";

export interface ProductCategoriesProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

export const ProductCategories: React.FC<ProductCategoriesProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
}) => {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
      {categories.map((cat) => {
        const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
        return (
          <button
            key={cat}
            type="button"
            onClick={() => onSelectCategory(cat)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary",
              isSelected
                ? "bg-brand-primary text-content-inverse shadow-xs font-bold"
                : "bg-surface-default text-content-secondary hover:bg-surface-hover border border-border-subtle"
            )}
            aria-pressed={isSelected}
            aria-label={`Catégorie ${cat}`}
          >
            {cat}
          </button>
        );
      })}
    </div>
  );
};
