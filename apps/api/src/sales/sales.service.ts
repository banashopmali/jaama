import { Injectable, BadRequestException, ConflictException } from "@nestjs/common";
import { prisma as defaultPrisma } from "@jaama/database";
import {
  calculateAppliedPaidMinor,
  calculateLineTotalMinor,
  calculateRemainingMinor,
  calculateSubtotalMinor,
  calculateTotalMinor,
  derivePaymentStatusFromMinor,
  Payment,
  Sale,
  SaleLine,
  UserContext,
} from "@jaama/types";
import { validateCreateSaleCommand } from "@jaama/validation";
import { hashCanonicalPayload } from "../common/canonical-hash";

@Injectable()
export class SalesService {
  /**
   * Executes atomic CreateSale mutation in PostgreSQL.
   */
  public async createSale(
    userContext: UserContext,
    commandInput: unknown,
    prismaClient = defaultPrisma
  ): Promise<Sale> {
    const validation = validateCreateSaleCommand(commandInput);
    if (!validation.valid) {
      throw new BadRequestException(validation.error);
    }

    const command = validation.data;
    const organizationId = userContext.organizationId;
    const sellerUserId = userContext.actorId;
    const operation = "sales.create";
    const idempotencyKey = command.idempotencyKey;

    // 1. CANONICAL REQUEST HASH (Deterministic property sorting)
    const requestHash = hashCanonicalPayload(commandInput);

    // Execute atomic PostgreSQL transaction
    return prismaClient.$transaction(async (tx) => {
      // 2. CONCURRENCY-SAFE IDEMPOTENCY HANDLING
      if (idempotencyKey) {
        const existingRecord = await tx.idempotencyRecord.findUnique({
          where: {
            organizationId_operation_idempotencyKey: {
              organizationId,
              operation,
              idempotencyKey,
            },
          },
        });

        if (existingRecord) {
          if (existingRecord.requestHash !== requestHash) {
            throw new ConflictException(
              "Conflit d'idempotence : La même clé a été soumise avec une charge différente."
            );
          }
          if (existingRecord.status === "COMPLETED" && existingRecord.responseJson) {
            return JSON.parse(existingRecord.responseJson) as Sale;
          }
          if (existingRecord.status === "PROCESSING") {
            throw new ConflictException("Requête idempotente en cours de traitement.");
          }
        }

        // Try registering PROCESSING record with idempotency unique key
        try {
          await tx.idempotencyRecord.create({
            data: {
              organizationId,
              operation,
              idempotencyKey,
              requestHash,
              status: "PROCESSING",
            },
          });
        } catch (e: any) {
          // Catch concurrent duplicate key attempt safely
          if (e.code === "P2002") {
            throw new ConflictException("Requête idempotente en cours de traitement.");
          }
          throw e;
        }
      }

      // 3. LOCK TENANT ROW FOR CONCURRENCY-SAFE REFERENCE GENERATION
      await tx.$executeRaw`
        UPDATE "Organization"
        SET "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${organizationId}
      `;

      // 4. RESOURCE OWNERSHIP (CUSTOMER & PRODUCT TENANT ISOLATION)
      if (command.customerId) {
        const customer = await tx.customer.findUnique({
          where: {
            organizationId_id: {
              organizationId,
              id: command.customerId,
            },
          },
        });

        if (!customer) {
          throw new BadRequestException(
            `Client introuvable ou n'appartient pas à votre organisation (id: ${command.customerId}).`
          );
        }
      }

      const saleLines: SaleLine[] = [];
      const stockUpdates: { productId: string; quantity: number }[] = [];

      for (const lineInput of command.lines) {
        const product = await tx.product.findUnique({
          where: {
            organizationId_id: {
              organizationId,
              id: lineInput.productId,
            },
          },
        });

        if (!product || product.status !== "active") {
          throw new BadRequestException(
            `Produit introuvable ou inactif dans cette organisation (id: ${lineInput.productId}).`
          );
        }

        const lineTotalMinor = calculateLineTotalMinor(
          product.unitPriceMinor,
          lineInput.quantity
        );

        saleLines.push({
          id: `line-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          productId: product.id,
          productNameSnapshot: product.name,
          skuSnapshot: product.sku,
          quantity: lineInput.quantity,
          unitPriceMinor: product.unitPriceMinor,
          lineTotalMinor,
        });

        stockUpdates.push({
          productId: product.id,
          quantity: lineInput.quantity,
        });
      }

      // 5. FINANCIAL CALCULATIONS & OVERPAYMENT LEDGER INTEGRITY CHECK (P0)
      const subtotalMinor = calculateSubtotalMinor(saleLines);
      const totalMinor = calculateTotalMinor(subtotalMinor, command.discountMinor || 0);

      const rawPayments = command.payments || [];
      const sumRawPayments = rawPayments.reduce((sum, p) => sum + Math.max(0, p.amountMinor), 0);

      // P0 Invariant: Total collected Payments in ledger cannot exceed Sale totalMinor
      if (sumRawPayments > totalMinor) {
        throw new BadRequestException(
          "Le montant total des règlements ne peut dépasser le montant total de la vente."
        );
      }

      // 6. ATOMIC STOCK DECREMENT IN POSTGRESQL (PREVENT NEGATIVE OVERSELL)
      for (const update of stockUpdates) {
        const updatedCount = await tx.$executeRaw`
          UPDATE "InventoryBalance"
          SET "availableQuantity" = "availableQuantity" - ${update.quantity},
              "updatedAt" = CURRENT_TIMESTAMP
          WHERE "organizationId" = ${organizationId}
            AND "productId" = ${update.productId}
            AND "availableQuantity" >= ${update.quantity}
        `;

        if (updatedCount === 0) {
          throw new BadRequestException(
            `Stock disponible insuffisant pour le produit (id: ${update.productId}).`
          );
        }
      }

      const payments: Payment[] = [];
      for (const p of rawPayments) {
        if (p.amountMinor > 0) {
          payments.push({
            id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            saleId: "", // updated below
            organizationId,
            method: p.method,
            amountMinor: p.amountMinor,
            status: "SUCCESS",
            recordedAt: new Date(),
          });
        }
      }

      const appliedPaidMinor = calculateAppliedPaidMinor(payments, totalMinor);
      const remainingMinor = calculateRemainingMinor(totalMinor, appliedPaidMinor);
      const paymentStatus = derivePaymentStatusFromMinor(totalMinor, appliedPaidMinor);

      // Concurrency-safe sequential reference generation
      const count = await tx.sale.count({ where: { organizationId } });
      const reference = `VTE-${String(count + 25).padStart(4, "0")}`;
      const saleId = `sale-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      // 7. INSERT SALE & RELATED LEDGER ROWS IN POSTGRESQL
      const createdSaleRow = await tx.sale.create({
        data: {
          id: saleId,
          organizationId,
          reference,
          customerId: command.customerId || null,
          sellerUserId,
          subtotalMinor,
          discountMinor: command.discountMinor || 0,
          totalMinor,
          paidMinor: appliedPaidMinor,
          remainingMinor,
          saleStatus: "COMPLETED",
          paymentStatus,
          occurredAt: new Date(),
        },
      });

      // Insert SaleLines
      for (const line of saleLines) {
        await tx.saleLine.create({
          data: {
            id: line.id,
            organizationId,
            saleId: createdSaleRow.id,
            productId: line.productId,
            productNameSnapshot: line.productNameSnapshot,
            skuSnapshot: line.skuSnapshot,
            quantity: line.quantity,
            unitPriceMinor: line.unitPriceMinor,
            lineTotalMinor: line.lineTotalMinor,
          },
        });
      }

      // Insert Payments
      for (const pay of payments) {
        pay.saleId = createdSaleRow.id;
        await tx.payment.create({
          data: {
            id: pay.id,
            organizationId,
            saleId: createdSaleRow.id,
            method: pay.method as any,
            amountMinor: pay.amountMinor,
            status: "SUCCESS",
          },
        });
      }

      // Insert StockMovements
      for (const update of stockUpdates) {
        await tx.stockMovement.create({
          data: {
            id: `mv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            organizationId,
            productId: update.productId,
            movementType: "SALE_OUT",
            quantityDelta: -update.quantity,
            reference,
          },
        });
      }

      // 8. INSERT AUDIT EVENT & OUTBOX EVENTS IN SAME TRANSACTION
      await tx.auditEvent.create({
        data: {
          id: `audit-${Date.now()}`,
          organizationId,
          actorId: sellerUserId,
          action: operation,
          resourceType: "Sale",
          resourceId: createdSaleRow.id,
          metadataJson: JSON.stringify({ reference, totalMinor, appliedPaidMinor }),
        },
      });

      await tx.outboxEvent.create({
        data: {
          id: `outbox-${Date.now()}`,
          organizationId,
          eventType: "SaleCreated",
          aggregateType: "Sale",
          aggregateId: createdSaleRow.id,
          payloadJson: JSON.stringify({ saleId: createdSaleRow.id, reference, totalMinor }),
          status: "PENDING",
        },
      });

      const finalSale: Sale = {
        id: createdSaleRow.id,
        organizationId,
        reference,
        customerId: createdSaleRow.customerId,
        sellerUserId,
        lines: saleLines,
        subtotalMinor,
        discountMinor: createdSaleRow.discountMinor,
        totalMinor,
        paidMinor: appliedPaidMinor,
        remainingMinor,
        saleStatus: createdSaleRow.saleStatus as any,
        paymentStatus: createdSaleRow.paymentStatus as any,
        occurredAt: createdSaleRow.occurredAt,
        createdAt: createdSaleRow.createdAt,
      };

      // 9. FINALIZE DURABLE IDEMPOTENCY RECORD
      if (idempotencyKey) {
        await tx.idempotencyRecord.update({
          where: {
            organizationId_operation_idempotencyKey: {
              organizationId,
              operation,
              idempotencyKey,
            },
          },
          data: {
            status: "COMPLETED",
            responseJson: JSON.stringify(finalSale),
          },
        });
      }

      return finalSale;
    });
  }

  public async getSale(userContext: UserContext, saleId: string, prismaClient = defaultPrisma): Promise<Sale | null> {
    const sale = await prismaClient.sale.findUnique({
      where: {
        organizationId_id: {
          organizationId: userContext.organizationId,
          id: saleId,
        },
      },
      include: {
        lines: true,
        payments: true,
      },
    });

    if (!sale) return null;

    return {
      id: sale.id,
      organizationId: sale.organizationId,
      reference: sale.reference,
      customerId: sale.customerId,
      sellerUserId: sale.sellerUserId,
      lines: sale.lines.map((l) => ({
        id: l.id,
        productId: l.productId,
        productNameSnapshot: l.productNameSnapshot,
        skuSnapshot: l.skuSnapshot,
        quantity: l.quantity,
        unitPriceMinor: l.unitPriceMinor,
        lineTotalMinor: l.lineTotalMinor,
      })),
      subtotalMinor: sale.subtotalMinor,
      discountMinor: sale.discountMinor,
      totalMinor: sale.totalMinor,
      paidMinor: sale.paidMinor,
      remainingMinor: sale.remainingMinor,
      saleStatus: sale.saleStatus as any,
      paymentStatus: sale.paymentStatus as any,
      occurredAt: sale.occurredAt,
      createdAt: sale.createdAt,
    };
  }
}
