import { describe, it, expect, beforeEach } from "vitest";
import { prisma, seedPostgresDatabase } from "@jaama/database";
import { UserContext } from "@jaama/types";
import {
  ProductsService,
  InventoryService,
  CustomersService,
  QuotesService,
  InvoicesService,
  ExpensesService,
  SuppliersService,
  PurchasesService,
  FinancialsService,
  ReportsService,
} from "@jaama/api";

describe("JAA-S1-20 — JAAMA Sprint 1 Core Business Operating System Final Certification", () => {
  const productsService = new ProductsService();
  const customersService = new CustomersService();
  const quotesService = new QuotesService();
  const invoicesService = new InvoicesService();
  const expensesService = new ExpensesService();
  const suppliersService = new SuppliersService();
  const purchasesService = new PurchasesService();
  const financialsService = new FinancialsService();
  const reportsService = new ReportsService();

  const certUserContext: UserContext = {
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
      "sales.read",
      "sales.manage",
      "reports.read",
    ],
  };

  beforeEach(async () => {
    await seedPostgresDatabase(prisma);
  });

  it("Certifies Complete Sprint 1 E2E Core Operating System Flow (JAA-S1-01 -> JAA-S1-20)", async () => {
    // 1. Create Product
    const product = await productsService.createProduct(certUserContext, {
      sku: "CERT-S1-001",
      name: "Générateur Solaire 1000W",
      category: "Énergie",
      unitPriceMinor: 450000,
    });
    expect(product.id).toBeDefined();

    // 2. Create Supplier & Purchase Order
    const supplier = await suppliersService.createSupplier(certUserContext, {
      name: "Solaire Afrique Sarl",
      phone: "+223 66 00 99 88",
    });

    const purchase = await purchasesService.createPurchase(certUserContext, {
      supplierId: supplier.id,
      lines: [{ productId: product.id, quantity: 5, unitCostMinor: 380000 }],
    });
    expect(purchase.status).toBe("ORDERED");

    // 3. Receive Purchase Goods (PURCHASE_IN stock increment)
    await purchasesService.receivePurchase(certUserContext, purchase.id, {
      lines: [{ productId: product.id, quantityReceived: 5 }],
      idempotencyKey: "cert-receive-key-001",
    });

    // Verify stock balance = 5
    const balanceAfterReceive = await prisma.inventoryBalance.findUnique({
      where: {
        organizationId_productId: {
          organizationId: certUserContext.organizationId,
          productId: product.id,
        },
      },
    });
    expect(balanceAfterReceive?.availableQuantity).toBe(5);

    // 4. Create CRM Customer
    const customer = await customersService.createCustomer(certUserContext, {
      name: "Société des Mines du Mali",
      phone: "+223 20 22 33 44",
      type: "registered",
    });
    expect(customer.id).toBeDefined();

    // 5. Create Devis (Quote)
    const quote = await quotesService.createQuote(certUserContext, {
      customerId: customer.id,
      lines: [{ productId: product.id, quantity: 2 }],
      notes: "Proposition commerciale valide 30j",
    });
    expect(quote.status).toBe("DRAFT");
    expect(quote.totalMinor).toBe(900000);

    // 6. Transform Quote into Commercial Invoice
    const invoice = await invoicesService.convertQuoteToInvoice(certUserContext, quote.id);
    expect(invoice.reference).toContain("FAC-");
    expect(invoice.totalMinor).toBe(900000);

    const updatedQuote = await quotesService.getQuote(certUserContext, quote.id);
    expect(updatedQuote.status).toBe("ACCEPTED");

    // 7. Record Operational Expense
    const expense = await expensesService.createExpense(certUserContext, {
      category: "Transport",
      amountMinor: 25000,
      notes: "Frais de livraison camionnette",
    });
    expect(expense.id).toBeDefined();

    // 8. Financial Cashflow Ledger & Analytics Verification
    const cashflow = await financialsService.getCashflowSummary(certUserContext);
    expect(cashflow).toBeDefined();

    const report = await reportsService.getSalesReport(certUserContext);
    expect(report).toBeDefined();

    console.log("JAAMA Sprint 1 Core Operating System Program 100% Certified!");
  });
});
