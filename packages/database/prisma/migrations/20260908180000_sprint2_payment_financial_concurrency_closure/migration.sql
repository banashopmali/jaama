-- AlterTable "Payment"
ALTER TABLE "Payment" ADD COLUMN "sourcePaymentAttemptId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Payment_organizationId_sourcePaymentAttemptId_key" ON "Payment"("organizationId", "sourcePaymentAttemptId");

-- AlterTable "ReconciliationRecord"
ALTER TABLE "ReconciliationRecord" ALTER COLUMN "status" DROP DEFAULT;

-- AlterTable "WebhookEvent"
ALTER TABLE "WebhookEvent" ADD COLUMN "payloadHash" TEXT NOT NULL DEFAULT '';
ALTER TABLE "WebhookEvent" ALTER COLUMN "organizationId" SET NOT NULL;

-- DropIndex
DROP INDEX IF EXISTS "WebhookEvent_provider_eventId_key";

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_organizationId_provider_eventId_key" ON "WebhookEvent"("organizationId", "provider", "eventId");
