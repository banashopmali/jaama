"use client";

import React, { useState } from "react";
import { ArrowUpRight, ArrowDownLeft, Sliders, Search } from "lucide-react";
import { Button, Card, Badge, Modal, Alert } from "@jaama/ui";

export interface UIInventoryItem {
  productId: string;
  sku: string;
  name: string;
  category: string;
  availableQuantity: number;
  reservedQuantity: number;
  lowStockThreshold: number;
  stockStatus: "normal" | "low" | "out_of_stock";
}

export interface UIStockMovement {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  movementType: "OPENING" | "PURCHASE_IN" | "SALE_OUT" | "ADJUSTMENT_IN" | "ADJUSTMENT_OUT";
  quantityDelta: number;
  reference: string;
  recordedAt: string;
}

export const mockInventoryItems: UIInventoryItem[] = [
  {
    productId: "prod-001",
    sku: "COC-500",
    name: "Coca-Cola 50cl",
    category: "Boissons",
    availableQuantity: 45,
    reservedQuantity: 0,
    lowStockThreshold: 10,
    stockStatus: "normal",
  },
  {
    productId: "prod-002",
    sku: "AMP-12W",
    name: "Ampoule LED 12W",
    category: "Équipement",
    availableQuantity: 12,
    reservedQuantity: 0,
    lowStockThreshold: 5,
    stockStatus: "normal",
  },
  {
    productId: "prod-003",
    sku: "NID-300",
    name: "Lait Nido 400g",
    category: "Alimentation",
    availableQuantity: 3,
    reservedQuantity: 0,
    lowStockThreshold: 5,
    stockStatus: "low",
  },
  {
    productId: "prod-004",
    sku: "RIZ-400",
    name: "Riz Parfumé 5kg",
    category: "Alimentation",
    availableQuantity: 20,
    reservedQuantity: 0,
    lowStockThreshold: 10,
    stockStatus: "normal",
  },
];

