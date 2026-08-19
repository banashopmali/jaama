-- AlterEnum
ALTER TYPE "StockMovementType" ADD VALUE 'OPENING';
ALTER TYPE "StockMovementType" ADD VALUE 'ADJUSTMENT_IN';
ALTER TYPE "StockMovementType" ADD VALUE 'ADJUSTMENT_OUT';
ALTER TYPE "StockMovementType" ADD VALUE 'RETURN_IN';
ALTER TYPE "StockMovementType" ADD VALUE 'RETURN_OUT';

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PurchaseStatus" AS ENUM ('DRAFT', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');

-- AlterTable Product
ALTER TABLE "Product" ADD COLUMN "description" TEXT,
ADD COLUMN "costMinor" INTEGER,
ADD COLUMN "currencyCode" TEXT NOT NULL DEFAULT 'XOF',
ADD COLUMN "barcode" TEXT,
ADD COLUMN "lowStockThreshold" INTEGER DEFAULT 5;

-- AlterTable Customer
ALTER TABLE "Customer" ADD COLUMN "email" TEXT,
ADD COLUMN "address" TEXT,
ADD COLUMN "notes" TEXT,
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active';

-- CreateTable Quote
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "customerId" TEXT,
    "subtotalMinor" INTEGER NOT NULL,
    "discountMinor" INTEGER NOT NULL DEFAULT 0,
    "totalMinor" INTEGER NOT NULL,
    "expirationDate" TIMESTAMP(3),
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable QuoteLine
CREATE TABLE "QuoteLine" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productNameSnapshot" TEXT NOT NULL,
    "skuSnapshot" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPriceMinor" INTEGER NOT NULL,
    "lineTotalMinor" INTEGER NOT NULL,

    CONSTRAINT "QuoteLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable Invoice
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "saleId" TEXT,
    "customerId" TEXT,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "subtotalMinor" INTEGER NOT NULL,
    "discountMinor" INTEGER NOT NULL DEFAULT 0,
    "totalMinor" INTEGER NOT NULL,
    "paidMinor" INTEGER NOT NULL DEFAULT 0,
    "remainingMinor" INTEGER NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'ISSUED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable InvoiceLine
CREATE TABLE "InvoiceLine" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productNameSnapshot" TEXT NOT NULL,
    "skuSnapshot" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPriceMinor" INTEGER NOT NULL,
    "lineTotalMinor" INTEGER NOT NULL,

    CONSTRAINT "InvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable Supplier
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable Expense
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'XOF',
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentMethod" TEXT,
    "supplierId" TEXT,
    "reference" TEXT,
    "notes" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable Purchase
CREATE TABLE "Purchase" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "totalMinor" INTEGER NOT NULL,
    "status" "PurchaseStatus" NOT NULL DEFAULT 'DRAFT',
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable PurchaseLine
CREATE TABLE "PurchaseLine" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "orderedQuantity" INTEGER NOT NULL,
    "receivedQuantity" INTEGER NOT NULL DEFAULT 0,
    "unitCostMinor" INTEGER NOT NULL,
    "lineTotalMinor" INTEGER NOT NULL,

    CONSTRAINT "PurchaseLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable Receiving
CREATE TABLE "Receiving" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Receiving_pkey" PRIMARY KEY ("id")
);

-- CreateTable ReceivingLine
CREATE TABLE "ReceivingLine" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "receivingId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantityReceived" INTEGER NOT NULL,

    CONSTRAINT "ReceivingLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable Notification
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "resourceLink" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE UNIQUE INDEX "Quote_organizationId_id_key" ON "Quote"("organizationId", "id");
CREATE UNIQUE INDEX "Quote_organizationId_reference_key" ON "Quote"("organizationId", "reference");
CREATE INDEX "Quote_organizationId_customerId_idx" ON "Quote"("organizationId", "customerId");

CREATE UNIQUE INDEX "QuoteLine_organizationId_id_key" ON "QuoteLine"("organizationId", "id");
CREATE INDEX "QuoteLine_organizationId_quoteId_idx" ON "QuoteLine"("organizationId", "quoteId");

CREATE UNIQUE INDEX "Invoice_organizationId_id_key" ON "Invoice"("organizationId", "id");
CREATE UNIQUE INDEX "Invoice_organizationId_reference_key" ON "Invoice"("organizationId", "reference");
CREATE INDEX "Invoice_organizationId_customerId_idx" ON "Invoice"("organizationId", "customerId");

CREATE UNIQUE INDEX "InvoiceLine_organizationId_id_key" ON "InvoiceLine"("organizationId", "id");
CREATE INDEX "InvoiceLine_organizationId_invoiceId_idx" ON "InvoiceLine"("organizationId", "invoiceId");

