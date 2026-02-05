-- DropIndex
DROP INDEX "idx_audit_logs_org_created";

-- DropIndex
DROP INDEX "idx_items_org_created";

-- DropIndex
DROP INDEX "idx_items_org_sku";

-- DropIndex
DROP INDEX "idx_kanban_cards_board_status_pos";

-- DropIndex
DROP INDEX "idx_purchase_orders_org_codigo";

-- DropIndex
DROP INDEX "idx_purchase_orders_org_created";

-- DropIndex
DROP INDEX "idx_suppliers_org_created";

-- DropIndex
DROP INDEX "idx_suppliers_org_nome";

-- CreateTable
CREATE TABLE "consumption_history" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quantity" DOUBLE PRECISION NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "quarter" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "weekOfYear" INTEGER NOT NULL,
    "isHoliday" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consumption_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_performance" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "avgLeadTimeDays" DOUBLE PRECISION NOT NULL,
    "onTimeDeliveryRate" DOUBLE PRECISION NOT NULL,
    "qualityScore" DOUBLE PRECISION NOT NULL,
    "priceCompetitiveness" DOUBLE PRECISION NOT NULL,
    "communicationScore" DOUBLE PRECISION NOT NULL,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "completedOrders" INTEGER NOT NULL DEFAULT 0,
    "lateOrders" INTEGER NOT NULL DEFAULT 0,
    "canceledOrders" INTEGER NOT NULL DEFAULT 0,
    "avgPriceVariation" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastEvaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataFrom" TIMESTAMP(3) NOT NULL,
    "dataTo" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_performance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_history" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "supplierId" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "quantity" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL,
    "referenceId" TEXT,
    "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ml_predictions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "predictionType" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "forecastHorizon" INTEGER NOT NULL,
    "predictedValue" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "lowerBound" DOUBLE PRECISION,
    "upperBound" DOUBLE PRECISION,
    "features" JSONB NOT NULL,
    "parameters" JSONB NOT NULL,
    "actualValue" DOUBLE PRECISION,
    "error" DOUBLE PRECISION,
    "forecastDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ml_predictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decision_logs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "decisionType" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "inputData" JSONB NOT NULL,
    "reasoning" JSONB NOT NULL,
    "llmExplanation" TEXT,
    "decision" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "wasCorrect" BOOLEAN,
    "feedback" TEXT,
    "correctedBy" TEXT,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "evaluatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "decision_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_documents" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "category" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "language" TEXT NOT NULL DEFAULT 'pt-BR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "restrictedTo" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "knowledge_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_policies" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "autoApproveThreshold" DOUBLE PRECISION NOT NULL DEFAULT 5000,
    "requiresQuotesAbove" DOUBLE PRECISION NOT NULL DEFAULT 1000,
    "minQuotesRequired" INTEGER NOT NULL DEFAULT 3,
    "preferredSupplierIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "blockedSupplierIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "maxAcceptableLeadTimeDays" INTEGER NOT NULL DEFAULT 30,
    "urgentThresholdDays" INTEGER NOT NULL DEFAULT 7,
    "priceVariationTolerance" DOUBLE PRECISION NOT NULL DEFAULT 0.15,
    "safetyStockMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.5,
    "reorderPointDays" INTEGER NOT NULL DEFAULT 14,
    "enableAutoApproval" BOOLEAN NOT NULL DEFAULT false,
    "enableAutoPurchase" BOOLEAN NOT NULL DEFAULT false,
    "allowEmergencyOverride" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_policies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "consumption_history_organizationId_itemId_date_idx" ON "consumption_history"("organizationId", "itemId", "date");

-- CreateIndex
CREATE INDEX "consumption_history_organizationId_date_idx" ON "consumption_history"("organizationId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "consumption_history_organizationId_itemId_date_key" ON "consumption_history"("organizationId", "itemId", "date");

-- CreateIndex
CREATE INDEX "supplier_performance_organizationId_supplierId_idx" ON "supplier_performance"("organizationId", "supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_performance_organizationId_supplierId_key" ON "supplier_performance"("organizationId", "supplierId");

-- CreateIndex
CREATE INDEX "price_history_organizationId_itemId_effectiveDate_idx" ON "price_history"("organizationId", "itemId", "effectiveDate");

-- CreateIndex
CREATE INDEX "price_history_organizationId_supplierId_effectiveDate_idx" ON "price_history"("organizationId", "supplierId", "effectiveDate");

-- CreateIndex
CREATE INDEX "ml_predictions_organizationId_itemId_predictionType_forecas_idx" ON "ml_predictions"("organizationId", "itemId", "predictionType", "forecastDate");

-- CreateIndex
CREATE INDEX "ml_predictions_organizationId_createdAt_idx" ON "ml_predictions"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "decision_logs_organizationId_decisionType_decidedAt_idx" ON "decision_logs"("organizationId", "decisionType", "decidedAt");

-- CreateIndex
CREATE INDEX "decision_logs_organizationId_entityId_idx" ON "decision_logs"("organizationId", "entityId");

-- CreateIndex
CREATE INDEX "knowledge_documents_organizationId_type_isActive_idx" ON "knowledge_documents"("organizationId", "type", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_policies_organizationId_key" ON "purchase_policies"("organizationId");

-- AddForeignKey
ALTER TABLE "consumption_history" ADD CONSTRAINT "consumption_history_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumption_history" ADD CONSTRAINT "consumption_history_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_performance" ADD CONSTRAINT "supplier_performance_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_performance" ADD CONSTRAINT "supplier_performance_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ml_predictions" ADD CONSTRAINT "ml_predictions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ml_predictions" ADD CONSTRAINT "ml_predictions_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_logs" ADD CONSTRAINT "decision_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_documents" ADD CONSTRAINT "knowledge_documents_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_policies" ADD CONSTRAINT "purchase_policies_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
