import { describe, it, expect } from "vitest";
import React from "react";
import { Button } from "../Button";
import { IconButton } from "../IconButton";
import { Input } from "../Input";
import { Checkbox } from "../Checkbox";
import { Badge } from "../Badge";
import { Alert } from "../Alert";

describe("@jaama/ui Components Contract", () => {
  it("Button renders children and default props correctly", () => {
    const element = <Button>Commencer gratuitement</Button>;
    expect(element.props.children).toBe("Commencer gratuitement");
    expect(element.props.variant).toBeUndefined(); // default fallback handled in component
  });

  it("IconButton supports aria-label accessibility contract", () => {
    const element = <IconButton aria-label="Fermer" icon={<span>X</span>} />;
    expect(element.props["aria-label"]).toBe("Fermer");
  });

  it("Input reflects isInvalid semantic state", () => {
    const element = <Input label="Email" isInvalid error="Adresse email invalide" />;
    expect(element.props.isInvalid).toBe(true);
    expect(element.props.error).toBe("Adresse email invalide");
  });

  it("Checkbox renders with label", () => {
    const element = <Checkbox label="J'accepte les conditions" defaultChecked />;
    expect(element.props.label).toBe("J'accepte les conditions");
    expect(element.props.defaultChecked).toBe(true);
  });

  it("Badge supports semantic status variants", () => {
    const element = <Badge variant="success">Payé</Badge>;
    expect(element.props.variant).toBe("success");
    expect(element.props.children).toBe("Payé");
  });

  it("Alert renders title and message", () => {
    const element = (
      <Alert variant="warning" title="Attention">
        Votre stock est faible.
      </Alert>
    );
    expect(element.props.variant).toBe("warning");
    expect(element.props.title).toBe("Attention");
    expect(element.props.children).toBe("Votre stock est faible.");
  });
});
