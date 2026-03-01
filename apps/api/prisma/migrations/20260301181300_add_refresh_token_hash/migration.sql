-- AlterTable
ALTER TABLE "users" ADD COLUMN     "refreshTokenHash" TEXT;

-- CreateIndex
CREATE INDEX "purchase_order_items_itemId_idx" ON "purchase_order_items"("itemId");
