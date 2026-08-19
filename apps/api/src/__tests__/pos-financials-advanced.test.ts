import { describe, it, expect, beforeEach } from "vitest";
import { prisma, seedPostgresDatabase } from "@jaama/database";
import { UserContext } from "@jaama/types";
import { PosAdvancedService } from "../pos-advanced/pos-advanced.service";
import { FinancialsService } from "../financials/financials.service";
import { SalesService } from "../sales/sales.service";
import { ProductsService } from "../products/products.service";
import { InventoryService } from "../inventory/inventory.service";

describe("JAA-S1-10..16 — Advanced POS & Financial OS Integration Tests against PostgreSQL", () => {
  const posAdvancedService = new PosAdvancedService();
  const financialsService = new FinancialsService();
  const salesService = new SalesService();
  const productsService = new ProductsService();
  const inventoryService = new InventoryService();

  const adminContextOrgA: UserContext = {
    actorId: "user-hamidou",
    organizationId: "org-diallo",
    membershipId: "org-diallo:user-hamidou",
    permissions: [
      "sales.read",
      "sales.manage",
      "sales.create",
      "products.manage",
    ],
  };

  beforeEach(async () => {
    await seedPostgresDatabase(prisma);
  });

  it("records additional payment on partial/credit sale and updates payment status to PAID", async () => {
    const product = await productsService.createProduct(adminContextOrgA, {
      sku: "DEBT-PROD-01",
      name: "Téléviseur LG 43 pouces",
      category: "Électronique",
      unitPriceMinor: 200000,
    });

    await inventoryService.recordAdjustment(adminContextOrgA, {
      productId: product.id,
      movementType: "OPENING",
      quantityDelta: 5,
    });

    // Create partial credit sale (0 payment upfront)
    const sale = await salesService.createSale(adminContextOrgA, {
      idempotencyKey: "debt-test-01",
      lines: [{ productId: product.id, quantity: 1 }],
      payments: [{ method: "cash", amountMinor: 0 }],
    });

    expect(sale.paymentStatus).toBe("TO_COLLECT");
    expect(sale.remainingMinor).toBe(200000);

    // Record debt payment of 200,000 FCFA
    const res = await posAdvancedService.recordSalePayment(adminContextOrgA, sale.id, {
      method: "orange_money",
      amountMinor: 200000,
    });

    expect(res.sale.paymentStatus).toBe("PAID");
    expect(res.sale.paidMinor).toBe(200000);
    expect(res.sale.remainingMinor).toBe(0);
  });

  it("executes sales returns, restores stock RETURN_IN and issues credit note reference", async () => {
    const product = await productsService.createProduct(adminContextOrgA, {
      sku: "RET-PROD-01",
      name: "Ventilateur Solstar",
      category: "Maison",
      unitPriceMinor: 15000,
    });

    await inventoryService.recordAdjustment(adminContextOrgA, {
      productId: product.id,
      movementType: "OPENING",
      quantityDelta: 10,
    });

    const sale = await salesService.createSale(adminContextOrgA, {
      idempotencyKey: "return-test-01",
      lines: [{ productId: product.id, quantity: 2 }],
      payments: [{ method: "cash", amountMinor: 30000 }],
    });

    // Stock should be 8
    let balance = await prisma.inventoryBalance.findUnique({
      where: {
        organizationId_productId: {
          organizationId: adminContextOrgA.organizationId,
          productId: product.id,
        },
      },
    });
    expect(balance?.availableQuantity).toBe(8);

    // Return 1 unit
    const retRes = await posAdvancedService.returnSale(adminContextOrgA, sale.id, {
      lines: [{ productId: product.id, quantityReturned: 1 }],
      reason: "Produit défectueux",
    });

    expect(retRes.creditNoteReference).toContain("AVO-");
    expect(retRes.creditNoteTotalMinor).toBe(15000);

    // Stock should now be restored to 9 (RETURN_IN)
    balance = await prisma.inventoryBalance.findUnique({
      where: {
        organizationId_productId: {
          organizationId: adminContextOrgA.organizationId,
          productId: product.id,
        },
      },
    });
    expect(balance?.availableQuantity).toBe(9);
  });

  it("generates structured thermal receipt text representation", async () => {
    const product = await productsService.createProduct(adminContextOrgA, {
      sku: "RCPT-PROD-01",
      name: "Café Nescafé 200g",
      category: "Épicerie",
      unitPriceMinor: 3500,
    });

    await inventoryService.recordAdjustment(adminContextOrgA, {
      productId: product.id,
      movementType: "OPENING",
      quantityDelta: 10,
    });

    const sale = await salesService.createSale(adminContextOrgA, {
      idempotencyKey: "receipt-test-01",
      lines: [{ productId: product.id, quantity: 2 }],
      payments: [{ method: "cash", amountMinor: 7000 }],
    });

    const text = await posAdvancedService.generateReceiptText(adminContextOrgA, sale.id);
    expect(text).toContain("DIALLO COMMERCE");
    expect(text).toContain("Café Nescafé 200g");
    expect(text).toContain("TOTAL TTC:");
    expect(text).toContain("Merci pour votre confiance");
  });

  it("calculates West-Africa UEMOA TVA 18% breakdown accurately", () => {
    const res = financialsService.computeTvaXof(11800);
    expect(res.ttcMinor).toBe(11800);
    expect(res.htMinor).toBe(10000);
    expect(res.tvaMinor).toBe(1800);
  });
});
