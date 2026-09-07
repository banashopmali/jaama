"use client";

import React, { useState, useEffect } from "react";
import { Package, Plus, Search, Filter, Tag, Archive } from "lucide-react";
import { Button, Card, Badge, Modal } from "@jaama/ui";
import { useWorkspace } from "@/context/WorkspaceContext";
import { formatMoney } from "../../sales/sales.utils";

export interface UIProduct {
  id: string;
  sku: string;
  name: string;
  category: string;
  unitPriceMinor: number;
  costMinor?: number | null;
  status: "active" | "inactive" | "archived";
  lowStockThreshold?: number | null;
  stock: {
    available: number;
    reserved: number;
  };
}

export const ProductsView: React.FC = () => {
  const { apiFetch } = useWorkspace();
  const [products, setProducts] = useState<UIProduct[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tous");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<UIProduct | null>(null);

  // Form State
  const [newSku, setNewSku] = useState("");
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("Alimentation");
  const [newPrice, setNewPrice] = useState("");
  const [newStock, setNewStock] = useState("10");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const categories = ["Tous", "Alimentation", "Boissons", "Équipement", "Hygiène"];

  const loadProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/v1/products");
      const list = res.data || [];
      const mapped: UIProduct[] = list.map((p: any) => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category,
        unitPriceMinor: p.unitPriceMinor,
        costMinor: p.costMinor,
        status: p.status || "active",
        lowStockThreshold: p.lowStockThreshold,
        stock: {
          available: p.stock?.available ?? p.inventoryBalances?.[0]?.availableQuantity ?? p.inventoryBalance?.availableQuantity ?? 0,
          reserved: 0,
        },
      }));
      setProducts(mapped);
    } catch (err: any) {
      setError(err?.message || "Impossible de charger le catalogue produits.");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "Tous" || p.category === selectedCategory;
    return matchesSearch && matchesCategory && p.status !== "archived";
  });

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!newName.trim() || !newSku.trim() || !newPrice.trim()) return;

    const priceMinor = parseInt(newPrice, 10);
    const stockQty = parseInt(newStock, 10);
    if (isNaN(priceMinor) || priceMinor <= 0) {
      setFormError("Le prix unitaire doit être un nombre valide supérieur à zéro.");
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch("/api/v1/products", {
        method: "POST",
        body: JSON.stringify({
          sku: newSku.trim().toUpperCase(),
          name: newName.trim(),
          category: newCategory,
          unitPriceMinor: priceMinor,
          initialStock: isNaN(stockQty) ? 0 : stockQty,
        }),
      });

      setIsCreateModalOpen(false);
      setNewSku("");
      setNewName("");
      setNewPrice("");
      setNewStock("10");
      loadProducts();
    } catch (err: any) {
      setFormError(err?.message || "Échec de la création du produit.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchiveProduct = async (id: string) => {
    try {
      await apiFetch(`/api/v1/products/${id}`, {
        method: "DELETE",
      });
      setSelectedProduct(null);
      loadProducts();
    } catch (err: any) {
      alert(err?.message || "Échec de l'archivage du produit.");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-content-primary tracking-tight">Catalogue Produits</h1>
          <p className="text-sm text-content-secondary">
            Gérez vos références, tarifs et catégories d’articles en stock.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setIsCreateModalOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Nouveau produit
        </Button>
      </div>

      {/* Filters & Search */}
      <Card variant="default" className="p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-content-tertiary" />
            <input
              type="text"
              placeholder="Rechercher par nom ou SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary bg-surface-default text-content-primary"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <Filter className="w-4 h-4 text-content-tertiary hidden sm:block" />
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? "bg-brand-primary text-white"
                    : "bg-surface-subtle text-content-secondary hover:bg-surface-hover"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Product List / Table */}
      <Card variant="default" className="overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm font-medium text-content-secondary">
            Chargement du catalogue serveur...
          </div>
        ) : error ? (
          <div className="p-12 text-center text-sm text-state-danger-fg">
            {error}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Package className="w-12 h-12 text-content-tertiary mx-auto opacity-40" />
            <p className="text-sm font-semibold text-content-secondary">
              Aucun produit trouvé dans votre catalogue.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border-subtle bg-surface-subtle text-xs font-semibold text-content-secondary">
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4">Produit</th>
                  <th className="py-3 px-4">Catégorie</th>
                  <th className="py-3 px-4 text-right">Prix Unitaire</th>
                  <th className="py-3 px-4 text-center">Stock disponible</th>
                  <th className="py-3 px-4 text-center">Statut</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {filteredProducts.map((product) => {
                  const available = product.stock.available;
                  const threshold = product.lowStockThreshold ?? 5;
                  const isLow = available > 0 && available <= threshold;
                  const isOutOfStock = available <= 0;

                  return (
                    <tr
                      key={product.id}
                      className="hover:bg-surface-hover transition-colors cursor-pointer"
                      onClick={() => setSelectedProduct(product)}
                    >
                      <td className="py-3.5 px-4 font-mono text-xs font-bold text-content-brand">
                        {product.sku}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-content-primary">
                        {product.name}
                      </td>
                      <td className="py-3.5 px-4 text-content-secondary">
                        <span className="inline-flex items-center gap-1 text-xs">
                          <Tag className="w-3 h-3 text-content-tertiary" />
                          {product.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-content-primary">
                        {formatMoney(product.unitPriceMinor)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <span
                            className={`font-extrabold ${
                              isOutOfStock
                                ? "text-state-danger-fg"
                                : isLow
                                ? "text-state-warning-fg"
                                : "text-content-primary"
                            }`}
                          >
                            {available}
                          </span>
                          {isOutOfStock ? (
                            <Badge variant="danger" size="sm">Rupture</Badge>
                          ) : isLow ? (
                            <Badge variant="warning" size="sm">Faible</Badge>
                          ) : null}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Badge variant="success" size="sm">Actif</Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProduct(product);
                          }}
                        >
                          Détails
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create Product Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Créer un nouveau produit"
      >
        <form onSubmit={handleCreateProduct} className="space-y-4 pt-2">
          {formError && (
            <div className="p-3 text-xs text-red-600 bg-red-50 rounded-lg">{formError}</div>
          )}

          <div>
            <label className="block text-xs font-bold text-content-primary mb-1">
              SKU Produit *
            </label>
            <input
              type="text"
              required
              placeholder="ex: RIZ-5KG"
              value={newSku}
              onChange={(e) => setNewSku(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border-subtle rounded-lg bg-surface-default text-content-primary font-mono uppercase"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-content-primary mb-1">
              Nom du produit *
            </label>
            <input
              type="text"
              required
              placeholder="ex: Riz Parfumé 5kg"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border-subtle rounded-lg bg-surface-default text-content-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-content-primary mb-1">
                Catégorie
              </label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border-subtle rounded-lg bg-surface-default text-content-primary"
              >
                <option value="Alimentation">Alimentation</option>
                <option value="Boissons">Boissons</option>
                <option value="Équipement">Équipement</option>
                <option value="Hygiène">Hygiène</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-content-primary mb-1">
                Prix unitaire (FCFA) *
              </label>
              <input
                type="number"
                required
                min="0"
                placeholder="6500"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border-subtle rounded-lg bg-surface-default text-content-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-content-primary mb-1">
              Stock initial (Unités)
            </label>
            <input
              type="number"
              min="0"
              value={newStock}
              onChange={(e) => setNewStock(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border-subtle rounded-lg bg-surface-default text-content-primary"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Annuler
            </Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? "Enregistrement..." : "Enregistrer le produit"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Product Detail / Edit Modal */}
      {selectedProduct && (
        <Modal
          isOpen={Boolean(selectedProduct)}
          onClose={() => setSelectedProduct(null)}
          title={`Détails : ${selectedProduct.name}`}
        >
          <div className="space-y-5 pt-2">
            <div className="grid grid-cols-2 gap-4 text-sm bg-surface-subtle p-4 rounded-lg border border-border-subtle">
              <div>
                <span className="text-xs text-content-tertiary block">SKU</span>
                <span className="font-mono font-bold text-content-brand">{selectedProduct.sku}</span>
              </div>

              <div>
                <span className="text-xs text-content-tertiary block">Catégorie</span>
                <span className="font-semibold text-content-primary">{selectedProduct.category}</span>
              </div>

              <div>
                <span className="text-xs text-content-tertiary block">Prix unitaire</span>
                <span className="font-bold text-content-primary">{formatMoney(selectedProduct.unitPriceMinor)}</span>
              </div>

              <div>
                <span className="text-xs text-content-tertiary block">Stock disponible</span>
                <span className="font-extrabold text-content-primary">{selectedProduct.stock.available} unités</span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-border-subtle">
              <Button
                variant="secondary"
                onClick={() => handleArchiveProduct(selectedProduct.id)}
                leftIcon={<Archive className="w-4 h-4 text-state-danger-fg" />}
              >
                Archiver le produit
              </Button>

              <Button variant="primary" onClick={() => setSelectedProduct(null)}>
                Fermer
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
