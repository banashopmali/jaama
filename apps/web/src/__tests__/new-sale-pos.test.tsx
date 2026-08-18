import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  calculateAppliedPaidAmount,
  calculateLineTotal,
  calculateRemaining,
  calculateSubtotal,
  calculateTotal,
  derivePaymentStatus,
  filterProducts,
  validatePosCheckout,
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

describe("JAAMA New Sale / POS V1 — Integrity & Behavior Contracts (JAA-S0-06)", () => {
  describe("Pure POS Math & Single Source of Truth Contracts", () => {
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
      expect(calculateTotal(subtotal, 3000)).toBe(0);
    });

    it("derives payment status according to exact business rules", () => {
      expect(derivePaymentStatus(25000, 25000)).toBe("Payée");
      expect(derivePaymentStatus(25000, 30000)).toBe("Payée");
      expect(derivePaymentStatus(75000, 50000)).toBe("Partiellement payée");
      expect(derivePaymentStatus(35000, 0)).toBe("À encaisser");
    });

    it("calculates remaining balance ensuring non-negative values", () => {
      expect(calculateRemaining(75000, 50000)).toBe(25000);
      expect(calculateRemaining(25000, 25000)).toBe(0);
      expect(calculateRemaining(25000, 30000)).toBe(0);
    });

    it("uses calculateAppliedPaidAmount as single source of truth for paid amounts", () => {
      // Cash overpayment: cashReceived 10000 on 8500 total -> applied = 8500
      expect(calculateAppliedPaidAmount("cash", 0, 10000, [], 8500)).toBe(8500);

      // Credit: applied = 0
      expect(calculateAppliedPaidAmount("credit", 0, 0, [], 35000)).toBe(0);

      // Wave single method overpayment clamp: 30000 on 25000 total -> applied = 25000
      expect(calculateAppliedPaidAmount("wave", 30000, 0, [], 25000)).toBe(25000);

      // Mixed allocations: Cash 30000 + Wave 40000 = 70000 on 100000 total
      const allocations = [
        { id: "a1", method: "cash" as const, amount: 30000 },
        { id: "a2", method: "wave" as const, amount: 40000 },
      ];
      expect(calculateAppliedPaidAmount("mixed", 0, 0, allocations, 100000)).toBe(70000);
      expect(calculateRemaining(100000, 70000)).toBe(30000);
      expect(derivePaymentStatus(100000, 70000)).toBe("Partiellement payée");
    });

    it("validates checkout inputs correctly according to payment integrity rules", () => {
      const cart = [{ productId: "p1", sku: "S1", name: "P1", unitPrice: 5000, quantity: 2, maxAvailableStock: 10 }];

      // Non-cash overpayment error
      expect(validatePosCheckout(cart, "wave", 15000, 0, [], 10000)).toBe(
        "Le montant encaissé ne peut pas dépasser le total de la vente."
      );

      // Mixed overpayment error
      const overAllocations = [
        { id: "a1", method: "cash" as const, amount: 60000 },
        { id: "a2", method: "wave" as const, amount: 60000 },
      ];
      expect(validatePosCheckout(cart, "mixed", 0, 0, overAllocations, 100000)).toBe(
        "Le total des règlements ne peut pas dépasser le total de la vente."
      );

      // Mixed zero allocation error
      const zeroAllocations = [
        { id: "a1", method: "cash" as const, amount: 0 },
      ];
      expect(validatePosCheckout(cart, "mixed", 0, 0, zeroAllocations, 100000)).toBe(
        "Chaque mode de règlement doit avoir un montant supérieur à 0 FCFA."
      );

      // Duplicate mixed allocation method error
      const duplicateAllocations = [
        { id: "a1", method: "cash" as const, amount: 30000 },
        { id: "a2", method: "cash" as const, amount: 40000 },
      ];
      expect(validatePosCheckout(cart, "mixed", 0, 0, duplicateAllocations, 100000)).toBe(
        "Un mode de règlement ne peut être utilisé qu’une seule fois."
      );
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

    it("product cards do NOT contain nested interactive controls", () => {
      const { container } = render(<PosView posState="ready" />);
      const buttonRoles = container.querySelectorAll('[role="button"]');
      buttonRoles.forEach((roleEl) => {
        expect(roleEl.querySelector("button")).toBeNull();
      });
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

    it("handles cash overpayment: total 8500 FCFA, cashReceived 10000 FCFA -> paidApplied 8500 FCFA, change 1500 FCFA", () => {
      render(<PosView posState="ready" />);

      const addCocaBtn = screen.getByRole("button", { name: /Ajouter 1 Coca-Cola 50cl/i });
      for (let i = 0; i < 17; i++) {
        fireEvent.click(addCocaBtn);
      }

      const proceedBtn = screen.getAllByRole("button", { name: /Continuer vers le paiement/i })[0];
      fireEvent.click(proceedBtn);

      const cashBtn = screen.getAllByRole("button", { name: /Sélectionner le mode de paiement Espèces/i })[0];
      fireEvent.click(cashBtn);

      const paidInputs = screen.getAllByLabelText("Montant perçu en FCFA");
      paidInputs.forEach((input) => {
        fireEvent.change(input, { target: { value: "10000" } });
      });

      expect(screen.getAllByText(/1 500 FCFA/).length).toBeGreaterThan(0);

      const confirmBtn = screen.getAllByRole("button", { name: /Confirmer la vente/i })[0];
      fireEvent.click(confirmBtn);

      expect(screen.getByText("VTE-0025")).toBeInTheDocument();
      expect(screen.getByText("Vente enregistrée")).toBeInTheDocument();
      expect(screen.getByText("Monnaie rendue au client :")).toBeInTheDocument();
    });

    it("rejects non-cash overpayment confirmation with inline error message", () => {
      render(<PosView posState="ready" />);

      fireEvent.click(screen.getByRole("button", { name: /Ajouter 1 Coca-Cola 50cl/i }));
      fireEvent.click(screen.getAllByRole("button", { name: /Continuer vers le paiement/i })[0]);
      fireEvent.click(screen.getAllByRole("button", { name: /Sélectionner le mode de paiement Wave/i })[0]);

      const paidInputs = screen.getAllByLabelText("Montant perçu en FCFA");
      paidInputs.forEach((input) => {
        fireEvent.change(input, { target: { value: "30000" } });
      });

      const confirmBtn = screen.getAllByRole("button", { name: /Confirmer la vente/i })[0];
      fireEvent.click(confirmBtn);

      expect(
        screen.getAllByText("Le montant encaissé ne peut pas dépasser le total de la vente.").length
      ).toBeGreaterThan(0);
    });

    it("generates deterministic mock reference VTE-0025 on sale confirmation", () => {
      render(<PosView posState="ready" />);

      fireEvent.click(screen.getByRole("button", { name: /Ajouter 1 Coca-Cola 50cl/i }));
      fireEvent.click(screen.getAllByRole("button", { name: /Continuer vers le paiement/i })[0]);
      fireEvent.click(screen.getAllByRole("button", { name: /Sélectionner le mode de paiement Espèces/i })[0]);
      fireEvent.click(screen.getAllByRole("button", { name: /Confirmer la vente/i })[0]);

      expect(screen.getByText("VTE-0025")).toBeInTheDocument();
      expect(screen.getByText("SIMULATION FRONTEND — AUCUNE PERSISTANCE SERVEUR")).toBeInTheDocument();
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
