import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { Button } from "../Button";
import { IconButton } from "../IconButton";
import { Input } from "../Input";
import { Checkbox } from "../Checkbox";
import { Badge } from "../Badge";
import { Alert } from "../Alert";

describe("@jaama/ui Component Behavior Contracts (Rendered DOM)", () => {
  describe("Button Component", () => {
    it("renders children in the DOM", () => {
      render(<Button>Commencer gratuitement</Button>);
      const button = screen.getByRole("button", { name: "Commencer gratuitement" });
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent("Commencer gratuitement");
    });

    it("defaults to type='button'", () => {
      render(<Button>Soumettre</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("type", "button");
    });

    it("renders disabled button when disabled prop is true", () => {
      render(<Button disabled>Action désactivée</Button>);
      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
    });

    it("renders disabled button and loading spinner when isLoading is true", () => {
      render(<Button isLoading>Chargement en cours</Button>);
      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
      expect(button.querySelector("svg")).toBeInTheDocument();
    });
  });

  describe("IconButton Component", () => {
    it("renders accessible button with provided aria-label", () => {
      render(
        <IconButton
          aria-label="Fermer le dialogue"
          icon={<span data-testid="icon-span">X</span>}
        />
      );
      const button = screen.getByRole("button", { name: "Fermer le dialogue" });
      expect(button).toBeInTheDocument();
      expect(screen.getByTestId("icon-span")).toBeInTheDocument();
    });

    it("disables button when isLoading or disabled prop is true", () => {
      render(
        <IconButton
          aria-label="Chargement"
          isLoading
          icon={<span>X</span>}
        />
      );
      const button = screen.getByRole("button", { name: "Chargement" });
      expect(button).toBeDisabled();
    });
  });

  describe("Input Component", () => {
    it("associates label with input element via htmlFor and id", () => {
      render(<Input label="Adresse Email" id="email-field" />);
      const label = screen.getByText("Adresse Email");
      const input = screen.getByLabelText("Adresse Email");
      expect(label).toHaveAttribute("for", "email-field");
      expect(input).toHaveAttribute("id", "email-field");
    });

    it("renders aria-invalid='true' when isInvalid or error is provided", () => {
      render(<Input label="Téléphone" isInvalid error="Numéro invalide" />);
      const input = screen.getByLabelText("Téléphone");
      expect(input).toHaveAttribute("aria-invalid", "true");
    });

    it("links helper/error text via aria-describedby", () => {
      render(<Input label="Nom" id="nom-field" helperText="Veuillez saisir votre nom complet" />);
      const input = screen.getByLabelText("Nom");
      const helper = screen.getByText("Veuillez saisir votre nom complet");
      expect(input).toHaveAttribute("aria-describedby", "nom-field-helper");
      expect(helper).toHaveAttribute("id", "nom-field-helper");
    });

    it("renders disabled input element", () => {
      render(<Input label="Champ Immuable" disabled />);
      const input = screen.getByLabelText("Champ Immuable");
      expect(input).toBeDisabled();
    });
  });

  describe("Checkbox Component", () => {
    it("associates label with checkbox input", () => {
      render(<Checkbox label="J'accepte les conditions" id="terms-check" />);
      const checkbox = screen.getByLabelText("J'accepte les conditions");
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).toHaveAttribute("type", "checkbox");
    });

    it("renders defaultChecked and disabled states correctly", () => {
      render(<Checkbox label="Notification SMS" defaultChecked disabled />);
      const checkbox = screen.getByLabelText("Notification SMS");
      expect(checkbox).toBeChecked();
      expect(checkbox).toBeDisabled();
    });
  });

  describe("Badge Component", () => {
    it("renders badge element with semantic variant styles", () => {
      render(<Badge variant="success">Payé</Badge>);
      const badge = screen.getByText("Payé");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass("bg-status-success-subtle");
    });
  });

  describe("Alert Component", () => {
    it("renders with role='alert' and displays title and message", () => {
      render(
        <Alert variant="warning" title="Attention Stock">
          Le stock de riz est presque épuisé.
        </Alert>
      );
      const alert = screen.getByRole("alert");
      expect(alert).toBeInTheDocument();
      expect(screen.getByText("Attention Stock")).toBeInTheDocument();
      expect(screen.getByText("Le stock de riz est presque épuisé.")).toBeInTheDocument();
    });
  });
});
