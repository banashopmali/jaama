"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const database_1 = require("@jaama/database");
const inventory_service_1 = require("../inventory/inventory.service");
const products_service_1 = require("../products/products.service");
(0, vitest_1.describe)("JAA-S1-02 — Inventory Core Integration Tests against PostgreSQL", () => {
    const inventoryService = new inventory_service_1.InventoryService();
    const productsService = new products_service_1.ProductsService();
    const adminContext = {
        actorId: "user-hamidou",
        organizationId: "org-diallo",
        membershipId: "org-diallo:user-hamidou",
        permissions: ["inventory.read", "inventory.adjust", "products.manage"],
    };
    (0, vitest_1.beforeEach)(async () => {
        await (0, database_1.seedPostgresDatabase)(database_1.prisma);
    });
    (0, vitest_1.it)("records opening stock movement and updates inventory balance", async () => {
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
        (0, vitest_1.expect)(adj.balance.availableQuantity).toBe(50);
        (0, vitest_1.expect)(adj.movement.movementType).toBe("OPENING");
        (0, vitest_1.expect)(adj.movement.quantityDelta).toBe(50);
    });
    (0, vitest_1.it)("strictly prevents negative stock balances on manual adjustments", async () => {
        const product = await productsService.createProduct(adminContext, {
            sku: "INV-NEG-001",
            name: "Cahier 100p",
            category: "Fournitures",
            unitPriceMinor: 500,
            initialStock: 10,
        });
        // Attempting to remove 15 units when only 10 available -> throws BadRequestException
        await (0, vitest_1.expect)(inventoryService.recordAdjustment(adminContext, {
            productId: product.id,
            movementType: "ADJUSTMENT_OUT",
            quantityDelta: 15,
        })).rejects.toThrow("Stock insuffisant");
        // Verify balance remains 10
        const invRes = await inventoryService.listInventory(adminContext, { search: "INV-NEG-001" });
        (0, vitest_1.expect)(invRes.data[0].availableQuantity).toBe(10);
    });
    (0, vitest_1.it)("correctly identifies low stock and out of stock statuses", async () => {
        const product = await productsService.createProduct(adminContext, {
            sku: "INV-LOW-001",
            name: "Sucre 1kg",
            category: "Alimentation",
            unitPriceMinor: 750,
            lowStockThreshold: 10,
            initialStock: 8, // <= 10 -> low stock
        });
        const listRes = await inventoryService.listInventory(adminContext, { search: "INV-LOW-001" });
        (0, vitest_1.expect)(listRes.data[0].stockStatus).toBe("low");
        // Adjust out 8 -> 0 -> out_of_stock
        await inventoryService.recordAdjustment(adminContext, {
            productId: product.id,
            movementType: "ADJUSTMENT_OUT",
            quantityDelta: 8,
        });
        const listRes2 = await inventoryService.listInventory(adminContext, { search: "INV-LOW-001" });
        (0, vitest_1.expect)(listRes2.data[0].stockStatus).toBe("out_of_stock");
    });
    (0, vitest_1.it)("tracks detailed stock movement history for product", async () => {
        const product = await productsService.createProduct(adminContext, {
            sku: "INV-HIST-001",
            name: "Riz 25kg",
            category: "Alimentation",
            unitPriceMinor: 15000,
        });
        await inventoryService.recordAdjustment(adminContext, {
            productId: product.id,
            movementType: "PURCHASE_IN",
            quantityDelta: 100,
        });
        await inventoryService.recordAdjustment(adminContext, {
            productId: product.id,
            movementType: "ADJUSTMENT_OUT",
            quantityDelta: 5,
        });
        const movements = await inventoryService.getStockMovements(adminContext, product.id);
        (0, vitest_1.expect)(movements.length).toBe(2);
        (0, vitest_1.expect)(movements[0].movementType).toBe("ADJUSTMENT_OUT");
        (0, vitest_1.expect)(movements[1].movementType).toBe("PURCHASE_IN");
    });
});
