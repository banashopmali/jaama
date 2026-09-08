import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { prisma as defaultPrisma } from "@jaama/database";
import { UserContext, PaymentMethodCode } from "@jaama/types";

export interface RecordSalePaymentDto {
  method: PaymentMethodCode;
  amountMinor: number;
}

export interface ReturnSaleLineDto {
  productId: string;
  quantityReturned: number;
}

export interface ReturnSaleDto {
  lines: ReturnSaleLineDto[];
  reason?: string;
}

@Injectable()
export class PosAdvancedService {
  /**
   * JAA-S1-10: Record additional payment on an existing sale (debt settlement / pay later).
   */
  public async recordSalePayment(
    userContext: UserContext,
    saleId: string,
    dto: RecordSalePaymentDto,
    prismaClient = defaultPrisma
  ): Promise<any> {
    const organizationId = userContext.organizationId;

    if (!dto.amountMinor || dto.amountMinor <= 0) {
      throw new BadRequestException("Le montant du paiement doit être supérieur à zéro.");
    }

    return prismaClient.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: {
          organizationId_id: {
            organizationId,
            id: saleId,
          },
        },
      });

      if (!sale) {
        throw new NotFoundException("Vente introuvable.");
      }

      if (sale.paymentStatus === "PAID") {
        throw new BadRequestException("Cette vente est déjà entièrement réglée.");
      }

      const newPaidMinor = sale.paidMinor + dto.amountMinor;
      const newRemainingMinor = Math.max(0, sale.totalMinor - newPaidMinor);
      const newPaymentStatus = newRemainingMinor === 0 ? "PAID" : "PARTIALLY_PAID";

      // 1. Create Payment Record
      const payment = await tx.payment.create({
        data: {
          organizationId,
          saleId: sale.id,
          method: dto.method,
          amountMinor: dto.amountMinor,
          status: "SUCCESS",
        },
      });

      // 2. Update Sale totals
      const updatedSale = await tx.sale.update({
        where: {
          organizationId_id: {
            organizationId,
            id: saleId,
          },
        },
        data: {
          paidMinor: newPaidMinor,
          remainingMinor: newRemainingMinor,
          paymentStatus: newPaymentStatus,
        },
      });

      // 3. Audit & Outbox
      await tx.auditEvent.create({
        data: {
          organizationId,
          actorId: userContext.actorId,
          action: "sale.payment_add",
          resourceType: "payment",
          resourceId: payment.id,
          metadataJson: JSON.stringify({ saleId, method: dto.method, amountMinor: dto.amountMinor }),
        },
      });

      return { sale: updatedSale, payment };
    });
  }

  /**
   * JAA-S1-16: Returns & Credit Notes (Avoirs)
   * Restores stock balance (RETURN_IN) and computes credit note reference.
   */
  public async returnSale(
    userContext: UserContext,
    saleId: string,
    dto: ReturnSaleDto,
    prismaClient = defaultPrisma
  ): Promise<any> {
    const organizationId = userContext.organizationId;

    if (!dto.lines || dto.lines.length === 0) {
      throw new BadRequestException("Un retour de vente doit comporter au moins une ligne.");
    }

    return prismaClient.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: {
          organizationId_id: {
            organizationId,
            id: saleId,
          },
        },
        include: {
          lines: true,
        },
      });

      if (!sale) {
        throw new NotFoundException("Vente introuvable.");
      }

      const saleLineMap = new Map(sale.lines.map((l) => [l.productId, l]));
      let creditNoteTotalMinor = 0;

      for (const retLine of dto.lines) {
        const sLine = saleLineMap.get(retLine.productId);
        if (!sLine) {
          throw new BadRequestException(`Le produit ${retLine.productId} ne figure pas dans cette vente.`);
        }
        if (retLine.quantityReturned <= 0 || retLine.quantityReturned > sLine.quantity) {
          throw new BadRequestException(`La quantité retournée pour ${sLine.productNameSnapshot} est invalide.`);
        }

        const lineCreditMinor = sLine.unitPriceMinor * retLine.quantityReturned;
        creditNoteTotalMinor += lineCreditMinor;

        // 1. Increment Stock Balance (RETURN_IN)
        await tx.inventoryBalance.upsert({
          where: {
            organizationId_productId: {
              organizationId,
              productId: retLine.productId,
            },
          },
          update: {
            availableQuantity: { increment: retLine.quantityReturned },
          },
          create: {
            organizationId,
            productId: retLine.productId,
            availableQuantity: retLine.quantityReturned,
            reservedQuantity: 0,
          },
        });

        // 2. Record Stock Movement (RETURN_IN)
        await tx.stockMovement.create({
          data: {
            organizationId,
            productId: retLine.productId,
            movementType: "RETURN_IN",
            quantityDelta: retLine.quantityReturned,
            reference: `AVOIR-${sale.reference}`,
          },
        });
      }

      const count = await tx.outboxEvent.count({ where: { organizationId, aggregateType: "CreditNote" } });
      const creditNoteRef = `AVO-${new Date().getFullYear()}-${(count + 1).toString().padStart(4, "0")}`;

      await tx.auditEvent.create({
        data: {
          organizationId,
          actorId: userContext.actorId,
          action: "sale.return",
          resourceType: "credit_note",
          resourceId: saleId,
          metadataJson: JSON.stringify({ creditNoteRef, creditNoteTotalMinor, reason: dto.reason }),
        },
      });

      return {
        creditNoteReference: creditNoteRef,
        saleReference: sale.reference,
        creditNoteTotalMinor,
        refundedAt: new Date(),
      };
    });
  }

  /**
   * JAA-S1-12: Thermal Receipt Text Generation Helper (58mm / 80mm standard format)
   */
  public async generateReceiptText(
    userContext: UserContext,
    saleId: string,
    prismaClient = defaultPrisma
  ): Promise<string> {
    const organizationId = userContext.organizationId;
    const sale = await prismaClient.sale.findUnique({
      where: {
        organizationId_id: {
          organizationId,
          id: saleId,
        },
      },
      include: {
        lines: true,
        customer: true,
        payments: true,
      },
    });

    if (!sale) {
      throw new NotFoundException("Vente introuvable.");
    }

    const org = await prismaClient.organization.findUnique({ where: { id: organizationId } });
    const storeName = org ? org.name : "JAAMA POS";

    const dateStr = new Date(sale.occurredAt).toLocaleString("fr-FR");

    let text = `================================\n`;
    text += `       ${storeName.toUpperCase()}\n`;
    text += `================================\n`;
    text += `Ticket: ${sale.reference}\n`;
    text += `Date:   ${dateStr}\n`;
    if (sale.customer) {
      text += `Client: ${sale.customer.name}\n`;
    }
    text += `--------------------------------\n`;
    text += `ARTICLES              QTE  TOTAL\n`;
    text += `--------------------------------\n`;

    for (const l of sale.lines) {
      const lineName = l.productNameSnapshot.padEnd(20, " ").substring(0, 20);
      const qtyStr = l.quantity.toString().padStart(3, " ");
      const totalStr = `${l.lineTotalMinor} F`.padStart(7, " ");
      text += `${lineName} ${qtyStr} ${totalStr}\n`;
    }

    text += `--------------------------------\n`;
    text += `SOUS-TOTAL:     ${sale.subtotalMinor} FCFA\n`;
    if (sale.discountMinor > 0) {
      text += `REMISE:        -${sale.discountMinor} FCFA\n`;
    }
    text += `TOTAL TTC:      ${sale.totalMinor} FCFA\n`;
    text += `RESTE A PAYER:  ${sale.remainingMinor} FCFA\n`;
    text += `--------------------------------\n`;
    text += `PAIEMENTS:\n`;
    for (const p of sale.payments) {
      text += ` - ${p.method}: ${p.amountMinor} FCFA\n`;
    }
    text += `================================\n`;
    text += `  Merci pour votre confiance !\n`;
    text += `================================\n`;

    return text;
  }
}
