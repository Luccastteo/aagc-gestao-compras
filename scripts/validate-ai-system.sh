#!/bin/bash

# =========================================
# AAGC AI SYSTEM - VALIDATION SCRIPT
# =========================================
# Script para validar todos os componentes do sistema de IA

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🔍 VALIDAÇÃO DO SISTEMA DE IA${NC}"
echo -e "${BLUE}========================================${NC}"

ERRORS=0

# 1. Verificar containers
echo -e "\n${YELLOW}[1/8] Verificando containers Docker...${NC}"
if docker ps | grep -q aagc-postgres; then
    echo -e "${GREEN}✓ PostgreSQL rodando${NC}"
else
    echo -e "${RED}✗ PostgreSQL não está rodando${NC}"
    ((ERRORS++))
fi

if docker ps | grep -q aagc-redis; then
    echo -e "${GREEN}✓ Redis rodando${NC}"
else
    echo -e "${RED}✗ Redis não está rodando${NC}"
    ((ERRORS++))
fi

if docker ps | grep -q aagc-ml-service; then
    echo -e "${GREEN}✓ ML Service rodando${NC}"
else
    echo -e "${RED}✗ ML Service não está rodando${NC}"
    ((ERRORS++))
fi

# 2. Verificar pgvector
echo -e "\n${YELLOW}[2/8] Verificando extensão pgvector...${NC}"
if docker exec aagc-postgres psql -U aagc -d aagc_db -c "SELECT * FROM pg_extension WHERE extname='vector';" 2>/dev/null | grep -q vector; then
    echo -e "${GREEN}✓ pgvector instalado${NC}"
else
    echo -e "${RED}✗ pgvector não está instalado${NC}"
    ((ERRORS++))
fi

# 3. Verificar tabelas AI no banco
echo -e "\n${YELLOW}[3/8] Verificando tabelas AI...${NC}"
AI_TABLES=("consumption_history" "supplier_performance" "price_history" "ml_predictions" "decision_logs" "knowledge_documents" "purchase_policies")
for table in "${AI_TABLES[@]}"; do
    if docker exec aagc-postgres psql -U aagc -d aagc_db -c "\dt $table" 2>/dev/null | grep -q "$table"; then
        echo -e "${GREEN}✓ Tabela $table existe${NC}"
    else
        echo -e "${RED}✗ Tabela $table não encontrada${NC}"
        ((ERRORS++))
    fi
done

# 4. Testar ML Service (Health Check)
echo -e "\n${YELLOW}[4/8] Testando ML Service...${NC}"
ML_HEALTH=$(curl -s http://localhost:8001/health 2>/dev/null || echo "error")
if echo "$ML_HEALTH" | grep -q "ok"; then
    echo -e "${GREEN}✓ ML Service respondendo${NC}"
else
    echo -e "${RED}✗ ML Service não está respondendo${NC}"
    ((ERRORS++))
fi

# 5. Testar endpoint de forecast
echo -e "\n${YELLOW}[5/8] Testando ML endpoint /forecast...${NC}"
FORECAST_TEST=$(curl -s -X POST http://localhost:8001/forecast \
    -H "Content-Type: application/json" \
    -d '{"item_id":"test-item","history":[1,2,3,4,5,6,7],"horizon":7}' 2>/dev/null || echo "error")
if echo "$FORECAST_TEST" | grep -q "forecast"; then
    echo -e "${GREEN}✓ Endpoint /forecast OK${NC}"
else
    echo -e "${RED}✗ Endpoint /forecast falhou${NC}"
    ((ERRORS++))
fi

# 6. Verificar API NestJS (se estiver rodando)
echo -e "\n${YELLOW}[6/8] Verificando API NestJS...${NC}"
if curl -s http://localhost:3001/health >/dev/null 2>&1; then
    echo -e "${GREEN}✓ API NestJS rodando${NC}"
    
    # Testar endpoint de AI (sem autenticação - deve retornar 401)
    AI_ENDPOINT=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/ai/chat 2>/dev/null)
    if [ "$AI_ENDPOINT" == "401" ]; then
        echo -e "${GREEN}✓ Endpoint /ai/chat protegido corretamente${NC}"
    else
        echo -e "${YELLOW}⚠ Endpoint /ai/chat retornou código $AI_ENDPOINT${NC}"
    fi
else
    echo -e "${YELLOW}⚠ API NestJS não está rodando (execute 'pnpm dev')${NC}"
fi

# 7. Verificar Worker (se estiver rodando)
echo -e "\n${YELLOW}[7/8] Verificando Worker BullMQ...${NC}"
if pgrep -f "apps/worker" >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Worker rodando${NC}"
else
    echo -e "${YELLOW}⚠ Worker não está rodando (execute 'pnpm dev')${NC}"
fi

# 8. Verificar filas no Redis
echo -e "\n${YELLOW}[8/8] Verificando filas BullMQ no Redis...${NC}"
REDIS_KEYS=$(docker exec aagc-redis redis-cli KEYS "bull:*" 2>/dev/null | wc -l)
if [ "$REDIS_KEYS" -gt 0 ]; then
    echo -e "${GREEN}✓ Filas BullMQ encontradas ($REDIS_KEYS chaves)${NC}"
else
    echo -e "${YELLOW}⚠ Nenhuma fila BullMQ encontrada (aguardando worker)${NC}"
fi

# Resultado final
echo -e "\n${BLUE}========================================${NC}"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ SISTEMA VALIDADO COM SUCESSO!${NC}"
    echo -e "${GREEN}Todos os componentes de IA estão funcionando.${NC}"
else
    echo -e "${RED}❌ VALIDAÇÃO FALHOU${NC}"
    echo -e "${RED}Encontrados $ERRORS erro(s).${NC}"
    exit 1
fi
echo -e "${BLUE}========================================${NC}"

# Informações adicionais
echo -e "\n${YELLOW}📊 Informações do Sistema:${NC}"
echo -e "  - PostgreSQL (pgvector): ${GREEN}localhost:5432${NC}"
echo -e "  - Redis: ${GREEN}localhost:6379${NC}"
echo -e "  - ML Service: ${GREEN}http://localhost:8001${NC}"
echo -e "  - API NestJS: ${GREEN}http://localhost:3001${NC}"
echo -e "  - Web Next.js: ${GREEN}http://localhost:3000${NC}"

echo -e "\n${YELLOW}🧪 Comandos úteis para testes:${NC}"
echo -e "  # Testar ML forecast:"
echo -e "  ${BLUE}curl -X POST http://localhost:8001/forecast -H 'Content-Type: application/json' -d '{\"item_id\":\"test\",\"history\":[1,2,3,4,5,6,7],\"horizon\":7}'${NC}"
echo -e ""
echo -e "  # Testar ML urgency score:"
echo -e "  ${BLUE}curl -X POST http://localhost:8001/urgency-score -H 'Content-Type: application/json' -d '{\"current_stock\":5,\"min_stock\":10,\"avg_consumption\":2,\"lead_time_days\":7}'${NC}"
echo -e ""
echo -e "  # Ver logs do ML Service:"
echo -e "  ${BLUE}docker logs aagc-ml-service -f${NC}"
echo -e ""
echo -e "  # Acessar PostgreSQL:"
echo -e "  ${BLUE}docker exec -it aagc-postgres psql -U aagc -d aagc_db${NC}"
echo -e ""
