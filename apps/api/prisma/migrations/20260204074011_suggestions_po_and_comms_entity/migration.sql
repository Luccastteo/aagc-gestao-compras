-- AlterTable
ALTER TABLE "comms_logs" ADD COLUMN     "entity" TEXT,
ADD COLUMN     "entityId" TEXT;

-- AlterTable
ALTER TABLE "purchase_suggestions" ADD COLUMN     "purchaseOrderId" TEXT;

-- CreateIndex
CREATE INDEX "comms_logs_organizationId_entity_entityId_idx" ON "comms_logs"("organizationId", "entity", "entityId");

-- CreateIndex
CREATE INDEX "purchase_suggestions_organizationId_purchaseOrderId_idx" ON "purchase_suggestions"("organizationId", "purchaseOrderId");

-- AddForeignKey
ALTER TABLE "purchase_suggestions" ADD CONSTRAINT "purchase_suggestions_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
