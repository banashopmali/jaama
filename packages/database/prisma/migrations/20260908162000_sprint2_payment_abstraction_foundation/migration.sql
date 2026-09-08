-- CreateEnum
CREATE TYPE "PaymentIntentStatus" AS ENUM ('REQUIRES_PAYMENT', 'PROCESSING', 'PARTIALLY_PAID', 'PAID', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PaymentAttemptStatus" AS ENUM ('CREATED', 'PENDING_PROVIDER', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('PENDING', 'PARTIALLY_SETTLED', 'SETTLED', 'RECONCILIATION_REQUIRED', 'RECONCILED', 'FAILED');

-- CreateEnum
CREATE TYPE "WebhookEventStatus" AS ENUM ('RECEIVED', 'PROCESSING', 'PROCESSED', 'FAILED', 'IGNORED');

-- CreateEnum
CREATE TYPE "PaymentReconciliationStatus" AS ENUM ('MATCHED', 'DISCREPANCY_AMOUNT', 'DISCREPANCY_STATUS', 'UNMATCHED_PROVIDER', 'UNMATCHED_INTERNAL');

-- CreateEnum
CREATE TYPE "PaymentProviderType" AS ENUM ('mock', 'wave', 'orange_money', 'moov_money', 'mtn_momo', 'bank_transfer');

-- CreateTable
CREATE TABLE "PaymentProviderConfig" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" "PaymentProviderType" NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isTestMode" BOOLEAN NOT NULL DEFAULT true,
    "apiKeyEncrypted" TEXT,
    "apiSecretEncrypted" TEXT,
    "webhookSecret" TEXT,
    "merchantId" TEXT,
    "metadataJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentProviderConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentIntent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'XOF',
    "status" "PaymentIntentStatus" NOT NULL DEFAULT 'REQUIRES_PAYMENT',
    "saleId" TEXT,
    "customerId" TEXT,
    "description" TEXT,
    "metadataJson" TEXT NOT NULL DEFAULT '{}',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentIntent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAttempt" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "paymentIntentId" TEXT NOT NULL,
    "provider" "PaymentProviderType" NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'XOF',
    "status" "PaymentAttemptStatus" NOT NULL DEFAULT 'CREATED',
    "idempotencyKey" TEXT NOT NULL,
    "providerReference" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "metadataJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderTransaction" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "paymentAttemptId" TEXT NOT NULL,
    "provider" "PaymentProviderType" NOT NULL,
    "providerTransactionId" TEXT NOT NULL,
    "statusRaw" TEXT NOT NULL,
    "feeMinor" INTEGER NOT NULL DEFAULT 0,
    "netMinor" INTEGER NOT NULL,
    "rawPayloadJson" TEXT NOT NULL DEFAULT '{}',
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settlement" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" "PaymentProviderType" NOT NULL,
    "reference" TEXT NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'XOF',
    "totalAmountMinor" INTEGER NOT NULL,
    "settledAmountMinor" INTEGER NOT NULL DEFAULT 0,
    "feeAmountMinor" INTEGER NOT NULL DEFAULT 0,
    "status" "SettlementStatus" NOT NULL DEFAULT 'PENDING',
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReconciliationRecord" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" "PaymentProviderType" NOT NULL,
    "providerTransactionId" TEXT,
    "paymentId" TEXT,
    "settlementId" TEXT,
    "status" "PaymentReconciliationStatus" NOT NULL DEFAULT 'MATCHED',
    "discrepancyType" TEXT,
    "detailsJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "ReconciliationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "provider" "PaymentProviderType" NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payloadJson" TEXT NOT NULL,
    "headersJson" TEXT NOT NULL DEFAULT '{}',
    "signatureVerified" BOOLEAN NOT NULL DEFAULT false,
    "status" "WebhookEventStatus" NOT NULL DEFAULT 'RECEIVED',
    "processedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentProviderConfig_organizationId_id_key" ON "PaymentProviderConfig"("organizationId", "id");
CREATE UNIQUE INDEX "PaymentProviderConfig_organizationId_provider_key" ON "PaymentProviderConfig"("organizationId", "provider");
CREATE INDEX "PaymentProviderConfig_organizationId_isEnabled_idx" ON "PaymentProviderConfig"("organizationId", "isEnabled");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentIntent_organizationId_id_key" ON "PaymentIntent"("organizationId", "id");
CREATE UNIQUE INDEX "PaymentIntent_organizationId_reference_key" ON "PaymentIntent"("organizationId", "reference");
CREATE INDEX "PaymentIntent_organizationId_status_idx" ON "PaymentIntent"("organizationId", "status");
CREATE INDEX "PaymentIntent_organizationId_saleId_idx" ON "PaymentIntent"("organizationId", "saleId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAttempt_organizationId_id_key" ON "PaymentAttempt"("organizationId", "id");
CREATE UNIQUE INDEX "PaymentAttempt_organizationId_idempotencyKey_key" ON "PaymentAttempt"("organizationId", "idempotencyKey");
CREATE INDEX "PaymentAttempt_organizationId_paymentIntentId_idx" ON "PaymentAttempt"("organizationId", "paymentIntentId");
CREATE INDEX "PaymentAttempt_organizationId_provider_status_idx" ON "PaymentAttempt"("organizationId", "provider", "status");
CREATE INDEX "PaymentAttempt_providerReference_idx" ON "PaymentAttempt"("providerReference");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderTransaction_organizationId_id_key" ON "ProviderTransaction"("organizationId", "id");
CREATE UNIQUE INDEX "ProviderTransaction_organizationId_provider_providerTransactionId_key" ON "ProviderTransaction"("organizationId", "provider", "providerTransactionId");
CREATE INDEX "ProviderTransaction_organizationId_paymentAttemptId_idx" ON "ProviderTransaction"("organizationId", "paymentAttemptId");

-- CreateIndex
CREATE UNIQUE INDEX "Settlement_organizationId_id_key" ON "Settlement"("organizationId", "id");
CREATE UNIQUE INDEX "Settlement_organizationId_reference_key" ON "Settlement"("organizationId", "reference");
CREATE INDEX "Settlement_organizationId_provider_status_idx" ON "Settlement"("organizationId", "provider", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ReconciliationRecord_organizationId_id_key" ON "ReconciliationRecord"("organizationId", "id");
CREATE INDEX "ReconciliationRecord_organizationId_status_idx" ON "ReconciliationRecord"("organizationId", "status");
CREATE INDEX "ReconciliationRecord_organizationId_provider_idx" ON "ReconciliationRecord"("organizationId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_provider_eventId_key" ON "WebhookEvent"("provider", "eventId");
CREATE INDEX "WebhookEvent_organizationId_status_idx" ON "WebhookEvent"("organizationId", "status");
CREATE INDEX "WebhookEvent_status_createdAt_idx" ON "WebhookEvent"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "PaymentProviderConfig" ADD CONSTRAINT "PaymentProviderConfig_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentIntent" ADD CONSTRAINT "PaymentIntent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentIntent" ADD CONSTRAINT "PaymentIntent_organizationId_saleId_fkey" FOREIGN KEY ("organizationId", "saleId") REFERENCES "Sale"("organizationId", "id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaymentIntent" ADD CONSTRAINT "PaymentIntent_organizationId_customerId_fkey" FOREIGN KEY ("organizationId", "customerId") REFERENCES "Customer"("organizationId", "id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_organizationId_paymentIntentId_fkey" FOREIGN KEY ("organizationId", "paymentIntentId") REFERENCES "PaymentIntent"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderTransaction" ADD CONSTRAINT "ProviderTransaction_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProviderTransaction" ADD CONSTRAINT "ProviderTransaction_organizationId_paymentAttemptId_fkey" FOREIGN KEY ("organizationId", "paymentAttemptId") REFERENCES "PaymentAttempt"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationRecord" ADD CONSTRAINT "ReconciliationRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReconciliationRecord" ADD CONSTRAINT "ReconciliationRecord_organizationId_providerTransactionId_fkey" FOREIGN KEY ("organizationId", "providerTransactionId") REFERENCES "ProviderTransaction"("organizationId", "id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReconciliationRecord" ADD CONSTRAINT "ReconciliationRecord_organizationId_paymentId_fkey" FOREIGN KEY ("organizationId", "paymentId") REFERENCES "Payment"("organizationId", "id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReconciliationRecord" ADD CONSTRAINT "ReconciliationRecord_organizationId_settlementId_fkey" FOREIGN KEY ("organizationId", "settlementId") REFERENCES "Settlement"("organizationId", "id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEvent" ADD CONSTRAINT "WebhookEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
