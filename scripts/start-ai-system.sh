#!/bin/bash

# =========================================
# AAGC AI SYSTEM - STARTUP SCRIPT
# =========================================
# Script para iniciar o sistema completo de IA

set -e

echo "🚀 Iniciando AAGC AI System..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Verificar dependências
echo -e "\n${YELLOW}[1/7] Verificando dependências...${NC}"
command -v docker >/dev/null 2>&1 || { echo -e "${RED}Docker não instalado${NC}"; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo -e "${RED}Docker Compose não instalado${NC}"; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo -e "${RED}pnpm não instalado${NC}"; exit 1; }
echo -e "${GREEN}✓ Dependências OK${NC}"

# Step 2: Configurar variáveis de ambiente
echo -e "\n${YELLOW}[2/7] Configurando variáveis de ambiente...${NC}"
if [ ! -f "apps/api/.env" ]; then
    cp apps/api/.env.example apps/api/.env
    echo -e "${YELLOW}⚠ Criado apps/api/.env - Configure OPENAI_API_KEY!${NC}"
fi
if [ ! -f "apps/worker/.env" ]; then
    cp apps/worker/.env.example apps/worker/.env
    echo -e "${YELLOW}⚠ Criado apps/worker/.env - Configure OPENAI_API_KEY!${NC}"
fi
if [ ! -f "apps/web/.env.local" ]; then
    cp apps/web/.env.example apps/web/.env.local
fi
echo -e "${GREEN}✓ Variáveis de ambiente configuradas${NC}"

# Step 3: Instalar dependências
echo -e "\n${YELLOW}[3/7] Instalando dependências...${NC}"
pnpm install
echo -e "${GREEN}✓ Dependências instaladas${NC}"

# Step 4: Iniciar containers Docker
echo -e "\n${YELLOW}[4/7] Iniciando containers (PostgreSQL + pgvector, Redis, ML Service)...${NC}"
docker-compose up -d
sleep 5

# Verificar se os containers estão rodando
if ! docker ps | grep -q aagc-postgres; then
    echo -e "${RED}✗ PostgreSQL não iniciou${NC}"
    exit 1
fi
if ! docker ps | grep -q aagc-redis; then
    echo -e "${RED}✗ Redis não iniciou${NC}"
    exit 1
fi
if ! docker ps | grep -q aagc-ml-service; then
    echo -e "${RED}✗ ML Service não iniciou${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Containers rodando${NC}"

# Step 5: Habilitar pgvector
echo -e "\n${YELLOW}[5/7] Habilitando pgvector...${NC}"
docker exec aagc-postgres psql -U aagc -d aagc_db -c "CREATE EXTENSION IF NOT EXISTS vector;" 2>/dev/null || true
echo -e "${GREEN}✓ pgvector habilitado${NC}"

# Step 6: Executar migrations
echo -e "\n${YELLOW}[6/7] Executando migrations...${NC}"
pnpm -C apps/api db:migrate
echo -e "${GREEN}✓ Migrations aplicadas${NC}"

# Step 7: Iniciar aplicações
echo -e "\n${YELLOW}[7/7] Iniciando aplicações...${NC}"
echo -e "${GREEN}Para iniciar o sistema completo, execute:${NC}"
echo -e "  ${YELLOW}pnpm dev${NC}"
echo ""
echo -e "${GREEN}Ou inicie cada serviço separadamente:${NC}"
echo -e "  ${YELLOW}pnpm -C apps/api dev${NC}     # API (porta 3001)"
echo -e "  ${YELLOW}pnpm -C apps/web dev${NC}     # Web (porta 3000)"
echo -e "  ${YELLOW}pnpm -C apps/worker dev${NC}  # Worker (BullMQ)"
echo ""
echo -e "${GREEN}✓ Sistema pronto para iniciar!${NC}"

# Exibir status dos containers
echo -e "\n${YELLOW}Status dos containers:${NC}"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}🎉 AAGC AI System configurado com sucesso!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Próximos passos:${NC}"
echo -e "1. Configure OPENAI_API_KEY em apps/api/.env"
echo -e "2. Execute: ${GREEN}pnpm dev${NC}"
echo -e "3. Acesse: ${GREEN}http://localhost:3000/app/ai${NC}"
echo ""
