import { Injectable, BadRequestException } from "@nestjs/common";
import { prisma as defaultPrisma } from "@jaama/database";
import { UserContext } from "@jaama/types";

export interface ImportProductItem {
  sku: string;
  name: string;
  category: string;
  unitPriceMinor: number;
}

@Injectable()
export class DataExchangeService {
  /**
   * JAA-S1-19: CSV / JSON Product Export Engine
   */
  public async exportProductsCsv(
    userContext: UserContext,
    prismaClient = defaultPrisma
  ): Promise<string> {
    const organizationId = userContext.organizationId;
    const products = await prismaClient.product.findMany({
      where: { organizationId, status: { in: ["active", "inactive"] } },
      orderBy: { name: "asc" },
    });

    let csv = "SKU;Nom;Catégorie;PrixUnitaireMinor;Statut\n";
    for (const p of products) {
      const name = p.name.replace(/;/g, ",");
      const category = p.category.replace(/;/g, ",");
      csv += `${p.sku};${name};${category};${p.unitPriceMinor};${p.status}\n`;
    }

    return csv;
  }

  /**
   * JAA-S1-19: Product CSV Import Validation & Bulk Ingestion Engine
   */
  public async importProductsBulk(
    userContext: UserContext,
    items: ImportProductItem[],
    prismaClient = defaultPrisma
  ): Promise<{ importedCount: number; products: any[] }> {
    const organizationId = userContext.organizationId;

    if (!items || items.length === 0) {
      throw new BadRequestException("Aucune donnée de produit fournie pour l'import.");
    }

    for (const item of items) {
      if (!item.sku || item.sku.trim().length === 0) {
        throw new BadRequestException("Chaque produit importé doit comporter un SKU valide.");
      }
      if (!item.name || item.name.trim().length === 0) {
        throw new BadRequestException("Chaque produit importé doit comporter un nom.");
      }
      if (!item.unitPriceMinor || item.unitPriceMinor < 0) {
        throw new BadRequestException(`Prix unitaire invalide pour le produit ${item.sku}.`);
      }
    }

    return prismaClient.$transaction(async (tx) => {
      const createdProducts: any[] = [];

      for (const item of items) {
        const sku = item.sku.trim();
        const existing = await tx.product.findUnique({
          where: {
            organizationId_sku: {
              organizationId,
              sku,
            },
          },
        });

        if (existing) {
          // Update existing product
          const updated = await tx.product.update({
            where: {
              organizationId_sku: {
                organizationId,
                sku,
              },
            },
            data: {
              name: item.name.trim(),
              category: item.category ? item.category.trim() : "Général",
              unitPriceMinor: item.unitPriceMinor,
            },
          });
          createdProducts.push(updated);
        } else {
          // Create product
          const created = await tx.product.create({
            data: {
              organizationId,
              sku,
              name: item.name.trim(),
              category: item.category ? item.category.trim() : "Général",
              unitPriceMinor: item.unitPriceMinor,
              status: "active",
            },
          });

          // Initialize balance
          await tx.inventoryBalance.create({
            data: {
              organizationId,
              productId: created.id,
              availableQuantity: 0,
              reservedQuantity: 0,
            },
          });

          createdProducts.push(created);
        }
      }

      await tx.auditEvent.create({
        data: {
          organizationId,
          actorId: userContext.actorId,
          action: "products.import_bulk",
          resourceType: "product",
          resourceId: "bulk",
          metadataJson: JSON.stringify({ count: createdProducts.length }),
        },
      });

      return {
        importedCount: createdProducts.length,
        products: createdProducts,
      };
    });
  }
}
