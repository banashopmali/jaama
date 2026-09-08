-- AlterTable "PaymentProviderConfig"
ALTER TABLE "PaymentProviderConfig" ADD COLUMN "webhookEndpointKey" TEXT NOT NULL DEFAULT gen_random_uuid()::text;

-- CreateIndex
CREATE UNIQUE INDEX "PaymentProviderConfig_webhookEndpointKey_key" ON "PaymentProviderConfig"("webhookEndpointKey");
CREATE INDEX "PaymentProviderConfig_provider_webhookEndpointKey_idx" ON "PaymentProviderConfig"("provider", "webhookEndpointKey");

-- AlterTable "PaymentAttempt"
ALTER TABLE "PaymentAttempt" ADD COLUMN "requestHash" TEXT;
ALTER TABLE "PaymentAttempt" ADD COLUMN "paymentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAttempt_paymentId_key" ON "PaymentAttempt"("paymentId");
CREATE UNIQUE INDEX "PaymentAttempt_organizationId_paymentId_key" ON "PaymentAttempt"("organizationId", "paymentId");

-- AddForeignKey
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_organizationId_paymentId_fkey" FOREIGN KEY ("organizationId", "paymentId") REFERENCES "Payment"("organizationId", "id") ON DELETE SET NULL ON UPDATE CASCADE;