CREATE UNIQUE INDEX "Supplier_organizationId_id_key" ON "Supplier"("organizationId", "id");
CREATE INDEX "Supplier_organizationId_name_idx" ON "Supplier"("organizationId", "name");

CREATE UNIQUE INDEX "Expense_organizationId_id_key" ON "Expense"("organizationId", "id");
CREATE INDEX "Expense_organizationId_category_occurredAt_idx" ON "Expense"("organizationId", "category", "occurredAt");

CREATE UNIQUE INDEX "Purchase_organizationId_id_key" ON "Purchase"("organizationId", "id");
CREATE UNIQUE INDEX "Purchase_organizationId_reference_key" ON "Purchase"("organizationId", "reference");
CREATE INDEX "Purchase_organizationId_supplierId_idx" ON "Purchase"("organizationId", "supplierId");

CREATE UNIQUE INDEX "PurchaseLine_organizationId_id_key" ON "PurchaseLine"("organizationId", "id");
CREATE INDEX "PurchaseLine_organizationId_purchaseId_idx" ON "PurchaseLine"("organizationId", "purchaseId");

CREATE UNIQUE INDEX "Receiving_organizationId_id_key" ON "Receiving"("organizationId", "id");
CREATE UNIQUE INDEX "Receiving_organizationId_reference_key" ON "Receiving"("organizationId", "reference");
CREATE INDEX "Receiving_organizationId_purchaseId_idx" ON "Receiving"("organizationId", "purchaseId");

CREATE UNIQUE INDEX "ReceivingLine_organizationId_id_key" ON "ReceivingLine"("organizationId", "id");
CREATE INDEX "ReceivingLine_organizationId_receivingId_idx" ON "ReceivingLine"("organizationId", "receivingId");

CREATE UNIQUE INDEX "Notification_organizationId_id_key" ON "Notification"("organizationId", "id");
CREATE INDEX "Notification_organizationId_userId_isRead_createdAt_idx" ON "Notification"("organizationId", "userId", "isRead", "createdAt");

-- AddForeignKeys
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_organizationId_customerId_fkey" FOREIGN KEY ("organizationId", "customerId") REFERENCES "Customer"("organizationId", "id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "QuoteLine" ADD CONSTRAINT "QuoteLine_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuoteLine" ADD CONSTRAINT "QuoteLine_organizationId_quoteId_fkey" FOREIGN KEY ("organizationId", "quoteId") REFERENCES "Quote"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuoteLine" ADD CONSTRAINT "QuoteLine_organizationId_productId_fkey" FOREIGN KEY ("organizationId", "productId") REFERENCES "Product"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_organizationId_saleId_fkey" FOREIGN KEY ("organizationId", "saleId") REFERENCES "Sale"("organizationId", "id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_organizationId_customerId_fkey" FOREIGN KEY ("organizationId", "customerId") REFERENCES "Customer"("organizationId", "id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_organizationId_invoiceId_fkey" FOREIGN KEY ("organizationId", "invoiceId") REFERENCES "Invoice"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_organizationId_productId_fkey" FOREIGN KEY ("organizationId", "productId") REFERENCES "Product"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Expense" ADD CONSTRAINT "Expense_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_organizationId_supplierId_fkey" FOREIGN KEY ("organizationId", "supplierId") REFERENCES "Supplier"("organizationId", "id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_organizationId_supplierId_fkey" FOREIGN KEY ("organizationId", "supplierId") REFERENCES "Supplier"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PurchaseLine" ADD CONSTRAINT "PurchaseLine_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PurchaseLine" ADD CONSTRAINT "PurchaseLine_organizationId_purchaseId_fkey" FOREIGN KEY ("organizationId", "purchaseId") REFERENCES "Purchase"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PurchaseLine" ADD CONSTRAINT "PurchaseLine_organizationId_productId_fkey" FOREIGN KEY ("organizationId", "productId") REFERENCES "Product"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Receiving" ADD CONSTRAINT "Receiving_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Receiving" ADD CONSTRAINT "Receiving_organizationId_purchaseId_fkey" FOREIGN KEY ("organizationId", "purchaseId") REFERENCES "Purchase"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Receiving" ADD CONSTRAINT "Receiving_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ReceivingLine" ADD CONSTRAINT "ReceivingLine_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReceivingLine" ADD CONSTRAINT "ReceivingLine_organizationId_receivingId_fkey" FOREIGN KEY ("organizationId", "receivingId") REFERENCES "Receiving"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReceivingLine" ADD CONSTRAINT "ReceivingLine_organizationId_productId_fkey" FOREIGN KEY ("organizationId", "productId") REFERENCES "Product"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Notification" ADD CONSTRAINT "Notification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
