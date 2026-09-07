import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { prisma as defaultPrisma } from "@jaama/database";
import { UserContext } from "@jaama/types";
import * as crypto from "crypto";

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

export function escapeCsvField(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return "";
  let str = String(val);
  if (str.startsWith("=") || str.startsWith("+") || str.startsWith("-") || str.startsWith("@")) {
    str = `'${str}`;
  }
  if (str.includes(";") || str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function parseCsvContent(csvText: string): string[][] {
  if (!csvText || !csvText.trim()) return [];

  // Reject binary content
  if (csvText.includes("\0")) {
    throw new BadRequestException("Fichier binaire non pris en charge. Veuillez fournir un fichier CSV UTF-8.");
  }

  // Consistent Delimiter Detection
  let delimiter = ";";
  const firstLine = csvText.split(/\r?\n/)[0] || "";
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;
  if (commaCount > semiCount) {
    delimiter = ",";
  }

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentVal += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentVal += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        currentRow.push(currentVal.trim());
        currentVal = "";
      } else if (char === "\n" || (char === "\r" && nextChar === "\n")) {
        if (char === "\r") i++;
        currentRow.push(currentVal.trim());
        if (currentRow.some((col) => col.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentVal = "";
      } else {
        currentVal += char;
      }
    }
  }

  if (currentVal || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.some((col) => col.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

@Injectable()
export class DataExchangeService {
  /**
   * JAA-S1-16: CSV Product Export Engine with Formula Injection Protection & RFC 4180 Escaping
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
      const sku = escapeCsvField(p.sku);
      const name = escapeCsvField(p.name);
      const category = escapeCsvField(p.category);
      const price = escapeCsvField(p.unitPriceMinor);
      const status = escapeCsvField(p.status);
      csv += `${sku};${name};${category};${price};${status}\n`;
    }

    return csv;
  }

  /**
   * JAA-S1-16: CSV Customer Export Engine
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
      const name = escapeCsvField(c.name);
      const phone = escapeCsvField(c.phone || "");
      const email = escapeCsvField(c.email || "");
      const address = escapeCsvField(c.address || "");
      const type = escapeCsvField(c.type);
      csv += `${name};${phone};${email};${address};${type}\n`;
    }

    return csv;
  }

  /**
   * JAA-S1-16: Product CSV Import Preview Pipeline
   */
  public async previewProductsImport(
    userContext: UserContext,
    csvContent: string,
    originalFileName: string = "products.csv",
    prismaClient = defaultPrisma
  ): Promise<any> {
    const organizationId = userContext.organizationId;

    if (!csvContent || !csvContent.trim()) {
      throw new BadRequestException("Fichier CSV vide ou invalide.");
    }

    // Configurable limit checks
    if (Buffer.byteLength(csvContent, "utf-8") > 5 * 1024 * 1024) {
      throw new BadRequestException("La taille du fichier CSV dépasse la limite autorisée de 5 Mo.");
    }

    const rows = parseCsvContent(csvContent);
    if (rows.length < 2) {
      throw new BadRequestException("Le fichier CSV doit contenir un en-tête et au moins une ligne de données.");
    }

    if (rows.length > 1001) {
      throw new BadRequestException("Le fichier CSV dépasse la limite de 1000 lignes.");
    }

    const headers = rows[0].map((h) => h.toLowerCase().trim().replace(/^'/, ""));
    const skuIdx = headers.findIndex((h) => h.includes("sku"));
    const nameIdx = headers.findIndex((h) => h.includes("nom") || h.includes("name"));
    const priceIdx = headers.findIndex((h) => h.includes("prix") || h.includes("price"));
    const catIdx = headers.findIndex((h) => h.includes("cat"));

    if (skuIdx === -1 || nameIdx === -1 || priceIdx === -1) {
      throw new BadRequestException("Les colonnes requises (SKU, Nom, PrixUnitaireMinor) sont absentes du fichier CSV.");
    }

    const validRows: ImportProductItem[] = [];
    const invalidRows: { rowNumber: number; reason: string }[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const skuRaw = row[skuIdx] ? row[skuIdx].replace(/^'/, "").trim() : "";
      const nameRaw = row[nameIdx] ? row[nameIdx].replace(/^'/, "").trim() : "";
      const priceRaw = row[priceIdx] ? parseInt(row[priceIdx].replace(/[^0-9]/g, ""), 10) : NaN;
      const catRaw = catIdx !== -1 && row[catIdx] ? row[catIdx].replace(/^'/, "").trim() : "Général";

      if (!skuRaw) {
        invalidRows.push({ rowNumber: i + 1, reason: "SKU manquant" });
        continue;
      }
      if (!nameRaw) {
        invalidRows.push({ rowNumber: i + 1, reason: "Nom manquant" });
        continue;
      }
      if (isNaN(priceRaw) || priceRaw < 0) {
        invalidRows.push({ rowNumber: i + 1, reason: "Prix unitaire invalide" });
        continue;
      }

      validRows.push({
        sku: skuRaw.toUpperCase(),
        name: nameRaw,
        category: catRaw || "Général",
        unitPriceMinor: priceRaw,
      });
    }

    const normalizedJson = JSON.stringify(validRows);
    const validationErrorsJson = JSON.stringify(invalidRows);
    const contentHash = crypto.createHash("sha256").update(normalizedJson).digest("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const batch = await prismaClient.importBatch.create({
      data: {
        organizationId,
        actorId: userContext.actorId,
        entityType: "products",
        originalFileName,
        contentHash,
        normalizedPayloadJson: normalizedJson,
        validationErrorsJson,
        status: "PREVIEWED",
        expiresAt,
      },
    });

    return {
      batchId: batch.id,
      rowCount: rows.length - 1,
      validCount: validRows.length,
      invalidCount: invalidRows.length,
      sampleRows: validRows.slice(0, 5),
      validationErrors: invalidRows,
      contentHash,
    };
  }

  /**
   * JAA-S1-16: Confirm Product CSV Import Execution
   */
  public async confirmProductsImport(
    userContext: UserContext,
    batchId: string,
    idempotencyKey: string,
    prismaClient = defaultPrisma
  ): Promise<{ importedCount: number; products: any[] }> {
    const organizationId = userContext.organizationId;

    if (!idempotencyKey || !idempotencyKey.trim()) {
      throw new BadRequestException("Un jeton d'idempotence (idempotencyKey) est obligatoire pour confirmer l'import.");
    }

    const batch = await prismaClient.importBatch.findUnique({
      where: {
        organizationId_id: {
          organizationId,
          id: batchId,
        },
      },
    });

    if (!batch) {
      throw new NotFoundException("Lot d'import (ImportBatch) introuvable.");
    }

    if (batch.status === "EXPIRED" || batch.expiresAt < new Date()) {
      throw new BadRequestException("Ce lot d'import a expiré.");
    }

    if (batch.status === "COMPLETED") {
      // Return existing completed batch summary if re-requested
      const items: ImportProductItem[] = JSON.parse(batch.normalizedPayloadJson || "[]");
      const existingProds = await prismaClient.product.findMany({
        where: {
          organizationId,
          sku: { in: items.map((i) => i.sku) },
        },
      });
      return { importedCount: existingProds.length, products: existingProds };
    }

    const canonicalHash = crypto
      .createHash("sha256")
      .update(`products:${batchId}:${batch.contentHash}`)
      .digest("hex");

    const existingRecord = await prismaClient.idempotencyRecord.findUnique({
      where: {
        organizationId_operation_idempotencyKey: {
          organizationId,
          operation: "imports.products.confirm",
          idempotencyKey,
        },
      },
    });

    if (existingRecord) {
      if (existingRecord.requestHash !== canonicalHash) {
        throw new ConflictException("Clé d'idempotence déjà utilisée pour une opération différente.");
      }
      if (existingRecord.status === "COMPLETED" && existingRecord.responseJson) {
        return JSON.parse(existingRecord.responseJson);
      }
    }

    const items: ImportProductItem[] = JSON.parse(batch.normalizedPayloadJson || "[]");
    if (items.length === 0) {
      throw new BadRequestException("Aucune donnée valide à importer dans ce lot.");
    }

    return prismaClient.$transaction(async (tx) => {
      await tx.idempotencyRecord.upsert({
        where: {
          organizationId_operation_idempotencyKey: {
            organizationId,
            operation: "imports.products.confirm",
            idempotencyKey,
          },
        },
        create: {
          organizationId,
          operation: "imports.products.confirm",
          idempotencyKey,
          requestHash: canonicalHash,
          status: "PROCESSING",
        },
        update: {
          status: "PROCESSING",
        },
      });

      const result = await this.importProductsBulk(userContext, items, undefined, tx as any);

      await tx.importBatch.update({
        where: { id: batchId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });

      await tx.idempotencyRecord.update({
        where: {
          organizationId_operation_idempotencyKey: {
            organizationId,
            operation: "imports.products.confirm",
            idempotencyKey,
          },
        },
        data: {
          status: "COMPLETED",
          responseJson: JSON.stringify(result),
        },
      });

      return result;
    });
  }

  /**
   * JAA-S1-16: Customer CSV Import Preview Pipeline
   */
  public async previewCustomersImport(
    userContext: UserContext,
    csvContent: string,
    originalFileName: string = "customers.csv",
    prismaClient = defaultPrisma
  ): Promise<any> {
    const organizationId = userContext.organizationId;

    if (!csvContent || !csvContent.trim()) {
      throw new BadRequestException("Fichier CSV vide ou invalide.");
    }

    if (Buffer.byteLength(csvContent, "utf-8") > 5 * 1024 * 1024) {
      throw new BadRequestException("La taille du fichier CSV dépasse la limite autorisée de 5 Mo.");
    }

    const rows = parseCsvContent(csvContent);
    if (rows.length < 2) {
      throw new BadRequestException("Le fichier CSV doit contenir un en-tête et au moins une ligne de données.");
    }

    const headers = rows[0].map((h) => h.toLowerCase().trim().replace(/^'/, ""));
    const nameIdx = headers.findIndex((h) => h.includes("nom") || h.includes("name"));
    const phoneIdx = headers.findIndex((h) => h.includes("tél") || h.includes("phone"));
    const emailIdx = headers.findIndex((h) => h.includes("email") || h.includes("courriel"));
    const addressIdx = headers.findIndex((h) => h.includes("adresse") || h.includes("address"));

    if (nameIdx === -1) {
      throw new BadRequestException("La colonne requise (Nom) est absente du fichier CSV.");
    }

    const validRows: ImportCustomerItem[] = [];
    const invalidRows: { rowNumber: number; reason: string }[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const nameRaw = row[nameIdx] ? row[nameIdx].replace(/^'/, "").trim() : "";
      const phoneRaw = phoneIdx !== -1 && row[phoneIdx] ? row[phoneIdx].replace(/^'/, "").trim() : undefined;
      const emailRaw = emailIdx !== -1 && row[emailIdx] ? row[emailIdx].replace(/^'/, "").trim() : undefined;
      const addressRaw = addressIdx !== -1 && row[addressIdx] ? row[addressIdx].replace(/^'/, "").trim() : undefined;

      if (!nameRaw) {
        invalidRows.push({ rowNumber: i + 1, reason: "Nom du client manquant" });
        continue;
      }

      validRows.push({
        name: nameRaw,
        phone: phoneRaw,
        email: emailRaw,
        address: addressRaw,
      });
    }

    const normalizedJson = JSON.stringify(validRows);
    const validationErrorsJson = JSON.stringify(invalidRows);
    const contentHash = crypto.createHash("sha256").update(normalizedJson).digest("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const batch = await prismaClient.importBatch.create({
      data: {
        organizationId,
        actorId: userContext.actorId,
        entityType: "customers",
        originalFileName,
        contentHash,
        normalizedPayloadJson: normalizedJson,
        validationErrorsJson,
        status: "PREVIEWED",
        expiresAt,
      },
    });

    return {
      batchId: batch.id,
      rowCount: rows.length - 1,
      validCount: validRows.length,
      invalidCount: invalidRows.length,
      sampleRows: validRows.slice(0, 5),
      validationErrors: invalidRows,
      contentHash,
    };
  }

  /**
   * JAA-S1-16: Confirm Customer CSV Import Execution
   */
  public async confirmCustomersImport(
    userContext: UserContext,
    batchId: string,
    idempotencyKey: string,
    prismaClient = defaultPrisma
  ): Promise<{ importedCount: number; customers: any[] }> {
    const organizationId = userContext.organizationId;

    if (!idempotencyKey || !idempotencyKey.trim()) {
      throw new BadRequestException("Un jeton d'idempotence (idempotencyKey) est obligatoire pour confirmer l'import.");
    }

    const batch = await prismaClient.importBatch.findUnique({
      where: {
        organizationId_id: {
          organizationId,
          id: batchId,
        },
      },
    });

    if (!batch) {
      throw new NotFoundException("Lot d'import (ImportBatch) introuvable.");
    }

    if (batch.status === "EXPIRED" || batch.expiresAt < new Date()) {
      throw new BadRequestException("Ce lot d'import a expiré.");
    }

    const canonicalHash = crypto
      .createHash("sha256")
      .update(`customers:${batchId}:${batch.contentHash}`)
      .digest("hex");

    const existingRecord = await prismaClient.idempotencyRecord.findUnique({
      where: {
        organizationId_operation_idempotencyKey: {
          organizationId,
          operation: "imports.customers.confirm",
          idempotencyKey,
        },
      },
    });

    if (existingRecord) {
      if (existingRecord.requestHash !== canonicalHash) {
        throw new ConflictException("Clé d'idempotence déjà utilisée pour une opération différente.");
      }
      if (existingRecord.status === "COMPLETED" && existingRecord.responseJson) {
        return JSON.parse(existingRecord.responseJson);
      }
    }

    const items: ImportCustomerItem[] = JSON.parse(batch.normalizedPayloadJson || "[]");
    if (items.length === 0) {
      throw new BadRequestException("Aucune donnée valide à importer dans ce lot.");
    }

    return prismaClient.$transaction(async (tx) => {
      await tx.idempotencyRecord.upsert({
        where: {
          organizationId_operation_idempotencyKey: {
            organizationId,
            operation: "imports.customers.confirm",
            idempotencyKey,
          },
        },
        create: {
          organizationId,
          operation: "imports.customers.confirm",
          idempotencyKey,
          requestHash: canonicalHash,
          status: "PROCESSING",
        },
        update: {
          status: "PROCESSING",
        },
      });

      const result = await this.importCustomersBulk(userContext, items, undefined, tx as any);

      await tx.importBatch.update({
        where: { id: batchId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });

      await tx.idempotencyRecord.update({
        where: {
          organizationId_operation_idempotencyKey: {
            organizationId,
            operation: "imports.customers.confirm",
            idempotencyKey,
          },
        },
        data: {
          status: "COMPLETED",
          responseJson: JSON.stringify(result),
        },
      });

      return result;
    });
  }

  /**
   * JAA-S1-16: Product CSV Import Validation & Bulk Ingestion Engine
   */
  public async importProductsBulk(
    userContext: UserContext,
    items: ImportProductItem[],
    idempotencyKey?: string,
    prismaClient: any = defaultPrisma
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

    if (idempotencyKey) {
      const existingRecord = await prismaClient.idempotencyRecord.findUnique({
        where: {
          organizationId_operation_idempotencyKey: {
            organizationId,
            operation: "products.import",
            idempotencyKey,
          },
        },
      });
      if (existingRecord && existingRecord.status === "COMPLETED" && existingRecord.responseJson) {
        return JSON.parse(existingRecord.responseJson);
      }
    }

    const runImport = async (tx: any) => {
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

      const responsePayload = {
        importedCount: createdProducts.length,
        products: createdProducts,
      };

      if (idempotencyKey) {
        await tx.idempotencyRecord.upsert({
          where: {
            organizationId_operation_idempotencyKey: {
              organizationId,
              operation: "products.import",
              idempotencyKey,
            },
          },
          create: {
            organizationId,
            operation: "products.import",
            idempotencyKey,
            requestHash: "bulk-import-products",
            status: "COMPLETED",
            responseJson: JSON.stringify(responsePayload),
          },
          update: {
            status: "COMPLETED",
            responseJson: JSON.stringify(responsePayload),
          },
        });
      }

      return responsePayload;
    };

    if ((prismaClient as any).$transaction && typeof (prismaClient as any).$transaction === "function") {
      return prismaClient.$transaction(async (tx: any) => runImport(tx));
    } else {
      return runImport(prismaClient);
    }
  }

  /**
   * JAA-S1-16: Customer CSV Import & Bulk Ingestion Engine
   */
  public async importCustomersBulk(
    userContext: UserContext,
    items: ImportCustomerItem[],
    idempotencyKey?: string,
    prismaClient: any = defaultPrisma
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

    if (idempotencyKey) {
      const existingRecord = await prismaClient.idempotencyRecord.findUnique({
        where: {
          organizationId_operation_idempotencyKey: {
            organizationId,
            operation: "customers.import",
            idempotencyKey,
          },
        },
      });
      if (existingRecord && existingRecord.status === "COMPLETED" && existingRecord.responseJson) {
        return JSON.parse(existingRecord.responseJson);
      }
    }

    const runImport = async (tx: any) => {
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

      const responsePayload = {
        importedCount: createdCustomers.length,
        customers: createdCustomers,
      };

      if (idempotencyKey) {
        await tx.idempotencyRecord.upsert({
          where: {
            organizationId_operation_idempotencyKey: {
              organizationId,
              operation: "customers.import",
              idempotencyKey,
            },
          },
          create: {
            organizationId,
            operation: "customers.import",
            idempotencyKey,
            requestHash: "bulk-import-customers",
            status: "COMPLETED",
            responseJson: JSON.stringify(responsePayload),
          },
          update: {
            status: "COMPLETED",
            responseJson: JSON.stringify(responsePayload),
          },
        });
      }

      return responsePayload;
    };

    if ((prismaClient as any).$transaction && typeof (prismaClient as any).$transaction === "function") {
      return prismaClient.$transaction(async (tx: any) => runImport(tx));
    } else {
      return runImport(prismaClient);
    }
  }
}
