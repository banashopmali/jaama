-- CreateEnum
CREATE TYPE "ImportBatchStatus" AS ENUM ('PREVIEWED', 'COMPLETED', 'EXPIRED');

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "normalizedPayloadJson" TEXT NOT NULL,
    "validationErrorsJson" TEXT NOT NULL DEFAULT '[]',
    "status" "ImportBatchStatus" NOT NULL DEFAULT 'PREVIEWED',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImportBatch_organizationId_entityType_idx" ON "ImportBatch"("organizationId", "entityType");

-- CreateIndex
CREATE UNIQUE INDEX "ImportBatch_organizationId_id_key" ON "ImportBatch"("organizationId", "id");

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
