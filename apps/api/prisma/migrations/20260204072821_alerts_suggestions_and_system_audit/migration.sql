-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('OPEN', 'ACK', 'CLOSED');

-- CreateEnum
CREATE TYPE "SuggestionStatus" AS ENUM ('OPEN', 'USED', 'IGNORED');

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_actorUserId_fkey";

-- AlterTable
ALTER TABLE "audit_logs" ALTER COLUMN "actorUserId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "inventory_alerts" (
    "id" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "AlertStatus" NOT NULL DEFAULT 'OPEN',
    "reason" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "snapshot" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_suggestions" (
    "id" TEXT NOT NULL,
    "status" "SuggestionStatus" NOT NULL DEFAULT 'OPEN',
    "itemId" TEXT NOT NULL,
    "supplierId" TEXT,
    "suggestedQty" INTEGER NOT NULL,
    "unitCost" DOUBLE PRECISION NOT NULL,
    "estimatedTotal" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "snapshot" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inventory_alerts_organizationId_idx" ON "inventory_alerts"("organizationId");

-- CreateIndex
CREATE INDEX "inventory_alerts_organizationId_status_idx" ON "inventory_alerts"("organizationId", "status");

-- CreateIndex
CREATE INDEX "inventory_alerts_organizationId_createdAt_idx" ON "inventory_alerts"("organizationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_alerts_organizationId_itemId_status_key" ON "inventory_alerts"("organizationId", "itemId", "status");

-- CreateIndex
CREATE INDEX "purchase_suggestions_organizationId_idx" ON "purchase_suggestions"("organizationId");

-- CreateIndex
CREATE INDEX "purchase_suggestions_organizationId_status_idx" ON "purchase_suggestions"("organizationId", "status");

-- CreateIndex
CREATE INDEX "purchase_suggestions_organizationId_createdAt_idx" ON "purchase_suggestions"("organizationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_suggestions_organizationId_itemId_status_key" ON "purchase_suggestions"("organizationId", "itemId", "status");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_alerts" ADD CONSTRAINT "inventory_alerts_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_alerts" ADD CONSTRAINT "inventory_alerts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_suggestions" ADD CONSTRAINT "purchase_suggestions_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_suggestions" ADD CONSTRAINT "purchase_suggestions_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_suggestions" ADD CONSTRAINT "purchase_suggestions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
