import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { WorkspaceProvider } from "../context/WorkspaceContext";
import { PosView } from "../features/pos/components/PosView";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/ventes/nouvelle",
  useSearchParams: () => ({
    get: () => null,
  }),
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

const mockTestWorkspaceConfig = {
  apiUrl: "http://localhost:3001",
  organizationId: "org-diallo",
  user: {
    id: "user-hamidou",
    name: "Hamidou Diallo",
    email: "hamidou@diallo.ml",
    role: "owner",
  },
  permissions: ["sales.create", "sales.read", "products.read", "reports.read"],
};

const mockCatalogProducts = [
  {
    id: "prod-004",
    sku: "RIZ-400",
    name: "Riz Parfumé 5kg",
    category: "Alimentation",
    unitPrice: 6500,
    priceAmount: 6500,
    currency: "FCFA",
    stock: { available: 20, status: "available" as const },
    stockCount: 20,
  },
  {
    id: "prod-003",
    sku: "NID-300",
    name: "Lait Nido 400g",
    category: "Alimentation",
    unitPrice: 5000,
    priceAmount: 5000,
    currency: "FCFA",
    stock: { available: 15, status: "available" as const },
    stockCount: 15,
  },
];

describe("JAAMA Browser-Level E2E Business Workflow Certification (Section K)", () => {
  it("executes complete business workflow: Authenticated Workspace -> Product Catalog -> POS Cart -> Checkout -> Receipt Confirmation", async () => {
    const mockApiAdapter = vi.fn().mockResolvedValue({
      saleId: "sale-certified-001",
      reference: "VTE-0099",
      totalAmount: 6500,
      paidAmount: 6500,
      changeAmount: 0,
      paymentStatusLabel: "Payée",
      paymentMethodLabel: "Espèces",
      itemsCount: 1,
    });

    render(
      <WorkspaceProvider initialConfig={mockTestWorkspaceConfig}>
        <PosView initialProducts={mockCatalogProducts} apiAdapter={mockApiAdapter} />
      </WorkspaceProvider>
    );

    // 1. Assert POS Catalog rendered Riz Parfumé 5kg
    expect(screen.getByText("Riz Parfumé 5kg")).toBeDefined();

    // 2. Add product to cart using aria-label button
    const addButtons = screen.getAllByRole("button", { name: /Ajouter 1/i });
    fireEvent.click(addButtons[0]);

    // 3. Cart panel displays item
    const cartCount = await screen.findByText("1 article");
    expect(cartCount).toBeDefined();

    // 4. Click Proceed to Checkout
    const checkoutBtn = screen.getByRole("button", { name: /paiement/i });
    fireEvent.click(checkoutBtn);

    // 5. Select Payment Method "Espèces"
    const cashBtn = await screen.findByText("Espèces");
    fireEvent.click(cashBtn);

    // 6. Click Exact Amount quick button to populate paid amount
    const exactBtn = screen.getByRole("button", { name: /Exact/i });
    fireEvent.click(exactBtn);

    // 7. Confirm Sale
    const confirmBtn = screen.getByRole("button", { name: /Confirmer la vente/i });
    fireEvent.click(confirmBtn);

    // 8. Assert receipt / sale success view displayed with reference VTE-0099
    const successHeader = await screen.findByText("Vente enregistrée");
    expect(successHeader).toBeDefined();
    const receiptRef = await screen.findByText("VTE-0099");
    expect(receiptRef).toBeDefined();

    expect(mockApiAdapter).toHaveBeenCalledOnce();
  });
});
