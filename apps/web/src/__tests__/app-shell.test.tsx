import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { AppShell } from "@/components/app-shell";
import { shellMockData } from "@/config/shell-mock.data";
import {
  getPageTitle,
  isRouteActive,
  getMobileBottomNavDestinations,
  navigationConfig,
} from "@/config/navigation.config";

// Mock next/navigation usePathname
let mockPathname = "/";
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

describe("JAAMA App Shell Final Contract Cleanup & Routing", () => {
  beforeEach(() => {
    localStorage.clear();
    mockPathname = "/";
  });

  describe("Canonical Route Matching Helper (isRouteActive)", () => {
    it("matches exact root '/' route only when pathname is '/'", () => {
      expect(isRouteActive("/", "/")).toBe(true);
      expect(isRouteActive("/ventes", "/")).toBe(false);
      expect(isRouteActive("/produits", "/")).toBe(false);
    });

    it("matches sub-routes and deep links correctly", () => {
      expect(isRouteActive("/ventes", "/ventes")).toBe(true);
      expect(isRouteActive("/ventes/123", "/ventes")).toBe(true);
      expect(isRouteActive("/ventes/nouvelle", "/ventes")).toBe(true);
      expect(isRouteActive("/ventes-speciales", "/ventes")).toBe(false);
    });
  });

  describe("Route Awareness & Dynamic Page Context", () => {
    it("activates Ventes for deep link /ventes/123", () => {
      mockPathname = "/ventes/123";

      const { container } = render(
        <AppShell>
          <div>Content Canvas</div>
        </AppShell>
      );

      const ventesLink = container.querySelector('a[href="/ventes"]');
      const accueilLink = container.querySelector('a[href="/"]');

      expect(ventesLink).toHaveAttribute("aria-current", "page");
      expect(accueilLink).not.toHaveAttribute("aria-current");
      expect(getPageTitle("/ventes/123")).toBe("Ventes");
    });
  });

  describe("Desktop Navigation & Plus Module", () => {
    it("includes Desktop Plus module in navigation configuration", () => {
      const allItems = navigationConfig.flatMap((g) => g.items);
      const plusItem = allItems.find((i) => i.href === "/menu");

      expect(plusItem).toBeDefined();
      expect(plusItem?.label).toBe("Plus");
    });
  });

  describe("Canonical Mobile Navigation Derivation", () => {
    it("derives mobile bottom nav destinations from canonical navigation configuration", () => {
      const destinations = getMobileBottomNavDestinations();
      expect(destinations.length).toBe(5);

      const labels = destinations.map((d) => d.label);
      expect(labels).toEqual(["Accueil", "Ventes", "Produits", "Clients", "Plus"]);
    });

    it("applies safe-area inset styles to mobile bottom nav container", () => {
      const { container } = render(
        <AppShell>
          <div>Content</div>
        </AppShell>
      );

      const mobileNav = container.querySelector('nav[aria-label="Navigation mobile principale"]');
      expect(mobileNav).not.toBeNull();
      expect(mobileNav?.className).toContain("safe-area-inset-bottom");
    });
  });

  describe("Responsive Header & Collapse Controls", () => {
    it("hides SidebarCollapseButton on tablet below lg breakpoint", () => {
      const { container } = render(
        <AppShell>
          <div>Content</div>
        </AppShell>
      );

      const collapseWrapper = container.querySelector('.hidden.lg\\:block button[aria-label="Réduire le menu"]')?.parentElement;
      expect(collapseWrapper).toHaveClass("hidden", "lg:block");
    });

    it("renders official logo image asset without manual J substitute", () => {
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
    });
  });
});
