import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { prisma as defaultPrisma } from "@jaama/database";
import { UserContext } from "@jaama/types";

export class CreateExpenseDto {
  category!: string;
  description?: string;
  amountMinor!: number;
  occurredAt?: string;
  notes?: string;
  paymentMethod?: string;
}

export class ListExpensesQuery {
  category?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class ExpensesService {
  public async createExpense(
    userContext: UserContext,
    dto: CreateExpenseDto,
    prismaClient = defaultPrisma
  ): Promise<any> {
    const organizationId = userContext.organizationId;

    if (!dto.category || dto.category.trim().length === 0) {
      throw new BadRequestException("La catégorie de dépense est obligatoire.");
    }
    if (!dto.amountMinor || dto.amountMinor <= 0) {
      throw new BadRequestException("Le montant de la dépense doit être un entier positif (FCFA).");
    }

    return prismaClient.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          organizationId,
          category: dto.category.trim(),
          description: dto.description ? dto.description.trim() : dto.category.trim(),
          amountMinor: dto.amountMinor,
          occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : new Date(),
          notes: dto.notes ? dto.notes.trim() : null,
          paymentMethod: dto.paymentMethod ? dto.paymentMethod.trim() : "ESPECES",
          createdByUserId: userContext.actorId,
        },
      });

      await tx.auditEvent.create({
        data: {
          organizationId,
          actorId: userContext.actorId,
          action: "expense.create",
          resourceType: "expense",
          resourceId: expense.id,
          metadataJson: JSON.stringify({ category: expense.category, amountMinor: expense.amountMinor }),
        },
      });

      await tx.outboxEvent.create({
        data: {
          organizationId,
          eventType: "ExpenseCreated",
          aggregateType: "Expense",
          aggregateId: expense.id,
          payloadJson: JSON.stringify({ expenseId: expense.id, amountMinor: expense.amountMinor }),
        },
      });

      return expense;
    });
  }

  public async getExpense(
    userContext: UserContext,
    expenseId: string,
    prismaClient = defaultPrisma
  ): Promise<any> {
    const organizationId = userContext.organizationId;
    const expense = await prismaClient.expense.findUnique({
      where: {
        organizationId_id: {
          organizationId,
          id: expenseId,
        },
      },
    });

    if (!expense) {
      throw new NotFoundException("Dépense introuvable.");
    }

    return expense;
  }

  public async listExpenses(
    userContext: UserContext,
    query: ListExpensesQuery = {},
    prismaClient = defaultPrisma
  ): Promise<{ data: any[]; total: number; totalAmountMinor: number; page: number; limit: number }> {
    const organizationId = userContext.organizationId;
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = { organizationId };

    if (query.category) {
      where.category = query.category;
    }
    if (query.startDate || query.endDate) {
      where.occurredAt = {};
      if (query.startDate) where.occurredAt.gte = new Date(query.startDate);
      if (query.endDate) where.occurredAt.lte = new Date(query.endDate);
    }

    const [expenses, total, sumAggregate] = await Promise.all([
      prismaClient.expense.findMany({
        where,
        orderBy: { occurredAt: "desc" },
        skip,
        take: limit,
      }),
      prismaClient.expense.count({ where }),
      prismaClient.expense.aggregate({
        where,
        _sum: { amountMinor: true },
      }),
    ]);

    return {
      data: expenses,
      total,
      totalAmountMinor: sumAggregate._sum.amountMinor || 0,
      page,
      limit,
    };
  }
}
