import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { formatMoney } from "../features/dashboard/dashboard.utils";
import { DashboardView } from "../features/dashboard/components/DashboardView";
import { mockPopulatedSnapshot } from "../features/dashboard/dashboard.mock";

// Mock next/navigation
let mockSearchParamsValue = "";
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useSearchParams: () => ({
    get: (key: string) => {
      if (key === "dashboardState") return mockSearchParamsValue || null;
      return null;
    },
  }),
}));

describe("JAAMA Dashboard V1 — Domain & Component Behavior Contracts", () => {
  beforeEach(() => {
    mockSearchParamsValue = "";
  });

  describe("Money Formatter Helper (formatMoney)", () => {
    it("formats 425000 into '425 000 FCFA' without decimals", () => {
      expect(formatMoney(425000)).toBe("425 000 FCFA");
    });

    it("formats 0 into '0 FCFA'", () => {
      expect(formatMoney(0)).toBe("0 FCFA");
    });

    it("handles large amounts cleanly", () => {
      expect(formatMoney(1250000)).toBe("1 250 000 FCFA");
    });
  });

  describe("Populated Dashboard State", () => {
    it("renders personalized greeting and business context", () => {
      render(<DashboardView initialStateMode="populated" />);

      expect(screen.getByRole("heading", { name: /Bonjour Hamidou/i })).toBeInTheDocument();
      expect(screen.getAllByText(/Diallo Commerce/i).length).toBeGreaterThan(0);
    });

    it("renders exactly 4 primary KPI cards with correct formatted values", () => {
      render(<DashboardView initialStateMode="populated" />);

      expect(screen.getByText("VENTES AUJOURD’HUI")).toBeInTheDocument();
      expect(screen.getAllByText("425 000 FCFA").length).toBeGreaterThan(0);

      expect(screen.getByText("NOMBRE DE VENTES")).toBeInTheDocument();
      expect(screen.getByText("24 ventes")).toBeInTheDocument();

      expect(screen.getByText("À ENCAISSER")).toBeInTheDocument();
      expect(screen.getAllByText("175 000 FCFA").length).toBeGreaterThan(0);

      expect(screen.getByText("STOCK À SURVEILLER")).toBeInTheDocument();
      expect(screen.getByText("6 produits")).toBeInTheDocument();
    });

    it("renders 7-day Sales Trend chart with accessible summary", () => {
      render(<DashboardView initialStateMode="populated" />);

      const chart = screen.getByRole("img", {
        name: mockPopulatedSnapshot.salesTrend.summaryText,
      });
      expect(chart).toBeInTheDocument();
      expect(screen.getByText("Évolution des ventes")).toBeInTheDocument();
    });

    it("renders actionable items inside Attention Panel ('À surveiller')", () => {
      render(<DashboardView initialStateMode="populated" />);

      expect(screen.getByText("À surveiller")).toBeInTheDocument();
      expect(screen.getByText("4 ventes à encaisser")).toBeInTheDocument();
      expect(screen.getByText("6 produits en stock faible")).toBeInTheDocument();
      expect(screen.getByText("2 factures en retard")).toBeInTheDocument();
    });

    it("renders Recent Sales preserving SALE != PAYMENT distinction", () => {
      render(<DashboardView initialStateMode="populated" />);

      expect(screen.getByText("Ventes récentes")).toBeInTheDocument();
      expect(screen.getAllByText("VTE-0024").length).toBeGreaterThan(0);
      expect(screen.getAllByText("VTE-0023").length).toBeGreaterThan(0);

      // Verify partial payment details (Total 75 000, Paid 50 000, Remaining 25 000)
      expect(screen.getAllByText(/Partiellement payée/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/75 000 FCFA/i).length).toBeGreaterThan(0);
    });

    it("renders contextual Quick Actions shortcuts", () => {
      render(<DashboardView initialStateMode="populated" />);

      expect(screen.getByText("Actions rapides")).toBeInTheDocument();
      expect(screen.getByText("Nouvelle vente")).toBeInTheDocument();
      expect(screen.getByText("Ajouter un produit")).toBeInTheDocument();
      expect(screen.getByText("Créer une facture")).toBeInTheDocument();
    });
  });

  describe("Guided Empty State (Brand New Business)", () => {
    it("renders onboarding guidance and setup actions instead of a sea of zeros", () => {
      render(<DashboardView initialStateMode="empty" />);

      expect(screen.getByRole("heading", { name: /Bienvenue dans JAAMA, Hamidou !/i })).toBeInTheDocument();
      expect(screen.getByText(/Démarrez l'activité de votre entreprise/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Ajouter mes produits/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Créer ma première vente/i })).toBeInTheDocument();

      // Verify that primary populated metrics grid is not displayed
      expect(screen.queryByText("VENTES AUJOURD’HUI")).not.toBeInTheDocument();
    });
  });

  describe("Loading State", () => {
    it("renders skeleton structure matching dashboard geometry", () => {
      const { container } = render(<DashboardView initialStateMode="loading" />);

      const skeletons = container.querySelectorAll(".animate-pulse");
      expect(skeletons.length).toBeGreaterThan(0);
      expect(screen.queryByText("VENTES AUJOURD’HUI")).not.toBeInTheDocument();
    });
  });

  describe("Partial Error State", () => {
    it("renders section-level error with retry button while keeping other sections intact", () => {
      render(<DashboardView initialStateMode="partial-error" />);

      // Section-level error alert for Sales Trend
      expect(screen.getByText("Évolution des ventes indisponible")).toBeInTheDocument();
      const retryBtn = screen.getByRole("button", { name: /Réessayer/i });
      expect(retryBtn).toBeInTheDocument();

      // Unaffected sections remain fully functional
      expect(screen.getByText("VENTES AUJOURD’HUI")).toBeInTheDocument();
      expect(screen.getByText("À surveiller")).toBeInTheDocument();
      expect(screen.getByText("Ventes récentes")).toBeInTheDocument();

      // Click retry restores the chart
      fireEvent.click(retryBtn);
      expect(screen.queryByText("Évolution des ventes indisponible")).not.toBeInTheDocument();
      expect(screen.getByText("Évolution des ventes")).toBeInTheDocument();
    });
  });

  describe("Accessibility Baseline", () => {
    it("includes proper heading hierarchy and desktop table column headers", () => {
      render(<DashboardView initialStateMode="populated" />);

      const mainHeader = screen.getByRole("heading", { level: 1, name: /Bonjour Hamidou/i });
      expect(mainHeader).toBeInTheDocument();

      const tableHeaders = screen.getAllByRole("columnheader");
      const headerTexts = tableHeaders.map((th) => th.textContent?.trim());
      expect(headerTexts).toEqual(["Référence", "Client", "Montant Total", "Statut Paiement", "Heure"]);
    });
  });
});
