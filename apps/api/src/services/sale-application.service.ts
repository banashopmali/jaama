import { InMemoryDatabase } from "@jaama/database";
import {
  calculateAppliedPaidMinor,
  calculateLineTotalMinor,
  calculateRemainingMinor,
  calculateSubtotalMinor,
  calculateTotalMinor,
  CreateSaleCommand,
  derivePaymentStatusFromMinor,
  Payment,
  Product,
  Sale,
  SaleLine,
  StockMovement,
} from "@jaama/types";
import { validateCreateSaleCommand } from "@jaama/validation";

export class SaleApplicationService {
  /**
   * Executes atomic CreateSale application use case.
   */
  public async createSale(
    db: InMemoryDatabase,
    commandInput: unknown,
    validatedOrgId: string,
    validatedSellerUserId: string
  ): Promise<Sale> {
    const validation = validateCreateSaleCommand(commandInput);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const command = validation.data;
    const organizationId = validatedOrgId;
    const sellerUserId = validatedSellerUserId;

    // 1. Resolve & Validate Products & Stock Availability
    const saleLines: SaleLine[] = [];
    const stockMovements: StockMovement[] = [];

    for (const item of command.lines) {
      const productKey = `${organizationId}:${item.productId}`;
      const product = db.products.get(productKey);

      if (!product || product.status !== "active") {
        throw new Error(`Produit introuvable ou inactif : ${item.productId}`);
      }

      const balanceKey = `${organizationId}:${item.productId}`;
      const balance = db.inventoryBalances.get(balanceKey);

      if (!balance || balance.availableQuantity < item.quantity) {
        throw new Error(`Stock insuffisant pour le produit : ${product.name}`);
      }

      const lineTotalMinor = calculateLineTotalMinor(product.unitPriceMinor, item.quantity);
      saleLines.push({
        id: `line-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        productId: product.id,
        productNameSnapshot: product.name,
        skuSnapshot: product.sku,
        quantity: item.quantity,
        unitPriceMinor: product.unitPriceMinor,
        lineTotalMinor,
      });

      stockMovements.push({
        id: `mv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        organizationId,
        productId: product.id,
        movementType: "SALE_OUT",
        quantityDelta: -item.quantity,
        reference: "", // filled after reference generation
        recordedAt: new Date(),
      });
    }

    // 2. Financial Calculations
    const subtotalMinor = calculateSubtotalMinor(saleLines);
    const totalMinor = calculateTotalMinor(subtotalMinor, command.discountMinor || 0);

    const payments: Payment[] = [];
    const rawPayments = command.payments || [];

    for (const p of rawPayments) {
      payments.push({
        id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        saleId: "", // filled after sale creation
        organizationId,
        method: p.method,
        amountMinor: p.amountMinor,
        status: "SUCCESS",
        recordedAt: new Date(),
      });
    }

    const appliedPaidMinor = calculateAppliedPaidMinor(payments, totalMinor);
    const remainingMinor = calculateRemainingMinor(totalMinor, appliedPaidMinor);
    const paymentStatus = derivePaymentStatusFromMinor(totalMinor, appliedPaidMinor);

    const saleRef = `VTE-${String(db.sales.size + 25).padStart(4, "0")}`;
    const saleId = `sale-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    // Set references
    for (const m of stockMovements) m.reference = saleRef;
    for (const p of payments) p.saleId = saleId;

    const sale: Sale = {
      id: saleId,
      organizationId,
      reference: saleRef,
      customerId: command.customerId || null,
      sellerUserId,
      lines: saleLines,
      subtotalMinor,
      discountMinor: command.discountMinor || 0,
      totalMinor,
      paidMinor: appliedPaidMinor,
      remainingMinor,
      saleStatus: "COMPLETED",
      paymentStatus,
      occurredAt: new Date(),
      createdAt: new Date(),
    };

    // 3. Perform Atomic Writes to DB
    db.sales.set(saleId, sale);
    for (const p of payments) db.payments.push(p);
    for (const m of stockMovements) {
      db.stockMovements.push(m);
      const balance = db.inventoryBalances.get(`${organizationId}:${m.productId}`);
      if (balance) {
        balance.availableQuantity += m.quantityDelta; // quantityDelta is negative
      }
    }

    // 4. Record Audit Event & Outbox Event
    db.auditEvents.push({
      id: `audit-${Date.now()}`,
      organizationId,
      actorId: sellerUserId,
      action: "sales.create",
      resourceType: "Sale",
      resourceId: saleId,
      requestId: "req-v1-sale",
      createdAt: new Date(),
    });

    db.outboxEvents.push({
      id: `outbox-${Date.now()}`,
      organizationId,
      eventType: "SaleCreated",
      aggregateType: "Sale",
      aggregateId: saleId,
      payloadJson: JSON.stringify({ saleId, reference: saleRef, totalMinor }),
      status: "PENDING",
      createdAt: new Date(),
    });

    return sale;
  }

  /**
   * Fetches Sale by ID ensuring tenant isolation.
   */
  public async getSale(db: InMemoryDatabase, organizationId: string, saleId: string): Promise<Sale | null> {
    const sale = db.sales.get(saleId);
    if (!sale || sale.organizationId !== organizationId) {
      return null;
    }
    return sale;
  }

  /**
   * Lists available products for sale in an organization.
   */
  public async listProducts(db: InMemoryDatabase, organizationId: string): Promise<Product[]> {
    const result: Product[] = [];
    for (const p of db.products.values()) {
      if (p.organizationId === organizationId && p.status === "active") {
        result.push(p);
      }
    }
    return result;
  }
}
