-- Auto PO migration: Add fields for automatic purchase order generation

-- CreateEnum
CREATE TYPE "POSource" AS ENUM ('MANUAL', 'AUTO_REPLENISH');

-- AlterTable: Add source and auto-PO fields to purchase_orders
ALTER TABLE "purchase_orders" ADD COLUMN "source" "POSource" NOT NULL DEFAULT 'MANUAL';
ALTER TABLE "purchase_orders" ADD COLUMN "dedupeKey" TEXT;
ALTER TABLE "purchase_orders" ADD COLUMN "windowStart" TIMESTAMP(3);
ALTER TABLE "purchase_orders" ADD COLUMN "needsQuote" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "purchase_orders" ADD COLUMN "lastAutoUpdateAt" TIMESTAMP(3);

-- AlterTable: Add isDefault to suppliers
ALTER TABLE "suppliers" ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Add needsQuote to purchase_order_items
ALTER TABLE "purchase_order_items" ADD COLUMN "needsQuote" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Add externalRef to kanban_cards
ALTER TABLE "kanban_cards" ADD COLUMN "externalRef" TEXT;

-- CreateIndex: Unique constraint for dedupeKey per org
CREATE UNIQUE INDEX "purchase_orders_organizationId_dedupeKey_key" ON "purchase_orders"("organizationId", "dedupeKey");

-- CreateIndex: Index for auto-PO queries
CREATE INDEX "purchase_orders_organizationId_status_source_createdAt_idx" ON "purchase_orders"("organizationId", "status", "source", "createdAt");

-- CreateIndex: Index for supplier + status queries
CREATE INDEX "purchase_orders_organizationId_supplierId_status_idx" ON "purchase_orders"("organizationId", "supplierId", "status");

-- CreateIndex: Unique constraint for itemId per PO (prevents duplicate items)
CREATE UNIQUE INDEX "purchase_order_items_purchaseOrderId_itemId_key" ON "purchase_order_items"("purchaseOrderId", "itemId");

-- CreateIndex: Index for default supplier lookup
CREATE INDEX "suppliers_organizationId_isDefault_idx" ON "suppliers"("organizationId", "isDefault");

-- CreateIndex: Unique constraint for externalRef per org
CREATE UNIQUE INDEX "kanban_cards_organizationId_externalRef_key" ON "kanban_cards"("organizationId", "externalRef");

-- CreateIndex: Index for action-based audit log queries
CREATE INDEX "audit_logs_organizationId_action_idx" ON "audit_logs"("organizationId", "action");

-- CreateIndex: Index for entityId audit log queries
CREATE INDEX "audit_logs_organizationId_entityId_idx" ON "audit_logs"("organizationId", "entityId");
