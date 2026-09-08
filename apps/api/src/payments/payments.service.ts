import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { prisma as defaultPrisma } from "@jaama/database";
import { PaymentMethodCode, UserContext } from "@jaama/types";
import { hashCanonicalPayload } from "../common/canonical-hash";

export class RecordPaymentDto {
  method!: PaymentMethodCode;
  amountMinor!: number;
  idempotencyKey!: string;
  notes?: string;
}

export class ListReceivablesQuery {
  search?: string;
  customerId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class PaymentsService {
  /**
   * JAA-S1-05: Atomic, Concurrency-Safe Payment Recording on Sale (Receivables Ledger)
   * Protected with `payments.record` permission.
   * Prevents P0 overpayment and P0 concurrent overcollection.
   */
  public async recordSalePayment(
    userContext: UserContext,
    saleId: string,
    dto: RecordPaymentDto,
    prismaClient = defaultPrisma
  ): Promise<any> {
    const organizationId = userContext.organizationId;
    const actorId = userContext.actorId;
    const operation = "payments.record";
    const idempotencyKey = dto.idempotencyKey;

    if (!idempotencyKey || typeof idempotencyKey !== "string" || !idempotencyKey.trim()) {
      throw new BadRequestException("La clé d'idempotence (idempotencyKey) est obligatoire pour enregistrer un règlement.");
    }

    if (!dto.amountMinor || dto.amountMinor <= 0 || !Number.isInteger(dto.amountMinor)) {
      throw new BadRequestException("Le montant du règlement doit être un entier strictement positif.");
    }

    const requestHash = hashCanonicalPayload({ saleId, ...dto });

    return prismaClient.$transaction(async (tx) => {
      // 1. Idempotency Check
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
              "Conflit d'idempotence : La même clé de règlement a été soumise avec un montant ou des paramètres différents."
            );
          }
          if (existingRecord.status === "COMPLETED" && existingRecord.responseJson) {
            return JSON.parse(existingRecord.responseJson);
          }
          if (existingRecord.status === "PROCESSING") {
            throw new ConflictException("Règlement idempotent en cours de traitement.");
          }
        }

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
          if (e.code === "P2002") {
            throw new ConflictException("Règlement idempotent en cours de traitement.");
          }
          throw e;
        }
      }

      // 2. Lock Sale Row using SELECT FOR UPDATE for Concurrency Safety
      const lockedSales: any[] = await tx.$queryRaw`
        SELECT "id", "organizationId", "totalMinor", "paidMinor", "remainingMinor", "paymentStatus"
        FROM "Sale"
        WHERE "organizationId" = ${organizationId}
          AND "id" = ${saleId}
        FOR UPDATE
      `;

      const sale = lockedSales[0];

      if (!sale) {
        throw new NotFoundException("Vente introuvable dans votre organisation.");
      }

      if (sale.paymentStatus === "PAID" || sale.remainingMinor <= 0) {
        throw new BadRequestException("Cette vente est déjà entièrement réglée.");
      }

      // P0 Overpayment Check: Payment amount cannot exceed current remaining balance
      if (dto.amountMinor > sale.remainingMinor) {
        throw new BadRequestException(
          `Montant supérieur au solde restant. Solde dû : ${sale.remainingMinor} FCFA, montant proposé : ${dto.amountMinor} FCFA.`
        );
      }

      const newPaidMinor = sale.paidMinor + dto.amountMinor;
      const newRemainingMinor = sale.remainingMinor - dto.amountMinor;
      const newPaymentStatus = newRemainingMinor === 0 ? "PAID" : "PARTIALLY_PAID";

      // 3. Create Authoritative Payment Ledger Row
      const payment = await tx.payment.create({
        data: {
          organizationId,
          saleId: sale.id,
          method: dto.method as any,
          amountMinor: dto.amountMinor,
          status: "SUCCESS",
        },
      });

      // 4. Update Sale totals atomically
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

      // 5. Audit & Outbox Events
      await tx.auditEvent.create({
        data: {
          organizationId,
          actorId,
          action: "payment.record",
          resourceType: "Payment",
          resourceId: payment.id,
          metadataJson: JSON.stringify({
            saleId,
            method: dto.method,
            amountMinor: dto.amountMinor,
            remainingMinor: newRemainingMinor,
          }),
        },
      });

      await tx.outboxEvent.create({
        data: {
          organizationId,
          eventType: "PaymentRecorded",
          aggregateType: "Payment",
          aggregateId: payment.id,
          payloadJson: JSON.stringify({
            paymentId: payment.id,
            saleId,
            amountMinor: dto.amountMinor,
            method: dto.method,
          }),
          status: "PENDING",
        },
      });

      const responsePayload = {
        ...updatedSale,
        sale: updatedSale,
        payment,
      };

      // 6. Complete Idempotency Record
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
            responseJson: JSON.stringify(responsePayload),
          },
        });
      }

      return responsePayload;
    });
  }

  /**
   * List receivables (sales with remaining balance to collect)
   */
  public async listReceivables(
    userContext: UserContext,
    query: ListReceivablesQuery = {},
    prismaClient = defaultPrisma
  ): Promise<{ data: any[]; total: number; totalOutstandingMinor: number; page: number; limit: number }> {
    const organizationId = userContext.organizationId;
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      organizationId,
      remainingMinor: { gt: 0 },
      saleStatus: "COMPLETED",
    };

    if (query.customerId) {
      where.customerId = query.customerId;
    }
    if (query.status) {
      where.paymentStatus = query.status;
    }
    if (query.search && query.search.trim().length > 0) {
      const term = query.search.trim();
      where.OR = [
        { reference: { contains: term, mode: "insensitive" } },
        { customer: { name: { contains: term, mode: "insensitive" } } },
      ];
    }

    const [sales, total, aggregate] = await Promise.all([
      prismaClient.sale.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          payments: { orderBy: { recordedAt: "desc" } },
        },
        orderBy: { occurredAt: "desc" },
        skip,
        take: limit,
      }),
      prismaClient.sale.count({ where }),
      prismaClient.sale.aggregate({
        where,
        _sum: { remainingMinor: true },
      }),
    ]);

    return {
      data: sales,
      total,
      totalOutstandingMinor: aggregate._sum.remainingMinor || 0,
      page,
      limit,
    };
  }

  /**
   * Get payment history for a specific sale
   */
  public async getSalePayments(
    userContext: UserContext,
    saleId: string,
    prismaClient = defaultPrisma
  ): Promise<any[]> {
    const organizationId = userContext.organizationId;
    return prismaClient.payment.findMany({
      where: {
        organizationId,
        saleId,
      },
      orderBy: { recordedAt: "desc" },
    });
  }
}
