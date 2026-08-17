import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { formatMoney, formatTrend } from "../features/dashboard/dashboard.utils";
import { DashboardView } from "../features/dashboard/components/DashboardView";
import { mockPopulatedSnapshot } from "../features/dashboard/dashboard.mock";

describe("JAAMA Dashboard V1 — Domain & Component Behavior Contracts", () => {
  describe("Money & Trend Formatters (formatMoney, formatTrend)", () => {
    it("formats 425000 into '425 000 FCFA' without decimals", () => {
      expect(formatMoney(425000)).toBe("425 000 FCFA");
    });

    it("formats 0 into '0 FCFA'", () => {
      expect(formatMoney(0)).toBe("0 FCFA");
    });

    it("formats semantic numeric percentage trend into '+12,5 %'", () => {
      expect(
        formatTrend({
          value: 12.5,
          direction: "up",
          format: "percentage",
          periodContext: "vs hier",
        })
      ).toBe("+12,5 %");
    });

    it("formats semantic numeric absolute trend into '+3'", () => {
      expect(
        formatTrend({
          value: 3,
          direction: "up",
          format: "absolute",
          periodContext: "vs hier",
        })
      ).toBe("+3");
    });
  });

  describe("Populated Dashboard State", () => {
    it("renders personalized greeting and business context", () => {
      render(<DashboardView stateMode="populated" />);

      expect(screen.getByRole("heading", { name: /Bonjour Hamidou/i })).toBeInTheDocument();
      expect(screen.getAllByText(/Diallo Commerce/i).length).toBeGreaterThan(0);
    });

    it("renders 4 primary KPI cards with underlying numeric trend data formatted properly", () => {
      // Verify underlying mock model is numeric
      expect(typeof mockPopulatedSnapshot.metrics.todaySales.trend?.value).toBe("number");
      expect(mockPopulatedSnapshot.metrics.todaySales.trend?.value).toBe(12.5);
      expect(mockPopulatedSnapshot.metrics.salesCount.trend?.value).toBe(3);

      render(<DashboardView stateMode="populated" />);

      expect(screen.getByText("VENTES AUJOURD’HUI")).toBeInTheDocument();
      expect(screen.getAllByText("425 000 FCFA").length).toBeGreaterThan(0);
      expect(screen.getByText("+12,5 %")).toBeInTheDocument();

      expect(screen.getByText("NOMBRE DE VENTES")).toBeInTheDocument();
      expect(screen.getByText("24 ventes")).toBeInTheDocument();
      expect(screen.getByText("+3")).toBeInTheDocument();

      expect(screen.getByText("À ENCAISSER")).toBeInTheDocument();
      expect(screen.getAllByText("175 000 FCFA").length).toBeGreaterThan(0);

      expect(screen.getByText("STOCK À SURVEILLER")).toBeInTheDocument();
      expect(screen.getByText("6 produits")).toBeInTheDocument();
    });

    it("renders Recent Sales table with CANONICAL SIX HEADERS", () => {
      render(<DashboardView stateMode="populated" />);

      const tableHeaders = screen.getAllByRole("columnheader");
      const headerTexts = tableHeaders.map((th) => th.textContent?.trim());
      
      // Verification of exactly six canonical headers
      expect(headerTexts).toEqual([
        "Référence",
        "Client",
        "Montant",
        "Encaissé",
        "Statut paiement",
        "Heure",
      ]);
    });

    it("renders partial payment explicitly exposing Montant (75 000 FCFA) and Encaissé (50 000 FCFA)", () => {
      render(<DashboardView stateMode="populated" />);

      expect(screen.getAllByText("VTE-0023").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Awa Traoré").length).toBeGreaterThan(0);
      expect(screen.getAllByText("75 000 FCFA").length).toBeGreaterThan(0);
      expect(screen.getAllByText("50 000 FCFA").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Partiellement payée").length).toBeGreaterThan(0);
    });

    it("renders unpaid sale explicitly exposing Montant (35 000 FCFA) and Encaissé (0 FCFA)", () => {
      render(<DashboardView stateMode="populated" />);

      expect(screen.getAllByText("VTE-0022").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Moussa Diallo").length).toBeGreaterThan(0);
      expect(screen.getAllByText("35 000 FCFA").length).toBeGreaterThan(0);
      expect(screen.getAllByText("0 FCFA").length).toBeGreaterThan(0);
      expect(screen.getAllByText("À encaisser").length).toBeGreaterThan(0);
    });

    it("renders Quick Action 'Nouvelle vente' without describing itself as an encaissement", () => {
      render(<DashboardView stateMode="populated" />);

      expect(screen.getByText("Nouvelle vente")).toBeInTheDocument();
      expect(screen.getByText("Enregistrer une nouvelle vente")).toBeInTheDocument();
      expect(screen.queryByText("Enregistrer un encaissement direct")).not.toBeInTheDocument();
    });
  });

  describe("Guided Empty State (Brand New Business)", () => {
    it("renders onboarding guidance without a sea of zeros and without a manual [J] monogram mark", () => {
      render(<DashboardView stateMode="empty" />);

      expect(screen.getByRole("heading", { name: /Bienvenue dans JAAMA, Hamidou !/i })).toBeInTheDocument();
      expect(screen.getByText(/Démarrez l'activité de votre entreprise/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Ajouter mes produits/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Créer ma première vente/i })).toBeInTheDocument();

      // Verify no fake [J] text monogram is rendered
      expect(screen.queryByText("J")).not.toBeInTheDocument();
      expect(screen.queryByText("VENTES AUJOURD’HUI")).not.toBeInTheDocument();
    });
  });

  describe("Loading State", () => {
    it("renders skeleton structure matching dashboard geometry", () => {
      const { container } = render(<DashboardView stateMode="loading" />);

      const skeletons = container.querySelectorAll(".animate-pulse");
      expect(skeletons.length).toBeGreaterThan(0);
      expect(screen.queryByText("VENTES AUJOURD’HUI")).not.toBeInTheDocument();
    });
  });

  describe("Partial Error State", () => {
    it("renders section-level error with retry button while keeping other sections intact", () => {
      render(<DashboardView stateMode="partial-error" />);

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
});