export const mockStockMovements: UIStockMovement[] = [
  {
    id: "mov-001",
    productId: "prod-001",
    productName: "Coca-Cola 50cl",
    sku: "COC-500",
    movementType: "SALE_OUT",
    quantityDelta: -2,
    reference: "VTE-0025",
    recordedAt: new Date().toISOString(),
  },
  {
    id: "mov-002",
    productId: "prod-004",
    productName: "Riz Parfumé 5kg",
    sku: "RIZ-400",
    movementType: "PURCHASE_IN",
    quantityDelta: 20,
    reference: "ACHAT-0012",
    recordedAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

export const InventoryView: React.FC = () => {
  const [items, setItems] = useState<UIInventoryItem[]>(mockInventoryItems);
  const [movements, setMovements] = useState<UIStockMovement[]>(mockStockMovements);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<UIInventoryItem | null>(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);

  // Adjustment Form
  const [adjustType, setAdjustType] = useState<"ADJUSTMENT_IN" | "ADJUSTMENT_OUT">("ADJUSTMENT_IN");
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    setErrorMsg(null);

    const qty = parseInt(adjustQty, 10);
    if (isNaN(qty) || qty <= 0) {
      setErrorMsg("La quantité d'ajustement doit être supérieure à zéro.");
      return;
    }

    const delta = adjustType === "ADJUSTMENT_OUT" ? -qty : qty;
    const newAvailable = selectedItem.availableQuantity + delta;

    if (newAvailable < 0) {
      setErrorMsg(`Stock insuffisant. Le stock disponible (${selectedItem.availableQuantity}) ne peut pas devenir négatif.`);
      return;
    }

    let newStatus: "normal" | "low" | "out_of_stock" = "normal";
    if (newAvailable <= 0) {
      newStatus = "out_of_stock";
    } else if (newAvailable <= selectedItem.lowStockThreshold) {
      newStatus = "low";
    }

    // Update state
    setItems(
      items.map((item) =>
        item.productId === selectedItem.productId
          ? { ...item, availableQuantity: newAvailable, stockStatus: newStatus }
          : item
      )
    );

    const newMov: UIStockMovement = {
      id: `mov-${Date.now()}`,
      productId: selectedItem.productId,
      productName: selectedItem.name,
      sku: selectedItem.sku,
      movementType: adjustType,
      quantityDelta: delta,
      reference: adjustReason.trim() || `AJUSTEMENT-MANUEL`,
      recordedAt: new Date().toISOString(),
    };

    setMovements([newMov, ...movements]);
    setIsAdjustModalOpen(false);
    setSelectedItem(null);
    setAdjustQty("");
    setAdjustReason("");
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-content-primary tracking-tight">Gestion des Stocks</h1>
          <p className="text-sm text-content-secondary">
            Suivi autoritaire des quantités disponibles, alertes de niveau et mouvements.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card variant="default" className="p-4 space-y-1">
          <span className="text-xs font-bold text-content-secondary uppercase">Articles Référencés</span>
          <p className="text-2xl font-black text-content-primary">{items.length}</p>
        </Card>

        <Card variant="default" className="p-4 space-y-1">
          <span className="text-xs font-bold text-state-warning-fg uppercase">Stock Faible</span>
          <p className="text-2xl font-black text-state-warning-fg">
            {items.filter((i) => i.stockStatus === "low").length}
          </p>
        </Card>

        <Card variant="default" className="p-4 space-y-1">
          <span className="text-xs font-bold text-state-danger-fg uppercase">Rupture de Stock</span>
          <p className="text-2xl font-black text-state-danger-fg">
            {items.filter((i) => i.stockStatus === "out_of_stock").length}
          </p>
        </Card>
      </div>

      {/* Search Bar */}
      <Card variant="default" className="p-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-content-tertiary" />
          <input
            type="text"
            placeholder="Rechercher un produit en stock par nom ou SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary bg-surface-default text-content-primary"
          />
        </div>
      </Card>

      {/* Inventory Table */}
      <Card variant="default" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-border-subtle bg-surface-subtle text-xs font-semibold text-content-secondary">
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4">Produit</th>
                <th className="py-3 px-4">Catégorie</th>
                <th className="py-3 px-4 text-center">Quantité disponible</th>
                <th className="py-3 px-4 text-center">Seuil alerte</th>
                <th className="py-3 px-4 text-center">Statut stock</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {filteredItems.map((item) => (
                <tr key={item.productId} className="hover:bg-surface-hover transition-colors">
                  <td className="py-3.5 px-4 font-mono text-xs font-bold text-content-brand">
                    {item.sku}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-content-primary">
                    {item.name}
                  </td>
                  <td className="py-3.5 px-4 text-content-secondary">{item.category}</td>
                  <td className="py-3.5 px-4 text-center font-extrabold text-content-primary">
                    {item.availableQuantity}
                  </td>
                  <td className="py-3.5 px-4 text-center text-content-tertiary text-xs">
                    {item.lowStockThreshold}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {item.stockStatus === "out_of_stock" ? (
                      <Badge variant="danger">Rupture</Badge>
                    ) : item.stockStatus === "low" ? (
                      <Badge variant="warning">Faible</Badge>
                    ) : (
                      <Badge variant="success">Normal</Badge>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setSelectedItem(item);
                        setIsAdjustModalOpen(true);
                      }}
                      leftIcon={<Sliders className="w-3.5 h-3.5" />}
                    >
                      Ajuster stock
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Stock Movements Log */}
      <Card variant="default" className="p-5 space-y-4">
        <h3 className="text-base font-bold text-content-primary">Historique des mouvements de stock</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border-subtle text-content-tertiary">
                <th className="py-2 px-3">Date</th>
                <th className="py-2 px-3">Produit</th>
                <th className="py-2 px-3">Type mouvement</th>
                <th className="py-2 px-3 text-right">Variation</th>
                <th className="py-2 px-3">Référence / Motif</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {movements.map((mov) => {
                const isPositive = mov.quantityDelta > 0;
                return (
                  <tr key={mov.id}>
                    <td className="py-2.5 px-3 text-content-secondary">
                      {new Date(mov.recordedAt).toLocaleString("fr-FR")}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-content-primary">
                      {mov.productName} ({mov.sku})
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-mono font-bold text-content-brand">
                        {mov.movementType}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold">
                      <span
                        className={`inline-flex items-center gap-1 ${
                          isPositive ? "text-state-success-fg" : "text-state-danger-fg"
                        }`}
                      >
                        {isPositive ? (
                          <ArrowUpRight className="w-3 h-3" />
                        ) : (
                          <ArrowDownLeft className="w-3 h-3" />
                        )}
                        {isPositive ? `+${mov.quantityDelta}` : mov.quantityDelta}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-content-secondary font-mono">
                      {mov.reference}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Adjust Stock Modal */}
      {selectedItem && (
        <Modal
          isOpen={isAdjustModalOpen}
          onClose={() => {
            setIsAdjustModalOpen(false);
            setSelectedItem(null);
          }}
          title={`Ajustement de stock : ${selectedItem.name}`}
        >
          <form onSubmit={handleAdjustSubmit} className="space-y-4 pt-2">
            {errorMsg && (
              <Alert variant="danger" title="Erreur d'ajustement">
                <p className="text-xs">{errorMsg}</p>
              </Alert>
            )}

            <div className="bg-surface-subtle p-3 rounded-lg text-xs space-y-1">
              <p>
                <span className="font-bold text-content-primary">Stock actuel :</span>{" "}
                {selectedItem.availableQuantity} unités
              </p>
              <p className="text-content-tertiary">
                Toute modification de stock fait l&apos;objet d&apos;un mouvement tracé.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-content-primary mb-1">
                Sens de l&apos;ajustement *
              </label>
              <select
                value={adjustType}
                onChange={(e) => setAdjustType(e.target.value as any)}
                className="w-full px-3 py-2 text-sm border border-border-subtle rounded-lg bg-surface-default text-content-primary"
              >
                <option value="ADJUSTMENT_IN">Entrée de stock (+)</option>
                <option value="ADJUSTMENT_OUT">Sortie de stock (-)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-content-primary mb-1">
                Quantité *
              </label>
              <input
                type="number"
                required
                min="1"
                placeholder="ex: 10"
                value={adjustQty}
                onChange={(e) => setAdjustQty(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border-subtle rounded-lg bg-surface-default text-content-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-content-primary mb-1">
                Motif / Référence de l&apos;ajustement *
              </label>
              <input
                type="text"
                required
                placeholder="ex: Inventaire physique mensuel, casse, etc."
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border-subtle rounded-lg bg-surface-default text-content-primary"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setIsAdjustModalOpen(false)}
              >
                Annuler
              </Button>
              <Button variant="primary" type="submit">
                Confirmer l&apos;ajustement
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
