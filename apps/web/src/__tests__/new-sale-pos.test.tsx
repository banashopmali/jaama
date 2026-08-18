import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  calculateLineTotal,
  calculateSubtotal,
  calculateTotal,
  calculatePaidAmount,
  calculateRemaining,
  derivePaymentStatus,
  filterProducts,
} from "../features/pos/pos.utils";
import { PosView } from "../features/pos/components/PosView";
import { mockPosProducts } from "../features/pos/pos.mock";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/ventes/nouvelle",
  useSearchParams: () => ({
    get: (key: string) => null,
  }),
}));

describe("JAAMA New Sale / POS V1 — Domain & Component Behavior Contracts (JAA-S0-06)", () => {
  describe("Pure POS Math & Utility Contracts", () => {
    it("calculates line total accurately without floating point bugs", () => {
      expect(calculateLineTotal(500, 3)).toBe(1500);
      expect(calculateLineTotal(750, 2)).toBe(1500);
      expect(calculateLineTotal(0, 5)).toBe(0);
      expect(calculateLineTotal(-100, 2)).toBe(0);
    });

    it("calculates subtotal and total after discount correctly", () => {
      const cart = [
        { productId: "p1", sku: "S1", name: "P1", unitPrice: 500, quantity: 2, maxAvailableStock: 10 },
        { productId: "p2", sku: "S2", name: "P2", unitPrice: 1000, quantity: 1, maxAvailableStock: 10 },
      ];
      const subtotal = calculateSubtotal(cart);
      expect(subtotal).toBe(2000);

      expect(calculateTotal(subtotal, 500)).toBe(1500);
      expect(calculateTotal(subtotal, 0)).toBe(2000);
      expect(calculateTotal(subtotal, 3000)).toBe(0); // Discount cannot exceed subtotal
    });

    it("derives payment status according to exact business rules", () => {
      // 1. Full Payment
      expect(derivePaymentStatus(25000, 25000)).toBe("Payée");
      expect(derivePaymentStatus(25000, 30000)).toBe("Payée");

      // 2. Partial Payment
      expect(derivePaymentStatus(75000, 50000)).toBe("Partiellement payée");
      expect(derivePaymentStatus(100000, 1000)).toBe("Partiellement payée");

      // 3. Unpaid / Credit
      expect(derivePaymentStatus(35000, 0)).toBe("À encaisser");
      expect(derivePaymentStatus(35000, -500)).toBe("À encaisser");
    });

    it("calculates remaining balance ensuring non-negative values", () => {
      expect(calculateRemaining(75000, 50000)).toBe(25000);
      expect(calculateRemaining(25000, 25000)).toBe(0);
      expect(calculateRemaining(25000, 30000)).toBe(0); // Never negative
    });

    it("filters catalog products by search query and category", () => {
      const searchResult = filterProducts(mockPosProducts, "Coca", "Tous");
      expect(searchResult.length).toBe(1);
      expect(searchResult[0].name).toBe("Coca-Cola 50cl");

      const skuResult = filterProducts(mockPosProducts, "NID-400", "Tous");
      expect(skuResult.length).toBe(1);
      expect(skuResult[0].sku).toBe("NID-400");

      const categoryResult = filterProducts(mockPosProducts, "", "Boissons");
      expect(categoryResult.length).toBeGreaterThan(0);
      expect(categoryResult.every((p) => p.category === "Boissons")).toBe(true);
    });

    it("calculates mixed payment allocations correctly", () => {
      const allocations = [
        { id: "a1", method: "cash" as const, amount: 40000 },
        { id: "a2", method: "wave" as const, amount: 60000 },
      ];
      const paid = calculatePaidAmount("mixed", 0, allocations);
      expect(paid).toBe(100000);
      expect(derivePaymentStatus(100000, paid)).toBe("Payée");

      const partialAllocations = [
        { id: "a1", method: "cash" as const, amount: 30000 },
        { id: "a2", method: "wave" as const, amount: 40000 },
      ];
      const partialPaid = calculatePaidAmount("mixed", 0, partialAllocations);
      expect(partialPaid).toBe(70000);
      expect(derivePaymentStatus(100000, partialPaid)).toBe("Partiellement payée");
    });
  });

  describe("POS Component & Workflow Behavior Contracts", () => {
    it("renders page header 'Nouvelle vente', product catalog, and cart empty state initially", () => {
      render(<PosView posState="ready" />);

      expect(screen.getByRole("heading", { level: 1, name: "Nouvelle vente" })).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Rechercher un produit ou un SKU/i)).toBeInTheDocument();
      expect(screen.getAllByText("Votre panier est vide").length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Client comptoir/i).length).toBeGreaterThan(0);
    });

    it("filters products by text search and clears with reset button", () => {
      render(<PosView posState="ready" />);

      const searchInput = screen.getByPlaceholderText(/Rechercher un produit ou un SKU/i);
      fireEvent.change(searchInput, { target: { value: "NonexistentProduct123" } });

      expect(
        screen.getByText("Aucun produit ne correspond à votre recherche")
      ).toBeInTheDocument();

      const resetBtn = screen.getByRole("button", { name: /Réinitialiser la recherche/i });
      fireEvent.click(resetBtn);

      expect(screen.getByText("Coca-Cola 50cl")).toBeInTheDocument();
    });

    it("filters products by category buttons", () => {
      render(<PosView posState="ready" />);

      const drinksBtn = screen.getByRole("button", { name: /Catégorie Boissons/i });
      fireEvent.click(drinksBtn);

      expect(screen.getByText("Coca-Cola 50cl")).toBeInTheDocument();
      expect(screen.queryByText("Riz Parfumé 5kg")).not.toBeInTheDocument();
    });

    it("adds available product to cart and updates subtotal and total", () => {
      render(<PosView posState="ready" />);

      const addCocaBtn = screen.getByRole("button", { name: /Ajouter 1 Coca-Cola 50cl/i });
      fireEvent.click(addCocaBtn);

      expect(screen.queryByText("Votre panier est vide")).not.toBeInTheDocument();
      expect(screen.getAllByText("Coca-Cola 50cl").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Total à payer").length).toBeGreaterThan(0);
      expect(screen.getAllByText("500 FCFA").length).toBeGreaterThan(0);
    });

    it("prevents adding out of stock products to cart", () => {
      render(<PosView posState="ready" />);

      expect(screen.getAllByText("Rupture de stock").length).toBeGreaterThan(0);
      const disabledAddBtn = screen.getByRole("button", { name: /Ajouter 1 Biscuits Chocolat 100g/i });
      expect(disabledAddBtn).toBeDisabled();
    });

    it("prevents incrementing cart quantity beyond available stock", () => {
      render(<PosView posState="ready" />);

      const addNidoBtn = screen.getByRole("button", { name: /Ajouter 1 Lait Nido 400g/i });
      fireEvent.click(addNidoBtn);
      fireEvent.click(addNidoBtn);
      fireEvent.click(addNidoBtn);

      const incBtn = screen.getAllByRole("button", { name: /Augmenter la quantité de Lait Nido 400g/i })[0];
      expect(incBtn).toBeDisabled();
      expect(screen.getAllByText("Stock max (3)").length).toBeGreaterThan(0);
    });

    it("removes line item when clicking remove action", () => {
      render(<PosView posState="ready" />);

      const addCocaBtn = screen.getByRole("button", { name: /Ajouter 1 Coca-Cola 50cl/i });
      fireEvent.click(addCocaBtn);

      const removeBtn = screen.getAllByRole("button", { name: /Supprimer Coca-Cola 50cl du panier/i })[0];
      fireEvent.click(removeBtn);

      expect(screen.getAllByText("Votre panier est vide").length).toBeGreaterThan(0);
    });

    it("allows registered customer selection", () => {
      render(<PosView posState="ready" />);

      const customerSelect = screen.getAllByLabelText(/Sélectionner un client pour la vente/i)[0];
      fireEvent.change(customerSelect, { target: { value: "Awa Traoré" } });

      expect(screen.getAllByText(/Awa Traoré/i).length).toBeGreaterThan(0);
    });

    it("handles Full Payment checkout flow and derives 'Payée' status", () => {
      render(<PosView posState="ready" />);

      // 1. Add product (Coca-Cola 500 FCFA)
      fireEvent.click(screen.getByRole("button", { name: /Ajouter 1 Coca-Cola 50cl/i }));

      // 2. Click proceed to checkout
      const proceedBtn = screen.getAllByRole("button", { name: /Continuer vers le paiement/i })[0];
      fireEvent.click(proceedBtn);

      // 3. Select payment method Espèces
      const cashBtn = screen.getAllByRole("button", { name: /Sélectionner le mode de paiement Espèces/i })[0];
      fireEvent.click(cashBtn);

      // 4. Verify derived payment status badge 'Payée'
      expect(screen.getAllByText("Payée").length).toBeGreaterThan(0);

      // 5. Click confirm sale
      const confirmBtn = screen.getAllByRole("button", { name: /Confirmer la vente/i })[0];
      fireEvent.click(confirmBtn);

      // 6. Verify Success View
      expect(screen.getByText("Vente enregistrée")).toBeInTheDocument();
      expect(screen.getAllByText("500 FCFA").length).toBeGreaterThan(0);
    });

    it("handles Partial Payment checkout flow and derives 'Partiellement payée' status", () => {
      render(<PosView posState="ready" />);

      // Add product (Lait Nido 4500 FCFA)
      fireEvent.click(screen.getByRole("button", { name: /Ajouter 1 Lait Nido 400g/i }));

      const proceedBtn = screen.getAllByRole("button", { name: /Continuer vers le paiement/i })[0];
      fireEvent.click(proceedBtn);

      const waveBtn = screen.getAllByRole("button", { name: /Sélectionner le mode de paiement Wave/i })[0];
      fireEvent.click(waveBtn);

      // Set paid amount input to 2000 FCFA
      const paidInput = screen.getAllByLabelText(/Montant perçu en FCFA/i)[0];
      fireEvent.change(paidInput, { target: { value: "2000" } });

      expect(screen.getAllByText("Partiellement payée").length).toBeGreaterThan(0);

      const confirmBtn = screen.getAllByRole("button", { name: /Confirmer la vente/i })[0];
      fireEvent.click(confirmBtn);

      expect(screen.getByText("Vente enregistrée")).toBeInTheDocument();
      expect(screen.getAllByText("Partiellement payée").length).toBeGreaterThan(0);
      expect(screen.getAllByText("2 000 FCFA").length).toBeGreaterThan(0); // Paid
      expect(screen.getAllByText("2 500 FCFA").length).toBeGreaterThan(0); // Remaining
    });

    it("handles Credit Sale checkout flow and derives 'À encaisser' status", () => {
      render(<PosView posState="ready" />);

      fireEvent.click(screen.getByRole("button", { name: /Ajouter 1 Coca-Cola 50cl/i }));

      const proceedBtn = screen.getAllByRole("button", { name: /Continuer vers le paiement/i })[0];
      fireEvent.click(proceedBtn);

      const creditBtn = screen.getAllByRole("button", { name: /Sélectionner le mode de paiement Crédit/i })[0];
      fireEvent.click(creditBtn);

      expect(screen.getAllByText("À encaisser").length).toBeGreaterThan(0);

      const confirmBtn = screen.getAllByRole("button", { name: /Confirmer la vente/i })[0];
      fireEvent.click(confirmBtn);

      expect(screen.getByText("Vente enregistrée")).toBeInTheDocument();
      expect(screen.getAllByText("À encaisser").length).toBeGreaterThan(0);
    });

    it("resets POS to clean initial state when clicking 'Nouvelle vente' on success view", () => {
      render(<PosView posState="ready" />);

      fireEvent.click(screen.getByRole("button", { name: /Ajouter 1 Coca-Cola 50cl/i }));
      fireEvent.click(screen.getAllByRole("button", { name: /Continuer vers le paiement/i })[0]);
      fireEvent.click(screen.getAllByRole("button", { name: /Sélectionner le mode de paiement Espèces/i })[0]);
      fireEvent.click(screen.getAllByRole("button", { name: /Confirmer la vente/i })[0]);

      expect(screen.getByText("Vente enregistrée")).toBeInTheDocument();

      const newSaleBtn = screen.getByRole("button", { name: /Nouvelle vente/i });
      fireEvent.click(newSaleBtn);

      expect(screen.getAllByText("Votre panier est vide").length).toBeGreaterThan(0);
    });
  });

  describe("POS Auxiliary UI States (Loading, Error, Empty Catalog)", () => {
    it("renders skeleton loading state for posState='loading'", () => {
      const { container } = render(<PosView posState="loading" />);
      const skeletons = container.querySelectorAll(".animate-pulse");
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it("renders local section error with accessible retry action for posState='error'", () => {
      render(<PosView posState="error" />);
      expect(screen.getByText("Erreur de chargement du point de vente")).toBeInTheDocument();
      const retryBtn = screen.getByRole("link", { name: /Réessayer/i });
      expect(retryBtn).toBeInTheDocument();
      expect(retryBtn).toHaveAttribute("href", "/ventes/nouvelle");
    });

    it("renders guided empty catalog state for posState='empty-catalog'", () => {
      render(<PosView posState="empty-catalog" />);
      expect(screen.getByText("Aucun produit disponible dans le catalogue")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Gérer mes produits/i })).toBeInTheDocument();
    });
  });
});
