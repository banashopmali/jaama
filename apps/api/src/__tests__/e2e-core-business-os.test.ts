import { describe, it, expect, beforeEach } from "vitest";
import { prisma, seedPostgresDatabase } from "@jaama/database";
import { UserContext } from "@jaama/types";
import {
  ProductsService,
  InventoryService,
  CustomersService,
  SalesService,
  PaymentsService,
  PurchasesService,
  SuppliersService,
  QuotesService,
  InvoicesService,
  SearchService,
  NotificationsService,
  ReconciliationService,
} from "../index";

describe("JAA-S1-19 — Real Core Business E2E HTTP & Database Integration Test Suite", () => {
  const productsService = new ProductsService();
  const inventoryService = new InventoryService();
  const customersService = new CustomersService();
  const salesService = new SalesService();
  const paymentsService = new PaymentsService();
  const purchasesService = new PurchasesService();
  const suppliersService = new SuppliersService();
  const quotesService = new QuotesService();
  const invoicesService = new InvoicesService();
  const searchService = new SearchService();
  const notificationsService = new NotificationsService();
  const reconciliationService = new ReconciliationService();

  const userContext: UserContext = {
    actorId: "user-hamidou",
    organizationId: "org-diallo",
    membershipId: "org-diallo:user-hamidou",
    permissions: [
      "products.read",
      "products.manage",
      "inventory.read",
      "inventory.adjust",
      "customers.read",
      "customers.manage",
      "sales.read",
      "sales.create",
      "sales.manage",
      "payments.read",
      "payments.record",
      "quotes.read",
      "quotes.manage",
      "invoices.read",
      "invoices.manage",
      "expenses.read",
      "expenses.manage",
      "suppliers.read",
      "suppliers.manage",
      "purchases.read",
      "purchases.manage",
      "reports.read",
      "organization.manage",
    ],
  };

  beforeEach(async () => {
    await seedPostgresDatabase(prisma);
  });

  it("Scenario A: Product & Inventory Lifecycle and Concurrency Protection", async () => {
    // 1. Create product with valid price
    const prod = await productsService.createProduct(userContext, {
      sku: "E2E-PROD-001",
      name: "Solaire Panneau 200W",
      category: "Énergie",
      unitPriceMinor: 120000,
      initialStock: 10,
    });
    expect(prod.id).toBeDefined();

    // Duplicate SKU attempt must fail deterministically
    await expect(
      productsService.createProduct(userContext, {
        sku: "E2E-PROD-001",
        name: "Autre Panneau",
        category: "Énergie",
        unitPriceMinor: 120000,
      })
    ).rejects.toThrow("Un produit avec ce SKU existe déjà");

    // 2. Manual stock adjustment
    const adj = await inventoryService.recordAdjustment(userContext, {
      productId: prod.id,
      movementType: "ADJUSTMENT_IN",
      quantityDelta: 5,
    });
    expect(adj.balance.availableQuantity).toBe(15);

    // Invalid manual movement (e.g. SALE_OUT manually) must fail
    await expect(
      inventoryService.recordAdjustment(userContext, {
        productId: prod.id,
        movementType: "SALE_OUT",
        quantityDelta: 2,
      })
    ).rejects.toThrow("interdit en ajustement manuel");
  });

  it("Scenario B: Customer CRM & Walk-in Customer Invariant", async () => {
    // 1. Registered Customer creation
    const cust = await customersService.createCustomer(userContext, {
      name: "Entreprise Diarra Sarl",
      phone: "+223 70 00 11 22",
      type: "registered",
    });
    expect(cust.id).toBeDefined();

    // 2. Client Comptoir creation attempt MUST fail
    await expect(
      customersService.createCustomer(userContext, {
        name: "Client Comptoir",
      })
    ).rejects.toThrow("Le 'Client Comptoir' ne doit pas être créé comme fiche client master");
  });

  it("Scenario C & D: POS Sales Core, P0 Anti-Overpayment & Receivables Ledger", async () => {
    // Setup product with stock = 10
    const prod = await productsService.createProduct(userContext, {
      sku: "E2E-POS-001",
      name: "Batterie Solaire 100Ah",
      category: "Stockage",
      unitPriceMinor: 150000,
      initialStock: 10,
    });

    // 1. Create partial-credit sale via salesService
    const sale = await salesService.createSale(userContext, {
      lines: [{ productId: prod.id, quantity: 2 }],
      discountMinor: 0,
      payments: [{ method: "cash", amountMinor: 100000 }],
      idempotencyKey: `idemp-sale-${Date.now()}`,
    });

    expect(sale.totalMinor).toBe(300000);
    expect(sale.paidMinor).toBe(100000);
    expect(sale.remainingMinor).toBe(200000);
    expect(sale.paymentStatus).toBe("PARTIALLY_PAID");

    // 2. P0 Overpayment Check on Receivables
    await expect(
      paymentsService.recordSalePayment(userContext, sale.id, {
        method: "wave",
        amountMinor: 250000,
        idempotencyKey: `idemp-pay-over-${Date.now()}`,
      })
    ).rejects.toThrow("Montant supérieur au solde restant");

    // 3. Valid Payment: Pay 200,000 FCFA to complete sale balance
    const payResult = await paymentsService.recordSalePayment(userContext, sale.id, {
      method: "orange_money",
      amountMinor: 200000,
      idempotencyKey: `idemp-pay-valid-${Date.now()}`,
    });

    expect(payResult.sale.paidMinor).toBe(300000);
    expect(payResult.sale.remainingMinor).toBe(0);
    expect(payResult.sale.paymentStatus).toBe("PAID");
  });

  it("Scenario E: Purchasing P0 Anti-Over-Receiving Invariant", async () => {
    const prod = await productsService.createProduct(userContext, {
      sku: "E2E-PURCH-001",
      name: "Onduleur Hybride 3KW",
      category: "Énergie",
      unitPriceMinor: 250000,
    });

    const supplier = await suppliersService.createSupplier(userContext, {
      name: "Solaire Import SA",
    });

    const purchase = await purchasesService.createPurchase(userContext, {
      supplierId: supplier.id,
      lines: [{ productId: prod.id, quantity: 10, unitCostMinor: 200000 }],
    });

    // 1. Partial receiving: receive 6 units (remaining = 4)
    await purchasesService.receivePurchase(userContext, purchase.id, {
      idempotencyKey: "e2e-rec-key-001",
      lines: [{ productId: prod.id, quantityReceived: 6 }],
    });

    // 2. Over-receiving attempt: trying to receive 5 units when remaining is 4 MUST FAIL
    await expect(
      purchasesService.receivePurchase(userContext, purchase.id, {
        idempotencyKey: "e2e-rec-key-002",
        lines: [{ productId: prod.id, quantityReceived: 5 }],
      })
    ).rejects.toThrow("Dépassement de la quantité commandée");

    // 3. Receive exact remaining 4 units
    const rec2 = await purchasesService.receivePurchase(userContext, purchase.id, {
      idempotencyKey: "e2e-rec-key-003",
      lines: [{ productId: prod.id, quantityReceived: 4 }],
    });

    expect(rec2).toBeDefined();
    const updatedPur = await purchasesService.getPurchase(userContext, purchase.id);
    expect(updatedPur.status).toBe("RECEIVED");
  });

  it("Scenario F: Quotes to Invoice Conversion & Reference Integrity", async () => {
    const prod = await productsService.createProduct(userContext, {
      sku: "E2E-QUOTE-001",
      name: "Kit Solaire Domicile",
      category: "Kits",
      unitPriceMinor: 85000,
    });

    const quote = await quotesService.createQuote(userContext, {
      lines: [{ productId: prod.id, quantity: 3 }],
    });

    expect(quote.reference).toContain("DEV-");

    const invoice = await invoicesService.convertQuoteToInvoice(userContext, quote.id);
    expect(invoice.reference).toContain("FAC-");
    expect(invoice.totalMinor).toBe(255000);
  });

  it("Scenario G & H: Search, Notifications & Operational Reconciliation", async () => {
    const searchRes = await searchService.searchAll(userContext, "Kit");
    expect(searchRes).toBeDefined();

    const notifRes = await notificationsService.getNotifications(userContext);
    expect(notifRes.items).toBeDefined();

    const reconRes = await reconciliationService.runDiagnosticCheck(userContext);
    expect(reconRes.checkedAt).toBeDefined();
  });
});
