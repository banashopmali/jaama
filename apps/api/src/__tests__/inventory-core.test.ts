import { describe, it, expect, beforeEach } from "vitest";
import { prisma, seedPostgresDatabase } from "@jaama/database";
import { UserContext } from "@jaama/types";
import { InventoryService } from "../inventory/inventory.service";
import { ProductsService } from "../products/products.service";

describe("JAA-S1-02 — Inventory Core Integration Tests against PostgreSQL", () => {
  const inventoryService = new InventoryService();
  const productsService = new ProductsService();

  const adminContext: UserContext = {
    actorId: "user-hamidou",
    organizationId: "org-diallo",
    membershipId: "org-diallo:user-hamidou",
    permissions: ["inventory.read", "inventory.adjust", "products.manage"],
  };

  beforeEach(async () => {
    await seedPostgresDatabase(prisma);
  });

  it("records opening stock movement and updates inventory balance", async () => {
    const product = await productsService.createProduct(adminContext, {
      sku: "INV-OPEN-001",
      name: "Huile de Palme 1L",
      category: "Alimentation",
      unitPriceMinor: 1200,
    });

    const adj = await inventoryService.recordAdjustment(adminContext, {
      productId: product.id,
      movementType: "OPENING",
      quantityDelta: 50,
      reference: "INV-INITIAL-SEED",
    });

    expect(adj.balance.availableQuantity).toBe(50);
    expect(adj.movement.movementType).toBe("OPENING");
    expect(adj.movement.quantityDelta).toBe(50);
  });

  it("strictly prevents negative stock balances on manual adjustments", async () => {
    const product = await productsService.createProduct(adminContext, {
      sku: "INV-NEG-001",
      name: "Cahier 100p",
      category: "Fournitures",
      unitPriceMinor: 500,
      initialStock: 10,
    });

    // Attempting to remove 15 units when only 10 available -> throws BadRequestException
    await expect(
      inventoryService.recordAdjustment(adminContext, {
        productId: product.id,
        movementType: "ADJUSTMENT_OUT",
        quantityDelta: 15,
      })
    ).rejects.toThrow("Stock insuffisant");

    // Verify balance remains 10
    const invRes = await inventoryService.listInventory(adminContext, { search: "INV-NEG-001" });
    expect(invRes.data[0].availableQuantity).toBe(10);
  });

  it("correctly identifies low stock and out of stock statuses", async () => {
    const product = await productsService.createProduct(adminContext, {
      sku: "INV-LOW-001",
      name: "Sucre 1kg",
      category: "Alimentation",
      unitPriceMinor: 750,
      lowStockThreshold: 10,
      initialStock: 8, // <= 10 -> low stock
    });

    const listRes = await inventoryService.listInventory(adminContext, { search: "INV-LOW-001" });
    expect(listRes.data[0].stockStatus).toBe("low");

    // Adjust out 8 -> 0 -> out_of_stock
    await inventoryService.recordAdjustment(adminContext, {
      productId: product.id,
      movementType: "ADJUSTMENT_OUT",
      quantityDelta: 8,
    });

    const listRes2 = await inventoryService.listInventory(adminContext, { search: "INV-LOW-001" });
    expect(listRes2.data[0].stockStatus).toBe("out_of_stock");
  });

  it("tracks detailed stock movement history for product", async () => {
    const product = await productsService.createProduct(adminContext, {
      sku: "INV-HIST-001",
      name: "Riz 25kg",
      category: "Alimentation",
      unitPriceMinor: 15000,
    });

    await inventoryService.recordAdjustment(adminContext, {
      productId: product.id,
      movementType: "ADJUSTMENT_IN",
      quantityDelta: 100,
    });

    await inventoryService.recordAdjustment(adminContext, {
      productId: product.id,
      movementType: "ADJUSTMENT_OUT",
      quantityDelta: 5,
    });

    const movements = await inventoryService.getStockMovements(adminContext, product.id);
    expect(movements.length).toBe(2);
    expect(movements[0].movementType).toBe("ADJUSTMENT_OUT");
    expect(movements[1].movementType).toBe("ADJUSTMENT_IN");
  });
});
