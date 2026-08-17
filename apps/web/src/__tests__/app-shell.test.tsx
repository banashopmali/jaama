import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { AppShell } from "@/components/app-shell";
import { shellMockData } from "@/config/shell-mock.data";
import { getPageTitle } from "@/config/navigation.config";

// Mock next/navigation usePathname
let mockPathname = "/";
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

describe("JAAMA App Shell Remediated Contracts & Routing", () => {
  beforeEach(() => {
    localStorage.clear();
    mockPathname = "/";
  });

  describe("Route Awareness & Single Source of Truth (usePathname)", () => {
    it("activates Ventes and sets aria-current='page' when pathname is /ventes", () => {
      mockPathname = "/ventes";

      const { container } = render(
        <AppShell>
          <div>Content Canvas</div>
        </AppShell>
      );

      const nav = screen.getByRole("navigation", { name: "Navigation principale" });
      const ventesLink = container.querySelector('a[href="/ventes"]');
      const accueilLink = container.querySelector('a[href="/"]');

      expect(ventesLink).toHaveAttribute("aria-current", "page");
      expect(accueilLink).not.toHaveAttribute("aria-current");
    });

    it("activates Produits and sets aria-current='page' when pathname is /produits", () => {
      mockPathname = "/produits";

      const { container } = render(
        <AppShell>
          <div>Content Canvas</div>
        </AppShell>
      );

      const produitsLink = container.querySelector('a[href="/produits"]');
      const accueilLink = container.querySelector('a[href="/"]');

      expect(produitsLink).toHaveAttribute("aria-current", "page");
      expect(accueilLink).not.toHaveAttribute("aria-current");
    });
  });

  describe("Dynamic Page Context Strategy", () => {
    it("resolves exact page titles from pathname without manual props", () => {
      expect(getPageTitle("/")).toBe("Accueil");
      expect(getPageTitle("/ventes")).toBe("Ventes");
      expect(getPageTitle("/produits")).toBe("Produits");
      expect(getPageTitle("/stocks")).toBe("Stocks");
      expect(getPageTitle("/clients")).toBe("Clients");
      expect(getPageTitle("/factures")).toBe("Factures & devis");
      expect(getPageTitle("/paiements")).toBe("Paiements");
      expect(getPageTitle("/rapports")).toBe("Rapports");
      expect(getPageTitle("/parametres")).toBe("Paramètres");
      expect(getPageTitle("/aide")).toBe("Aide & support");
    });
  });

  describe("Responsive Mobile / Desktop Chrome Contract", () => {
    it("ensures Topbar is hidden on mobile (hidden md:flex) and MobileHeader is md:hidden", () => {
      mockPathname = "/";

      const { container } = render(
        <AppShell>
          <div>Content</div>
        </AppShell>
      );

      const headers = container.querySelectorAll("header");
      expect(headers.length).toBe(2);

      // Mobile Header
      const mobileHeader = headers[0];
      expect(mobileHeader).toHaveClass("md:hidden");

      // Desktop Topbar
      const desktopTopbar = headers[1];
      expect(desktopTopbar).toHaveClass("hidden", "md:flex");
    });
  });

  describe("Official JAAMA Logo Contract", () => {
    it("renders official logo image asset in SidebarHeader and MobileHeader without manual J substitute", () => {
      render(
        <AppShell>
          <div>Content</div>
        </AppShell>
      );

      const logoImages = screen.getAllByAltText("JAAMA");
      expect(logoImages.length).toBeGreaterThanOrEqual(2);

      logoImages.forEach((img) => {
        expect(img.getAttribute("src")).toContain("jaama_logo.jpeg");
      });
    });
  });

  describe("Mock Authority Cleanup", () => {
    it("does not claim fake authorization roles or permissions in mock data", () => {
      expect(shellMockData.currentUser).toEqual({
        firstName: "Hamidou",
        initials: "HB",
      });
      // @ts-expect-error role should be removed
      expect(shellMockData.currentUser.role).toBeUndefined();
    });
  });

  describe("Sidebar Collapse & LocalStorage Persistence", () => {
    it("toggles collapse state and updates localStorage", () => {
      render(
        <AppShell>
          <div>Content</div>
        </AppShell>
      );

      const collapseBtn = screen.getByRole("button", { name: "Réduire le menu" });
      fireEvent.click(collapseBtn);

      expect(screen.getByRole("button", { name: "Développer le menu" })).toBeInTheDocument();
      expect(localStorage.getItem("jaama.sidebar.collapsed")).toBe("true");
    });
  });
});
