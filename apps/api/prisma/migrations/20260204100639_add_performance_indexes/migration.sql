-- Performance indexes para queries comuns e paginação

-- Items: busca por sku/descrição + ordenação por createdAt + status (crítico)
CREATE INDEX IF NOT EXISTS "idx_items_org_created" ON "items"("organizationId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_items_org_sku" ON "items"("organizationId", "sku");
CREATE INDEX IF NOT EXISTS "idx_items_org_saldo" ON "items"("organizationId", "saldo");

-- Suppliers: busca por nome/email + ordenação
CREATE INDEX IF NOT EXISTS "idx_suppliers_org_nome" ON "suppliers"("organizationId", "nome");
CREATE INDEX IF NOT EXISTS "idx_suppliers_org_created" ON "suppliers"("organizationId", "createdAt" DESC);

-- PurchaseOrders: filtro por status + busca por codigo + ordenação
CREATE INDEX IF NOT EXISTS "idx_purchase_orders_org_status" ON "purchase_orders"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "idx_purchase_orders_org_created" ON "purchase_orders"("organizationId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_purchase_orders_org_codigo" ON "purchase_orders"("organizationId", "codigo");

-- AuditLog: filtros por entity, action, actorUserId + ordenação
CREATE INDEX IF NOT EXISTS "idx_audit_logs_org_created" ON "audit_logs"("organizationId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_audit_logs_org_entity" ON "audit_logs"("organizationId", "entity");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_org_action" ON "audit_logs"("organizationId", "action");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_org_actor" ON "audit_logs"("organizationId", "actorUserId");

-- KanbanCards: busca por boardId + status + posição
CREATE INDEX IF NOT EXISTS "idx_kanban_cards_board_status_pos" ON "kanban_cards"("boardId", "status", "posicao");

-- InventoryAlerts e PurchaseSuggestions: busca por status + item
CREATE INDEX IF NOT EXISTS "idx_inventory_alerts_org_status" ON "inventory_alerts"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "idx_purchase_suggestions_org_status" ON "purchase_suggestions"("organizationId", "status");

-- OPCIONAL: Full-text search (se precisar de busca textual mais rápida)
-- Requer extensão pg_trgm: CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- CREATE INDEX IF NOT EXISTS "idx_items_sku_trgm" ON "items" USING gin("sku" gin_trgm_ops);
-- CREATE INDEX IF NOT EXISTS "idx_items_descricao_trgm" ON "items" USING gin("descricao" gin_trgm_ops);
