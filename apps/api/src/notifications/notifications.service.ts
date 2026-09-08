import { Injectable } from "@nestjs/common";
import { prisma as defaultPrisma } from "@jaama/database";
import { UserContext } from "@jaama/types";

export interface NotificationItem {
  id: string;
  type: "low_stock" | "out_of_stock" | "receivable_due" | "system";
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  linkUrl?: string;
}

@Injectable()
export class NotificationsService {
  public async getNotifications(
    userContext: UserContext,
    prismaClient = defaultPrisma
  ): Promise<{ items: NotificationItem[]; unreadCount: number }> {
    const organizationId = userContext.organizationId;

    const [lowStockProducts, overdueSales] = await Promise.all([
      prismaClient.product.findMany({
        where: {
          organizationId,
          status: "active",
          inventoryBalances: {
            some: { availableQuantity: { lte: 5 } },
          },
        },
        include: { inventoryBalances: true },
        take: 10,
      }),
      prismaClient.sale.findMany({
        where: {
          organizationId,
          remainingMinor: { gt: 0 },
          saleStatus: "COMPLETED",
        },
        include: { customer: true },
        orderBy: { occurredAt: "asc" },
        take: 10,
      }),
    ]);

    const items: NotificationItem[] = [];

    for (const p of lowStockProducts) {
      const avail = p.inventoryBalances[0]?.availableQuantity ?? 0;
      const isOut = avail <= 0;
      items.push({
        id: `notif-stock-${p.id}`,
        type: isOut ? "out_of_stock" : "low_stock",
        title: isOut ? `Rupture de stock : ${p.name}` : `Stock bas : ${p.name}`,
        message: isOut
          ? `Le produit ${p.name} (${p.sku}) est en rupture totale.`
          : `Le produit ${p.name} n'a plus que ${avail} unité(s) en stock.`,
        read: false,
        createdAt: new Date().toISOString(),
        linkUrl: "/stocks",
      });
    }

    for (const s of overdueSales) {
      items.push({
        id: `notif-rec-${s.id}`,
        type: "receivable_due",
        title: `Impayé en attente : ${s.reference}`,
        message: `La vente ${s.reference} (${s.customer?.name || "Client comptoir"}) présente un solde dû de ${s.remainingMinor} FCFA.`,
        read: false,
        createdAt: s.occurredAt.toISOString(),
        linkUrl: "/paiements",
      });
    }

    return {
      items,
      unreadCount: items.filter((i) => !i.read).length,
    };
  }
}
