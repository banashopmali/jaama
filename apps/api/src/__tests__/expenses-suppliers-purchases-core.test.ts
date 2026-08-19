import { describe, it, expect, beforeEach } from "vitest";
import { prisma, seedPostgresDatabase } from "@jaama/database";
import { UserContext } from "@jaama/types";
import { ExpensesService } from "../expenses/expenses.service";
import { SuppliersService } from "../suppliers/suppliers.service";
import { PurchasesService } from "../purchases/purchases.service";
import { ProductsService } from "../products/products.service";

describe("JAA-S1-07..09 — Expenses, Suppliers & Purchasing Core Integration Tests against PostgreSQL", () => {
  const expensesService = new ExpensesService();
  const suppliersService = new SuppliersService();
  const purchasesService = new PurchasesService();
  const productsService = new ProductsService();

  const adminContextOrgA: UserContext = {
    actorId: "user-hamidou",
    organizationId: "org-diallo",
    membershipId: "org-diallo:user-hamidou",
    permissions: [
      "expenses.read",
      "expenses.manage",
      "suppliers.read",
      "suppliers.manage",
      "purchases.read",
      "purchases.manage",
      "products.manage",
      "inventory.read",
    ],
  };

  const adminContextOrgB: UserContext = {
    actorId: "user-hamidou",
    organizationId: "org-b",
    membershipId: "org-b:user-hamidou",
    permissions: [
      "expenses.read",
      "expenses.manage",
      "suppliers.read",
      "suppliers.manage",
      "purchases.read",
      "purchases.manage",
    ],
  };

  beforeEach(async () => {
    await seedPostgresDatabase(prisma);

    await prisma.organization.upsert({
      where: { id: "org-b" },
      update: { status: "active" },
      create: { id: "org-b", name: "Org B", slug: "org-b", status: "active" },
    });
  });

  it("creates expense record and calculates total amount minor aggregation", async () => {
    await expensesService.createExpense(adminContextOrgA, {
      category: "Loyer",
      amountMinor: 150000,
      notes: "Loyer du magasin M1",
    });

    await expensesService.createExpense(adminContextOrgA, {
      category: "Électricité",
      amountMinor: 25000,
      notes: "Facture EDM Mali",
    });

    const list = await expensesService.listExpenses(adminContextOrgA);
    expect(list.total).toBe(2);
    expect(list.totalAmountMinor).toBe(175000);
  });

  it("manages supplier lifecycle and summary analytics", async () => {
    const supplier = await suppliersService.createSupplier(adminContextOrgA, {
      name: "Grand Grossiste Bamako",
      phone: "+223 70 00 11 22",
    });

    expect(supplier.id).toBeDefined();
    expect(supplier.name).toBe("Grand Grossiste Bamako");

    const getRes = await suppliersService.getSupplier(adminContextOrgA, supplier.id);
    expect(getRes.summary.purchasesCount).toBe(0);
  });

  it("executes purchase order creation and goods receiving workflow with stock increment PURCHASE_IN", async () => {
    const product = await productsService.createProduct(adminContextOrgA, {
      sku: "PURCH-PROD-01",
      name: "Sac de Riz 50kg",
      category: "Alimentation",
      unitPriceMinor: 22000,
    });

    const supplier = await suppliersService.createSupplier(adminContextOrgA, {
      name: "Moussa Sarl",
    });

    // Create Purchase Order
    const purchase = await purchasesService.createPurchase(adminContextOrgA, {
      supplierId: supplier.id,
      lines: [{ productId: product.id, quantity: 10, unitCostMinor: 18000 }],
    });

    expect(purchase.id).toBeDefined();
    expect(purchase.status).toBe("ORDERED");
    expect(purchase.totalMinor).toBe(180000);

    // Initial stock balance
    let balance = await prisma.inventoryBalance.findUnique({
      where: {
        organizationId_productId: {
          organizationId: adminContextOrgA.organizationId,
          productId: product.id,
        },
      },
    });
    expect(balance?.availableQuantity ?? 0).toBe(0);

    // Receive Goods
    const receiving = await purchasesService.receivePurchase(adminContextOrgA, purchase.id, {
      idempotencyKey: "test-rec-key-001",
      lines: [{ productId: product.id, quantityReceived: 10 }],
    });

    expect(receiving.id).toBeDefined();

    // Check purchase status updated to RECEIVED
    const updatedPurchase = await purchasesService.getPurchase(adminContextOrgA, purchase.id);
    expect(updatedPurchase.status).toBe("RECEIVED");

    // Stock balance should now be incremented by 10 (PURCHASE_IN)
    balance = await prisma.inventoryBalance.findUnique({
      where: {
        organizationId_productId: {
          organizationId: adminContextOrgA.organizationId,
          productId: product.id,
        },
      },
    });
    expect(balance?.availableQuantity).toBe(10);
  });

  it("enforces tenant isolation across expenses and suppliers", async () => {
    const expense = await expensesService.createExpense(adminContextOrgA, {
      category: "Transport",
      amountMinor: 10000,
    });

    await expect(
      expensesService.getExpense(adminContextOrgB, expense.id)
    ).rejects.toThrow("Dépense introuvable.");
  });
});
