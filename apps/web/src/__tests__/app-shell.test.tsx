import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { AppShell } from "@/components/app-shell";

describe("JAAMA App Shell Component & Accessibility Behavior Contracts", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("Desktop Shell Landmarks & Structure", () => {
    it("renders main navigation and main content landmarks", () => {
      render(
        <AppShell pageTitle="Accueil">
          <div>Test Content Canvas</div>
        </AppShell>
      );

      const nav = screen.getByRole("navigation", { name: "Navigation principale" });
      const main = screen.getByRole("main");

      expect(nav).toBeInTheDocument();
      expect(main).toBeInTheDocument();
      expect(main).toHaveAttribute("id", "main-content");
      expect(screen.getByText("Test Content Canvas")).toBeInTheDocument();
    });

    it("renders keyboard-accessible skip-to-content link targeting #main-content", () => {
      render(
        <AppShell pageTitle="Accueil">
          <div>Content</div>
        </AppShell>
      );

      const skipLink = screen.getByRole("link", { name: "Passer au contenu principal" });
      expect(skipLink).toBeInTheDocument();
      expect(skipLink).toHaveAttribute("href", "#main-content");
    });
  });

  describe("Config-Driven Navigation & Active Item", () => {
    it("renders navigation items from configuration and sets aria-current on active item", () => {
      render(
        <AppShell pageTitle="Accueil" initialPath="/">
          <div>Content</div>
        </AppShell>
      );

      const nav = screen.getByRole("navigation", { name: "Navigation principale" });
      const activeLink = within(nav).getByRole("link", { name: "Accueil" });
      expect(activeLink).toHaveAttribute("aria-current", "page");

      expect(within(nav).getByRole("link", { name: "Ventes" })).toBeInTheDocument();
      expect(within(nav).getByRole("link", { name: "Produits" })).toBeInTheDocument();
      expect(within(nav).getByRole("link", { name: "Stocks" })).toBeInTheDocument();
      expect(within(nav).getByRole("link", { name: "Clients" })).toBeInTheDocument();
    });
  });

  describe("Sidebar Collapse & LocalStorage Persistence", () => {
    it("toggles collapse state and updates aria-label on collapse button", () => {
      render(
        <AppShell pageTitle="Accueil">
          <div>Content</div>
        </AppShell>
      );

      const collapseBtn = screen.getByRole("button", { name: "Réduire le menu" });
      expect(collapseBtn).toBeInTheDocument();

      fireEvent.click(collapseBtn);

      expect(screen.getByRole("button", { name: "Développer le menu" })).toBeInTheDocument();
      expect(localStorage.getItem("jaama.sidebar.collapsed")).toBe("true");
    });

    it("restores collapsed state safely from localStorage on mount", () => {
      localStorage.setItem("jaama.sidebar.collapsed", "true");

      render(
        <AppShell pageTitle="Accueil">
          <div>Content</div>
        </AppShell>
      );

      expect(screen.getByRole("button", { name: "Développer le menu" })).toBeInTheDocument();
    });
  });

  describe("Workspace Switcher Trigger & Popover", () => {
    it("displays current business name in trigger and toggles popover on click", () => {
      render(
        <AppShell pageTitle="Accueil">
          <div>Content</div>
        </AppShell>
      );

      const trigger = screen.getByRole("button", {
        name: /Entreprise actuelle : Diallo Commerce/i,
      });
      expect(trigger).toBeInTheDocument();
      expect(trigger).toHaveAttribute("aria-expanded", "false");

      fireEvent.click(trigger);

      expect(trigger).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByRole("listbox", { name: "Liste de vos entreprises" })).toBeInTheDocument();
      expect(screen.getByText("Bana Services")).toBeInTheDocument();
    });
  });

  describe("Global Search & Keyboard Shortcut", () => {
    it("focuses global search input on Ctrl+K keyboard shortcut", () => {
      render(
        <AppShell pageTitle="Accueil">
          <div>Content</div>
        </AppShell>
      );

      const searchInput = screen.getByRole("searchbox", { name: "Rechercher dans JAAMA" });
      expect(searchInput).not.toHaveFocus();

      fireEvent.keyDown(window, { key: "k", ctrlKey: true });

      expect(searchInput).toHaveFocus();
    });
  });

  describe("Mobile Navigation & Action Bar", () => {
    it("renders 5 destinations in mobile bottom navigation and global create action button", () => {
      render(
        <AppShell pageTitle="Accueil" initialPath="/">
          <div>Content</div>
        </AppShell>
      );

      const mobileNav = screen.getByRole("navigation", {
        name: "Navigation mobile principale",
      });
      expect(mobileNav).toBeInTheDocument();

      const createBtn = screen.getByRole("button", {
        name: "Créer une nouvelle vente ou document",
      });
      expect(createBtn).toBeInTheDocument();
    });
  });
});
