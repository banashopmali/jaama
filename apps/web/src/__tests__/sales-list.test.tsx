import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { formatMoney, getPaymentMethodLabel, filterSales, calculateSalesSummary } from "../features/sales/sales.utils";
import { SalesListView } from "../features/sales/components/SalesListView";
import { mockPopulatedSales } from "../features/sales/sales.mock";
import { SaleListItem } from "../features/sales/sales.types";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/ventes",
  useSearchParams: () => ({
    get: (key: string) => null,
  }),
}));

describe("JAAMA Sales List V1 — Domain & Component Behavior Contracts (JAA-S0-05)", () => {
  describe("Domain & Utility Helpers (formatMoney, getPaymentMethodLabel, filterSales)", () => {
    it("formats 1425000 into '1 425 000 FCFA' without floating point bugs", () => {
      expect(formatMoney(1425000)).toBe("1 425 000 FCFA");
      expect(formatMoney(0)).toBe("0 FCFA");
    });

    it("translates semantic payment methods into user-facing labels", () => {
      expect(getPaymentMethodLabel("cash")).toBe("Espèces");
      expect(getPaymentMethodLabel("wave")).toBe("Wave");
      expect(getPaymentMethodLabel("orange_money")).toBe("Orange Money");
      expect(getPaymentMethodLabel("credit")).toBe("Crédit");
    });

    it("filters sales by search query (reference or customer name)", () => {
      const filteredRef = filterSales(mockPopulatedSales, {
        searchQuery: "VTE-0023",
        paymentStatus: "all",
        paymentMethod: "all",
        saleStatus: "all",
      });
      expect(filteredRef.length).toBe(1);
      expect(filteredRef[0].reference).toBe("VTE-0023");

      const filteredCustomer = filterSales(mockPopulatedSales, {
        searchQuery: "Awa",
        paymentStatus: "all",
        paymentMethod: "all",
        saleStatus: "all",
      });
      expect(filteredCustomer.length).toBe(1);
      expect(filteredCustomer[0].customer.name).toBe("Awa Traoré");
    });

    it("filters sales by payment status and payment method", () => {
      const partialSales = filterSales(mockPopulatedSales, {
        searchQuery: "",
        paymentStatus: "Partiellement payée",
        paymentMethod: "all",
        saleStatus: "all",
      });
      expect(partialSales.length).toBeGreaterThan(0);
      expect(partialSales.every((s) => s.paymentStatus === "Partiellement payée")).toBe(true);

      const waveSales = filterSales(mockPopulatedSales, {
        searchQuery: "",
        paymentStatus: "all",
        paymentMethod: "wave",
        saleStatus: "all",
      });
      expect(waveSales.length).toBeGreaterThan(0);
      expect(waveSales.every((s) => s.paymentMethod === "wave")).toBe(true);
    });

    it("calculates summary statistics with exact semantic precision (excluding cancelled sales)", () => {
      const sampleSet: SaleListItem[] = [
        {
          id: "s1",
          reference: "VTE-101",
          occurredAt: "17/08/2026 10:00",
          customer: { name: "Client A" },
          itemCount: 2,
          totalAmount: 100000,
          paidAmount: 70000,
          remainingAmount: 30000,
          paymentMethod: "wave",
          paymentStatus: "Partiellement payée",
          saleStatus: "Terminée",
          seller: { id: "u1", name: "Vendor 1" },
        },
        {
          id: "s2",
          reference: "VTE-102",
          occurredAt: "17/08/2026 11:00",
          customer: { name: "Client B" },
          itemCount: 1,
          totalAmount: 50000,
          paidAmount: 0,
          remainingAmount: 0,
          paymentMethod: "cash",
          paymentStatus: "Remboursée",
          saleStatus: "Annulée", // CANCELLED SALE
          seller: { id: "u1", name: "Vendor 1" },
        },
      ];

      const summary = calculateSalesSummary(sampleSet);
      // Cancelled sale s2 MUST NOT inflate counts or amounts
      expect(summary.totalSalesCount).toBe(1);
      expect(summary.totalSalesAmount).toBe(100000);
      expect(summary.totalCollectedAmount).toBe(70000);
      expect(summary.totalToCollectAmount).toBe(30000);
    });
  });

  describe("Mock Data & Business Contract Invariants", () => {
    it("verifies mock dataset respects non-negative values and remaining amount formulas", () => {
      for (const sale of mockPopulatedSales) {
        expect(sale.totalAmount).toBeGreaterThanOrEqual(0);
        expect(sale.paidAmount).toBeGreaterThanOrEqual(0);
        expect(sale.remainingAmount).toBeGreaterThanOrEqual(0);

        if (sale.saleStatus === "Terminée") {
          expect(sale.remainingAmount).toBe(sale.totalAmount - sale.paidAmount);
        }

        if (sale.paymentStatus === "Payée") {
          expect(sale.remainingAmount).toBe(0);
          expect(sale.paidAmount).toBe(sale.totalAmount);
        }

        if (sale.paymentStatus === "À encaisser") {
          expect(sale.paidAmount).toBe(0);
          expect(sale.remainingAmount).toBe(sale.totalAmount);
        }

        if (sale.paymentStatus === "Partiellement payée") {
          expect(sale.paidAmount).toBeGreaterThan(0);
          expect(sale.remainingAmount).toBeGreaterThan(0);
        }
      }
    });

    it("verifies cancelled sale VTE-0017 has remainingAmount === 0 and is not presented as receivable", () => {
      const cancelledSale = mockPopulatedSales.find((s) => s.reference === "VTE-0017");
      expect(cancelledSale).toBeDefined();
      expect(cancelledSale?.saleStatus).toBe("Annulée");
      expect(cancelledSale?.remainingAmount).toBe(0);
      expect(cancelledSale?.paymentStatus).not.toBe("À encaisser");
    });
  });

  describe("Populated Sales List View", () => {
    it("renders page header, title 'Ventes', subtitle and primary CTA '+ Nouvelle vente'", () => {
      render(<SalesListView salesState="populated" />);

      expect(screen.getByRole("heading", { level: 1, name: "Ventes" })).toBeInTheDocument();
      expect(
        screen.getByText(/Suivez vos ventes, vos encaissements et les montants restant à recevoir/i)
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Nouvelle vente/i })).toBeInTheDocument();
    });

    it("renders exactly 4 summary metric cards with period-level totals", () => {
      render(<SalesListView salesState="populated" />);

      expect(screen.getByText("VENTES")).toBeInTheDocument();
      expect(screen.getByText("24 ventes")).toBeInTheDocument();

      expect(screen.getByText("MONTANT DES VENTES")).toBeInTheDocument();
      expect(screen.getByText("1 425 000 FCFA")).toBeInTheDocument();

      expect(screen.getByText("ENCAISSÉ")).toBeInTheDocument();
      expect(screen.getByText("1 050 000 FCFA")).toBeInTheDocument();

      expect(screen.getByText("À ENCAISSER")).toBeInTheDocument();
      expect(screen.getByText("375 000 FCFA")).toBeInTheDocument();
    });

    it("renders canonical 10 desktop table column headers", () => {
      render(<SalesListView salesState="populated" />);

      const headers = screen.getAllByRole("columnheader").map((th) => th.textContent?.trim());
      expect(headers).toEqual([
        "Référence",
        "Date / heure",
        "Client",
        "Articles",
        "Montant",
        "Encaissé",
        "Mode de paiement",
        "Statut paiement",
        "Vendeur",
        "Actions",
      ]);
    });

    it("preserves SALE != PAYMENT invariant on partial payment (VTE-0023)", () => {
      render(<SalesListView salesState="populated" />);

      expect(screen.getAllByText("VTE-0023").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Awa Traoré").length).toBeGreaterThan(0);
      expect(screen.getAllByText("75 000 FCFA").length).toBeGreaterThan(0);
      expect(screen.getAllByText("50 000 FCFA").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Partiellement payée").length).toBeGreaterThan(0);
    });

    it("renders unpaid sale (VTE-0022) with 0 FCFA collected and 'À encaisser' badge", () => {
      render(<SalesListView salesState="populated" />);

      expect(screen.getAllByText("VTE-0022").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Moussa Diallo").length).toBeGreaterThan(0);
      expect(screen.getAllByText("35 000 FCFA").length).toBeGreaterThan(0);
      expect(screen.getAllByText("0 FCFA").length).toBeGreaterThan(0);
      expect(screen.getAllByText("À encaisser").length).toBeGreaterThan(0);
    });

    it("renders walk-in customers cleanly as 'Client comptoir'", () => {
      render(<SalesListView salesState="populated" />);

      expect(screen.getAllByText("Client comptoir").length).toBeGreaterThan(0);
    });

    it("renders disabled row action buttons with accessible name and title indicating feature is upcoming", () => {
      render(<SalesListView salesState="populated" />);

      const disabledButtons = screen.getAllByRole("button", {
        name: /bientôt disponible/i,
      });
      expect(disabledButtons.length).toBeGreaterThan(0);
      expect(disabledButtons[0]).toBeDisabled();
      expect(disabledButtons[0]).toHaveAttribute("title", "Disponible prochainement");
    });
  });

  describe("Interactive Search & Filtering", () => {
    it("filters sales by search query and updates result count", () => {
      render(<SalesListView salesState="populated" />);

      const searchInput = screen.getByPlaceholderText(/Rechercher une vente/i);
      fireEvent.change(searchInput, { target: { value: "Awa" } });

      expect(screen.getByText("1 vente trouvée")).toBeInTheDocument();
      expect(screen.getAllByText("VTE-0023").length).toBeGreaterThan(0);
      expect(screen.queryByText("VTE-0024")).not.toBeInTheDocument();
    });

    it("filters sales by payment status dropdown", () => {
      render(<SalesListView salesState="populated" />);

      const statusSelect = screen.getByLabelText(/Filtrer par statut de paiement/i);
      fireEvent.change(statusSelect, { target: { value: "Partiellement payée" } });

      expect(screen.getAllByText("Partiellement payée").length).toBeGreaterThan(0);
      expect(screen.queryByText("VTE-0024")).not.toBeInTheDocument();
    });

    it("restores full dataset when clicking 'Réinitialiser'", () => {
      render(<SalesListView salesState="populated" />);

      const searchInput = screen.getByPlaceholderText(/Rechercher une vente/i);
      fireEvent.change(searchInput, { target: { value: "Awa" } });
      expect(screen.queryByText("VTE-0024")).not.toBeInTheDocument();

      const resetBtn = screen.getByRole("button", { name: /Réinitialiser/i });
      fireEvent.click(resetBtn);

      expect(screen.getAllByText("VTE-0024").length).toBeGreaterThan(0);
    });

    it("displays filter-empty state when filters return 0 matches", () => {
      render(<SalesListView salesState="populated" />);

      const searchInput = screen.getByPlaceholderText(/Rechercher une vente/i);
      fireEvent.change(searchInput, { target: { value: "NonexistentName123" } });

      expect(screen.getByText("Aucune vente ne correspond à vos filtres")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Réinitialiser les filtres/i })).toBeInTheDocument();
    });
  });

  describe("Business Empty State (0 Sales)", () => {
    it("renders onboarding empty state WITHOUT 4 zero KPI summary cards", () => {
      render(<SalesListView salesState="empty" />);

      expect(screen.getByText("Aucune vente pour le moment")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Créer ma première vente/i })).toBeInTheDocument();

      // Assert zero KPI summary cards are NOT rendered
      expect(screen.queryByText("VENTES")).not.toBeInTheDocument();
      expect(screen.queryByText("MONTANT DES VENTES")).not.toBeInTheDocument();
      expect(screen.queryByText("ENCAISSÉ")).not.toBeInTheDocument();
      expect(screen.queryByText("À ENCAISSER")).not.toBeInTheDocument();
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });
  });

  describe("Loading & Error States", () => {
    it("renders skeleton loading layout without fake data", () => {
      const { container } = render(<SalesListView salesState="loading" />);

      const skeletons = container.querySelectorAll(".animate-pulse");
      expect(skeletons.length).toBeGreaterThan(0);
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });

    it("renders section-level error with a real accessible retry action", () => {
      render(<SalesListView salesState="error" />);

      expect(screen.getByText("Erreur de chargement des ventes")).toBeInTheDocument();
      const retryAction = screen.getByRole("link", { name: /Réessayer/i });
      expect(retryAction).toBeInTheDocument();
      expect(retryAction).toHaveAttribute("href", "/ventes");
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });
  });
});
