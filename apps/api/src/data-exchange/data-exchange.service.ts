import { Injectable, BadRequestException } from "@nestjs/common";
import { prisma as defaultPrisma } from "@jaama/database";
import { UserContext } from "@jaama/types";

export class ImportProductItem {
  sku!: string;
  name!: string;
  category!: string;
  unitPriceMinor!: number;
}

export class ImportCustomerItem {
  name!: string;
  phone?: string;
  email?: string;
  address?: string;
}

export function sanitizeCsvField(val: string): string {
  if (!val) return "";
  const clean = val.replace(/;/g, ",").replace(/[\r\n]/g, " ");
  if (clean.startsWith("=") || clean.startsWith("+") || clean.startsWith("-") || clean.startsWith("@")) {
    return `'${clean}`;
  }
  return clean;
}

@Injectable()
export class DataExchangeService {
  /**
   * JAA-S1-16: CSV Product Export Engine with Formula Injection Protection
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
      const sku = sanitizeCsvField(p.sku);
      const name = sanitizeCsvField(p.name);
      const category = sanitizeCsvField(p.category);
      csv += `${sku};${name};${category};${p.unitPriceMinor};${p.status}\n`;
    }

    return csv;
  }

  /**
   * JAA-S1-16: Product CSV Import Validation & Bulk Ingestion Engine
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
      if (item.unitPriceMinor === undefined || item.unitPriceMinor < 0) {
        throw new BadRequestException(`Prix unitaire invalide pour le produit ${item.sku}.`);
      }
    }

    return prismaClient.$transaction(async (tx) => {
      const createdProducts: any[] = [];

      for (const item of items) {
        const rawSku = item.sku.startsWith("'") ? item.sku.substring(1) : item.sku;
        const sku = rawSku.trim().toUpperCase();
        const rawName = item.name.startsWith("'") ? item.name.substring(1) : item.name;
        const name = rawName.trim();
        const rawCat = item.category ? (item.category.startsWith("'") ? item.category.substring(1) : item.category) : "Général";
        const category = rawCat.trim();

        const existing = await tx.product.findUnique({
          where: {
            organizationId_sku: {
              organizationId,
              sku,
            },
          },
        });

        if (existing) {
          const updated = await tx.product.update({
            where: {
              organizationId_sku: {
                organizationId,
                sku,
              },
            },
            data: {
              name,
              category,
              unitPriceMinor: item.unitPriceMinor,
            },
          });
          createdProducts.push(updated);
        } else {
          const created = await tx.product.create({
            data: {
              organizationId,
              sku,
              name,
              category,
              unitPriceMinor: item.unitPriceMinor,
              status: "active",
            },
          });

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

  /**
   * JAA-S1-16: CSV Customer Export Engine with Formula Injection Defense
   */
  public async exportCustomersCsv(
    userContext: UserContext,
    prismaClient = defaultPrisma
  ): Promise<string> {
    const organizationId = userContext.organizationId;
    const customers = await prismaClient.customer.findMany({
      where: { organizationId, status: "active" },
      orderBy: { name: "asc" },
    });

    let csv = "Nom;Téléphone;Email;Adresse;Type\n";
    for (const c of customers) {
      const name = sanitizeCsvField(c.name);
      const phone = sanitizeCsvField(c.phone || "");
      const email = sanitizeCsvField(c.email || "");
      const address = sanitizeCsvField(c.address || "");
      csv += `${name};${phone};${email};${address};${c.type}\n`;
    }

    return csv;
  }

  /**
   * JAA-S1-16: Customer CSV Import & Bulk Ingestion Engine
   */
  public async importCustomersBulk(
    userContext: UserContext,
    items: ImportCustomerItem[],
    prismaClient = defaultPrisma
  ): Promise<{ importedCount: number; customers: any[] }> {
    const organizationId = userContext.organizationId;

    if (!items || items.length === 0) {
      throw new BadRequestException("Aucune donnée de client fournie pour l'import.");
    }

    for (const item of items) {
      if (!item.name || item.name.trim().length === 0) {
        throw new BadRequestException("Chaque client importé doit comporter un nom.");
      }
    }

    return prismaClient.$transaction(async (tx) => {
      const createdCustomers: any[] = [];

      for (const item of items) {
        const rawName = item.name.startsWith("'") ? item.name.substring(1) : item.name;
        const name = rawName.trim();

        const created = await tx.customer.create({
          data: {
            organizationId,
            name,
            phone: item.phone ? (item.phone.startsWith("'") ? item.phone.substring(1) : item.phone).trim() : null,
            email: item.email ? (item.email.startsWith("'") ? item.email.substring(1) : item.email).trim() : null,
            address: item.address ? (item.address.startsWith("'") ? item.address.substring(1) : item.address).trim() : null,
            status: "active",
            type: "registered",
          },
        });
        createdCustomers.push(created);
      }

      await tx.auditEvent.create({
        data: {
          organizationId,
          actorId: userContext.actorId,
          action: "customers.import_bulk",
          resourceType: "customer",
          resourceId: "bulk",
          metadataJson: JSON.stringify({ count: createdCustomers.length }),
        },
      });

      return {
        importedCount: createdCustomers.length,
        customers: createdCustomers,
      };
    });
  }
}
